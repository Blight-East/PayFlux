package config

import (
	"encoding/json"
	"fmt"
	"os"
	"sync"
	"time"
)

// AuditEntry represents a single audit log entry
type AuditEntry struct {
	Timestamp time.Time              `json:"timestamp"`
	Operator  string                 `json:"operator"`
	SignalID  string                 `json:"signal_id"`
	Action    string                 `json:"action"` // "set", "delete", "expire"
	OldValue  *SignalOverride        `json:"old_value,omitempty"`
	NewValue  *SignalOverride        `json:"new_value,omitempty"`
	Metadata  map[string]interface{} `json:"metadata,omitempty"`
}

// AuditLogger handles audit log writes
type AuditLogger struct {
	file *os.File
	mu   sync.Mutex
}

var globalAuditLogger *AuditLogger

// InitAuditLogger initializes the audit logger
func InitAuditLogger(logPath string) error {
	file, err := os.OpenFile(logPath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return fmt.Errorf("failed to open audit log: %w", err)
	}

	globalAuditLogger = &AuditLogger{
		file: file,
	}

	return nil
}

// CloseAuditLogger closes the audit logger
func CloseAuditLogger() error {
	if globalAuditLogger != nil && globalAuditLogger.file != nil {
		return globalAuditLogger.file.Close()
	}
	return nil
}

// LogOverrideChange logs an override change to the audit log
func LogOverrideChange(operator, signalID, action string, oldValue, newValue *SignalOverride, metadata map[string]interface{}) {
	if globalAuditLogger == nil {
		return // Audit logging not initialized
	}

	entry := AuditEntry{
		Timestamp: time.Now(),
		Operator:  operator,
		SignalID:  signalID,
		Action:    action,
		OldValue:  oldValue,
		NewValue:  newValue,
		Metadata:  metadata,
	}

	globalAuditLogger.mu.Lock()
	defer globalAuditLogger.mu.Unlock()

	// Write as JSON line
	data, err := json.Marshal(entry)
	if err != nil {
		// Log error but don't fail the operation
		fmt.Fprintf(os.Stderr, "audit_log_marshal_error: %v\n", err)
		return
	}

	if _, err := globalAuditLogger.file.Write(append(data, '\n')); err != nil {
		fmt.Fprintf(os.Stderr, "audit_log_write_error: %v\n", err)
	}
}

// SetOverrideWithAudit sets an override and logs the change
func (s *OverrideStore) SetOverrideWithAudit(id string, override SignalOverride, operator string) {
	// Get old value for audit
	oldValue, hasOld := s.GetOverride(id)
	var oldPtr *SignalOverride
	if hasOld {
		oldPtr = &oldValue
	}

	// Set override
	s.SetOverride(id, override)

	// Log change
	LogOverrideChange(operator, id, "set", oldPtr, &override, nil)
}

// DeleteOverrideWithAudit deletes an override and logs the change
func (s *OverrideStore) DeleteOverrideWithAudit(id string, operator string) {
	// Get old value for audit
	oldValue, hasOld := s.GetOverride(id)
	var oldPtr *SignalOverride
	if hasOld {
		oldPtr = &oldValue
	}

	// Delete override
	s.DeleteOverride(id)

	// Log change
	if hasOld {
		LogOverrideChange(operator, id, "delete", oldPtr, nil, nil)
	}
}

// ExpireOverrides removes expired overrides and logs them
func (s *OverrideStore) ExpireOverrides() int {
	now := time.Now().Unix()
	expired := 0

	overrides := s.ListOverrides()
	for id, override := range overrides {
		if override.ExpiresAt != nil && *override.ExpiresAt <= now {
			// Log expiration
			LogOverrideChange("system", id, "expire", &override, nil, map[string]interface{}{
				"expired_at": now,
			})

			// Delete override
			s.DeleteOverride(id)
			expired++
		}
	}

	return expired
}
