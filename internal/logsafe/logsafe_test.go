package logsafe

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestRedactJSON(t *testing.T) {
	// Sample Stripe webhook payload with sensitive data
	stripePayload := `{
		"id": "evt_1234567890",
		"type": "payment_intent.succeeded",
		"created": 1678901234,
		"data": {
			"object": {
				"id": "pi_test123",
				"amount": 5000,
				"currency": "usd",
				"customer": "cus_sensitive123",
				"payment_method": "pm_card_visa",
				"payment_method_details": {
					"card": {
						"brand": "visa",
						"last4": "4242",
						"exp_month": 12,
						"exp_year": 2025
					}
				},
				"billing_details": {
					"email": "customer@example.com",
					"name": "John Doe",
					"phone": "+15555551234",
					"address": {
						"line1": "123 Main St",
						"city": "San Francisco",
						"state": "CA",
						"postal_code": "94102",
						"country": "US"
					}
				},
				"metadata": {
					"internal_id": "secret_value_123",
					"customer_notes": "sensitive info"
				}
			}
		}
	}`

	redacted := RedactJSON([]byte(stripePayload))

	redactedStr := string(redacted)

	// Verify sensitive fields are NOT present
	sensitiveFields := []string{
		"customer@example.com",
		"John Doe",
		"+15555551234",
		"123 Main St",
		"payment_method",
		"pm_card_visa",
		"billing_details",
		"metadata",
		"secret_value_123",
		"customer_notes",
	}

	for _, field := range sensitiveFields {
		if strings.Contains(redactedStr, field) {
			t.Errorf("Redacted output contains sensitive field: %s", field)
		}
	}

	// Verify safe fields ARE present
	safeFields := []string{
		"evt_1234567890",
		"payment_intent.succeeded",
		"pi_test123",
	}

	for _, field := range safeFields {
		if !strings.Contains(redactedStr, field) {
			t.Errorf("Redacted output missing safe field: %s", field)
		}
	}
}

func TestRedactMap(t *testing.T) {
	payload := map[string]any{
		"id":    "evt_123",
		"type":  "payment.succeeded",
		"email": "secret@example.com",
		"card": map[string]any{
			"number": "4242424242424242",
			"cvv":    "123",
		},
		"amount":   5000,
		"currency": "usd",
		"billing_details": map[string]any{
			"name":  "Customer Name",
			"email": "customer@test.com",
		},
		"metadata": map[string]any{
			"internal": "secret",
		},
	}

	redacted := RedactMap(payload)

	// Should have safe fields
	if redacted["id"] != "evt_123" {
		t.Error("Expected id to be preserved")
	}
	if redacted["type"] != "payment.succeeded" {
		t.Error("Expected type to be preserved")
	}
	if redacted["amount"] != 5000 {
		t.Error("Expected amount to be preserved")
	}

	// Should NOT have sensitive fields
	if _, exists := redacted["email"]; exists {
		t.Error("email should be redacted")
	}
	if _, exists := redacted["card"]; exists {
		t.Error("card should be redacted")
	}
	if _, exists := redacted["billing_details"]; exists {
		t.Error("billing_details should be redacted")
	}
	if _, exists := redacted["metadata"]; exists {
		t.Error("metadata should be redacted")
	}
}

func TestSafeFieldsFromWebhook(t *testing.T) {
	webhook := map[string]any{
		"id":                 "evt_123",
		"type":               "charge.succeeded",
		"created":            1678901234,
		"provider":           "stripe",
		"status":             "succeeded",
		"amount":             5000,
		"currency":           "usd",
		"signature_verified": true,
		// Sensitive fields that should be excluded
		"email":            "test@example.com",
		"payment_method":   "pm_card_123",
		"billing_details":  map[string]any{"name": "John Doe"},
		"card":             map[string]any{"last4": "4242"},
		"customer":         "cus_123",
		"ip":               "192.168.1.1",
		"Stripe-Signature": "t=123,v1=abc",
		"Authorization":    "Bearer secret",
		"metadata":         map[string]any{"internal": "data"},
	}

	safe := SafeFieldsFromWebhook(webhook)

	// Verify allowlisted fields are present
	expectedSafe := []string{"id", "type", "created", "provider", "status", "amount", "currency", "signature_verified"}
	for _, key := range expectedSafe {
		if _, exists := safe[key]; !exists {
			t.Errorf("Expected safe field %s to be present", key)
		}
	}

	// Verify sensitive fields are NOT present
	blockedFields := []string{
		"email", "payment_method", "billing_details", "card",
		"customer", "ip", "Stripe-Signature", "Authorization", "metadata",
	}
	for _, key := range blockedFields {
		if _, exists := safe[key]; exists {
			t.Errorf("Sensitive field %s should not be present", key)
		}
	}
}

func TestRedactJSONInvalidInput(t *testing.T) {
	// Test with invalid JSON
	invalid := []byte(`{this is not valid json`)
	redacted := RedactJSON(invalid)

	var result map[string]any
	if err := json.Unmarshal(redacted, &result); err != nil {
		t.Fatalf("Redacted output should be valid JSON: %v", err)
	}

	if result["error"] != "unparseable_payload_redacted" {
		t.Error("Expected error placeholder for invalid JSON")
	}
}

func TestRedactMapWithNestedStructures(t *testing.T) {
	payload := map[string]any{
		"id": "test_123",
		"nested": map[string]any{
			"level1": map[string]any{
				"level2": map[string]any{
					"email": "deeply-nested@example.com",
					"id":    "preserved",
				},
			},
		},
		"array_of_objects": []any{
			map[string]any{
				"id":    "item1",
				"email": "item1@example.com",
			},
			map[string]any{
				"id":   "item2",
				"name": "Sensitive Name",
			},
		},
	}

	redacted := RedactMap(payload)

	// Check that nested email is removed
	nested := redacted["nested"].(map[string]any)
	level1 := nested["level1"].(map[string]any)
	level2 := level1["level2"].(map[string]any)

	if _, exists := level2["email"]; exists {
		t.Error("Deeply nested email should be redacted")
	}
	if level2["id"] != "preserved" {
		t.Error("Deeply nested safe field should be preserved")
	}

	// Check array redaction
	arr := redacted["array_of_objects"].([]any)
	if len(arr) != 2 {
		t.Error("Array length should be preserved")
	}

	item1 := arr[0].(map[string]any)
	if _, exists := item1["email"]; exists {
		t.Error("Email in array item should be redacted")
	}
	if item1["id"] != "item1" {
		t.Error("Safe field in array item should be preserved")
	}
}

func TestCaseInsensitiveSensitiveKeys(t *testing.T) {
	// Test that keys are matched case-insensitively
	payload := map[string]any{
		"Email":            "test@example.com",
		"STRIPE-SIGNATURE": "secret",
		"Card":             map[string]any{"number": "4242"},
		"BiLLiNg_DeTaiLs":  map[string]any{"name": "Test"},
	}

	redacted := RedactMap(payload)

	// All variations should be redacted
	if _, exists := redacted["Email"]; exists {
		t.Error("Email (capitalized) should be redacted")
	}
	if _, exists := redacted["STRIPE-SIGNATURE"]; exists {
		t.Error("STRIPE-SIGNATURE (uppercase) should be redacted")
	}
	if _, exists := redacted["Card"]; exists {
		t.Error("Card (capitalized) should be redacted")
	}
	if _, exists := redacted["BiLLiNg_DeTaiLs"]; exists {
		t.Error("BiLLiNg_DeTaiLs (mixed case) should be redacted")
	}
}
