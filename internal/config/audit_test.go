package config

import (
	"encoding/json"
	"os"
	"testing"
	"time"
)

func TestReasonCodeValidation(t *testing.T) {
	store := NewOverrideStore()

	// Valid reason codes
	validCodes := []string{
		"incident_mitigation",
		"enterprise_override",
		"experiment",
		"debugging",
		"compliance_exception",
	}

	for _, code := range validCodes {
		enabled := false
		reasonCode := code
		override := SignalOverride{
			Enabled:    &enabled,
			ReasonCode: &reasonCode,
		}
		store.SetOverride("test_signal", override)

		retrieved, ok := store.GetOverride("test_signal")
		if !ok {
			t.Errorf("Failed to retrieve override with reason_code=%s", code)
		}
		if retrieved.ReasonCode == nil || *retrieved.ReasonCode != code {
			t.Errorf("Expected reason_code=%s, got %v", code, retrieved.ReasonCode)
		}
	}
}

func TestReasonCodeInAuditLog(t *testing.T) {
	// Create temp audit log file
	tmpFile, err := os.CreateTemp("", "audit_test_*.log")
	if err != nil {
		t.Fatalf("Failed to create temp file: %v", err)
	}
	defer os.Remove(tmpFile.Name())
	tmpFile.Close()

	// Initialize audit logger
	if err := InitAuditLogger(tmpFile.Name()); err != nil {
		t.Fatalf("Failed to init audit logger: %v", err)
	}
	defer CloseAuditLogger()

	// Create override store
	store := NewOverrideStore()

	// Set override with reason code
	enabled := false
	reasonCode := "incident_mitigation"
	override := SignalOverride{
		Enabled:    &enabled,
		ReasonCode: &reasonCode,
	}
	store.SetOverrideWithAudit("test_signal", override, "test_operator")

	// Read audit log
	data, err := os.ReadFile(tmpFile.Name())
	if err != nil {
		t.Fatalf("Failed to read audit log: %v", err)
	}

	// Parse audit entry
	var entry AuditEntry
	if err := json.Unmarshal(data, &entry); err != nil {
		t.Fatalf("Failed to parse audit entry: %v", err)
	}

	// Verify reason code in audit log
	if entry.NewValue == nil {
		t.Fatal("Expected new_value to be set")
	}
	if entry.NewValue.ReasonCode == nil {
		t.Error("Expected reason_code to be set in audit log")
	}
	if *entry.NewValue.ReasonCode != "incident_mitigation" {
		t.Errorf("Expected reason_code=incident_mitigation, got %s", *entry.NewValue.ReasonCode)
	}
}

func TestAuditLogging(t *testing.T) {
	// Create temp audit log file
	tmpFile, err := os.CreateTemp("", "audit_test_*.log")
	if err != nil {
		t.Fatalf("Failed to create temp file: %v", err)
	}
	defer os.Remove(tmpFile.Name())
	tmpFile.Close()

	// Initialize audit logger
	if err := InitAuditLogger(tmpFile.Name()); err != nil {
		t.Fatalf("Failed to init audit logger: %v", err)
	}
	defer CloseAuditLogger()

	// Create override store
	store := NewOverrideStore()

	// Set override with audit
	enabled := false
	override := SignalOverride{
		Enabled: &enabled,
	}
	store.SetOverrideWithAudit("test_signal", override, "test_operator")

	// Read audit log
	data, err := os.ReadFile(tmpFile.Name())
	if err != nil {
		t.Fatalf("Failed to read audit log: %v", err)
	}

	// Parse audit entry
	var entry AuditEntry
	if err := json.Unmarshal(data, &entry); err != nil {
		t.Fatalf("Failed to parse audit entry: %v", err)
	}

	// Verify audit entry
	if entry.Operator != "test_operator" {
		t.Errorf("Expected operator=test_operator, got %s", entry.Operator)
	}
	if entry.SignalID != "test_signal" {
		t.Errorf("Expected signal_id=test_signal, got %s", entry.SignalID)
	}
	if entry.Action != "set" {
		t.Errorf("Expected action=set, got %s", entry.Action)
	}
	if entry.NewValue == nil {
		t.Error("Expected new_value to be set")
	}
}

