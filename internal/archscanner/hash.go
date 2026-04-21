package archscanner

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"os"
	"path/filepath"
)

func VerifyPrimitiveHashes(primitives []Primitive, rootDir string) []error {
	var errs []error

	for _, p := range primitives {
		if p.Hash == "" {
			continue
		}
		if p.File == "" {
			// If hash exists but file checks are skipped?
			// Prompt says "IF primitive.File == "" SKIP"
			continue
		}

		targetPath := filepath.Join(rootDir, p.File)

		f, err := os.Open(targetPath)
		if err != nil {
			errs = append(errs, fmt.Errorf("primitive %q: failed to open source file %q: %v", p.Name, targetPath, err))
			continue
		}

		h := sha256.New()
		if _, err := io.Copy(h, f); err != nil {
			f.Close()
			errs = append(errs, fmt.Errorf("primitive %q: failed to hash file %q: %v", p.Name, targetPath, err))
			continue
		}
		f.Close()

		actualHash := hex.EncodeToString(h.Sum(nil))
		if actualHash != p.Hash {
			errs = append(errs, fmt.Errorf("primitive %q: hash mismatch (expected %s, got %s)", p.Name, p.Hash, actualHash))
		}
	}

	return errs
}
