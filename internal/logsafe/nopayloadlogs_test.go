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
		// HTTP dump utilities (leak full request/response with headers + body)
		regexp.MustCompile(`httputil\.DumpRequest`),
		regexp.MustCompile(`httputil\.DumpRequestOut`),
		regexp.MustCompile(`httputil\.DumpResponse`),

		// Spew debug dumps (leak entire data structures)
		regexp.MustCompile(`spew\.Dump\s*\(`),
		regexp.MustCompile(`spew\.Sdump\s*\(`),
		regexp.MustCompile(`spew\.Printf`),
		regexp.MustCompile(`spew\.Sprintf`),

		// Headers that should never be logged
		regexp.MustCompile(`log.*Stripe-Signature`),
		regexp.MustCompile(`Printf.*Stripe-Signature`),
		regexp.MustCompile(`log.*Authorization\s*:`),
		regexp.MustCompile(`Printf.*Authorization\s*:`),

		// Body/payload printing with format verbs that dump content
		// Match: Printf("%s", body), Printf("%+v", payload), etc.
		regexp.MustCompile(`Printf\s*\([^)]*%[+#]?[vsq][^)]*\b(body|payload|request|response)\b`),
		regexp.MustCompile(`Printf\s*\([^)]*\b(body|payload|request|response)\b[^)]*%[+#]?[vsq]`),
		regexp.MustCompile(`Sprintf\s*\([^)]*%[+#]?[vsq][^)]*\b(body|payload|request|response)\b`),
		regexp.MustCompile(`Sprintf\s*\([^)]*\b(body|payload|request|response)\b[^)]*%[+#]?[vsq]`),

		// Println with body/payload (dumps entire content)
		regexp.MustCompile(`Println\s*\([^)]*\b(body|payload|rawBody|requestBody|responseBody)\b`),
		regexp.MustCompile(`Print\s*\(\s*(body|payload|rawBody|requestBody|responseBody)\s*\)`),

		// String conversion of body/payload (converts bytes to string for logging)
		regexp.MustCompile(`string\s*\(\s*(body|payload|rawBody|requestBody|responseBody)\s*\)`),

		// Header dumps
		regexp.MustCompile(`Printf.*%[+#]?v.*[Hh]eader`),
		regexp.MustCompile(`Printf.*[Hh]eader.*%[+#]?v`),
		regexp.MustCompile(`Println.*[Hh]eader`),

		// Explicit dangerous logging phrases
		regexp.MustCompile(`(?i)log.*raw.*payload`),
		regexp.MustCompile(`(?i)log.*raw.*body`),
		regexp.MustCompile(`(?i)payload.*dump`),
		regexp.MustCompile(`(?i)body.*dump`),
	}

	// Directories to exclude from scanning (non-runtime code)
	excludeDirs := map[string]bool{
		".git":         true,
		".next":        true,
		"node_modules": true,
		"vendor":       true,
		"examples":     true, // Example code for demos
		"scripts":      true, // Shell scripts, not runtime Go
		"docs":         true, // Documentation
		"logsafe":      true, // This package itself (defines test patterns)
	}

	// File patterns to exclude
	excludeFilePatterns := []string{
		"_test.go", // Exclude all test files (they may have test fixtures)
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

		// Only scan Go source files (not .md, .json, etc.)
		if !strings.HasSuffix(path, ".go") {
			return nil
		}

		// Skip test files (they contain test fixtures)
		for _, pattern := range excludeFilePatterns {
			if strings.HasSuffix(path, pattern) {
				return nil
			}
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
