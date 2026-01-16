package logsafe

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"testing"
)

// TestNoPayloadLogging is a CI guard test that scans the repository
// for dangerous logging patterns that could leak sensitive payment data.
// This test FAILS if risky patterns are detected, preventing PCI/PII leaks.
func TestNoPayloadLogging(t *testing.T) {
	repoRoot := filepath.Join("..", "..")

	// Dangerous patterns that indicate potential payload logging
	dangerousPatterns := []*regexp.Regexp{
		// Headers that should never be logged
		regexp.MustCompile(`(?i)Stripe-Signature`),
		regexp.MustCompile(`(?i)Authorization:`),

		// Common payload dump patterns
		regexp.MustCompile(`Printf\s*\([^)]*%\+v[^)]*payload`),
		regexp.MustCompile(`Printf\s*\([^)]*payload[^)]*%\+v`),
		regexp.MustCompile(`Printf\s*\([^)]*%s[^)]*\bbody\b`),
		regexp.MustCompile(`Printf\s*\([^)]*\bbody\b[^)]*%s`),
		regexp.MustCompile(`Println\s*\([^)]*\bbody\b`),
		regexp.MustCompile(`Println\s*\([^)]*payload`),
		regexp.MustCompile(`spew\.Dump`),
		regexp.MustCompile(`fmt\.Printf\s*\([^)]*string\s*\(\s*body\s*\)`),

		// Explicit payload logging comments/strings
		regexp.MustCompile(`(?i)log.*raw.*payload`),
		regexp.MustCompile(`(?i)payload.*dump`),
	}

	// Files/directories to exclude from scanning
	excludeDirs := map[string]bool{
		".git":         true,
		".next":        true,
		"node_modules": true,
		"vendor":       true,
		"examples":     true, // Examples may have different logging for demo purposes
		"logsafe":      true, // This package defines sensitive patterns, exclude from scan
	}

	excludeFiles := map[string]bool{
		"go.sum": true,
		"go.mod": true,
	}

	var violations []string

	err := filepath.Walk(repoRoot, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// Skip excluded directories
		if info.IsDir() {
			if excludeDirs[info.Name()] {
				return filepath.SkipDir
			}
			return nil
		}

		// Only scan Go files
		if !strings.HasSuffix(path, ".go") {
			return nil
		}

		// Skip excluded files
		if excludeFiles[filepath.Base(path)] {
			return nil
		}

		// Skip this test file itself
		if strings.HasSuffix(path, "nopayloadlogs_test.go") {
			return nil
		}

		// Read file content
		content, err := os.ReadFile(path)
		if err != nil {
			return err
		}

		fileContent := string(content)
		lines := strings.Split(fileContent, "\n")

		// Check each line against dangerous patterns
		for lineNum, line := range lines {
			for _, pattern := range dangerousPatterns {
				if pattern.MatchString(line) {
					// Check if this is in a comment (allow documentation/examples in comments)
					trimmed := strings.TrimSpace(line)
					if strings.HasPrefix(trimmed, "//") {
						continue
					}

					relPath, _ := filepath.Rel(repoRoot, path)
					violation := formatViolation(relPath, lineNum+1, line, pattern.String())
					violations = append(violations, violation)
				}
			}
		}

		return nil
	})

	if err != nil {
		t.Fatalf("Error walking repository: %v", err)
	}

	// Report all violations
	if len(violations) > 0 {
		t.Errorf("Found %d dangerous logging pattern(s) that could leak sensitive payment data:\n\n%s\n\n"+
			"❌ SECURITY: These patterns risk PCI/PII leakage.\n"+
			"✅ FIX: Use structured logging with allowlisted fields only (id, type, status).\n"+
			"See internal/logsafe package for safe logging helpers.",
			len(violations),
			strings.Join(violations, "\n"))
	}
}

func formatViolation(file string, lineNum int, line string, pattern string) string {
	return strings.Join([]string{
		"",
		strings.Repeat("─", 80),
		fmt.Sprintf("📍 %s:%d", file, lineNum),
		"🔍 Pattern: " + pattern,
		"📝 " + strings.TrimSpace(line),
	}, "\n")
}