func TestTTLExpiration(t *testing.T) {
	store := NewOverrideStore()

	// Set override with expiry in the past
	enabled := false
	pastTime := time.Now().Unix() - 100
	override := SignalOverride{
		Enabled:   &enabled,
		ExpiresAt: &pastTime,
	}
	store.SetOverride("expired_signal", override)

	// Set override with expiry in the future
	futureTime := time.Now().Unix() + 3600
	override2 := SignalOverride{
		Enabled:   &enabled,
		ExpiresAt: &futureTime,
	}
	store.SetOverride("active_signal", override2)

	// Run expiration
	expired := store.ExpireOverrides()

	// Verify expired count
	if expired != 1 {
		t.Errorf("Expected 1 expired override, got %d", expired)
	}

	// Verify expired signal is gone
	_, exists := store.GetOverride("expired_signal")
	if exists {
		t.Error("Expected expired_signal to be deleted")
	}

	// Verify active signal still exists
	_, exists = store.GetOverride("active_signal")
	if !exists {
		t.Error("Expected active_signal to still exist")
	}
}

func TestDeleteAuditLogging(t *testing.T) {
	// Create temp audit log file
	tmpFile, err := os.CreateTemp("", "audit_test_*.log")
	if err != nil {
		t.Fatalf("Failed to create temp file: %v", err)
	}
	defer os.Remove(tmpFile.Name())
	tmpFile.Close()

	// Initialize audit logger
	if err := InitAuditLogger(tmpFile.Name()); err != nil {
		t.Fatalf("Failed to init audit logger: %v", err)
	}
	defer CloseAuditLogger()

	// Create override store
	store := NewOverrideStore()

	// Set override
	enabled := false
	override := SignalOverride{
		Enabled: &enabled,
	}
	store.SetOverride("test_signal", override)

	// Delete with audit
	store.DeleteOverrideWithAudit("test_signal", "test_operator")

	// Read audit log
	data, err := os.ReadFile(tmpFile.Name())
	if err != nil {
		t.Fatalf("Failed to read audit log: %v", err)
	}

	// Parse audit entry (should be the delete entry)
	var entry AuditEntry
	if err := json.Unmarshal(data, &entry); err != nil {
		t.Fatalf("Failed to parse audit entry: %v", err)
	}

	// Verify audit entry
	if entry.Action != "delete" {
		t.Errorf("Expected action=delete, got %s", entry.Action)
	}
	if entry.OldValue == nil {
		t.Error("Expected old_value to be set")
	}
	if entry.NewValue != nil {
		t.Error("Expected new_value to be nil for delete")
	}
}

func TestExpirationAuditLogging(t *testing.T) {
	// Create temp audit log file
	tmpFile, err := os.CreateTemp("", "audit_test_*.log")
	if err != nil {
		t.Fatalf("Failed to create temp file: %v", err)
	}
	defer os.Remove(tmpFile.Name())
	tmpFile.Close()

	// Initialize audit logger
	if err := InitAuditLogger(tmpFile.Name()); err != nil {
		t.Fatalf("Failed to init audit logger: %v", err)
	}
	defer CloseAuditLogger()

	// Create override store
	store := NewOverrideStore()

	// Set override with expiry in the past
	enabled := false
	pastTime := time.Now().Unix() - 100
	override := SignalOverride{
		Enabled:   &enabled,
		ExpiresAt: &pastTime,
	}
	store.SetOverride("expired_signal", override)

	// Run expiration
	store.ExpireOverrides()

	// Read audit log
	data, err := os.ReadFile(tmpFile.Name())
	if err != nil {
		t.Fatalf("Failed to read audit log: %v", err)
	}

	// Parse audit entry
	var entry AuditEntry
	if err := json.Unmarshal(data, &entry); err != nil {
		t.Fatalf("Failed to parse audit entry: %v", err)
	}

	// Verify audit entry
	if entry.Action != "expire" {
		t.Errorf("Expected action=expire, got %s", entry.Action)
	}
	if entry.Operator != "system" {
		t.Errorf("Expected operator=system, got %s", entry.Operator)
	}
}
