package logsafe

import (
	"encoding/json"
	"strings"
)

// Sensitive field names that should never be logged
var sensitiveKeys = map[string]bool{
	// Customer PII
	"email":           true,
	"name":            true,
	"phone":           true,
	"address":         true,
	"billing_details": true,
	"shipping":        true,
	"customer":        true,
	"ip":              true,
	"ip_address":      true,

	// Payment method details
	"payment_method":         true,
	"payment_method_details": true,
	"card":                   true,
	"bank":                   true,
	"bank_account":           true,
	"cvv":                    true,
	"cvc":                    true,
	"pan":                    true,
	"card_number":            true,
	"account_number":         true,
	"routing_number":         true,

	// Auth & signatures
	"stripe-signature": true,
	"authorization":    true,
	"api_key":          true,
	"secret":           true,
	"token":            true,
	"webhook_secret":   true,
	"signing_secret":   true,

	// Metadata blobs (can contain anything)
	"metadata":     true,
	"raw_metadata": true,

	// Raw bodies/payloads
	"body":    true,
	"payload": true,
}

// Safe fields allowed for logging (allowlist)
var safeKeys = map[string]bool{
	"id":                 true,
	"event_id":           true,
	"type":               true,
	"event_type":         true,
	"created":            true,
	"timestamp":          true,
	"event_timestamp":    true,
	"provider":           true,
	"processor":          true,
	"status":             true,
	"http_status":        true,
	"request_id":         true,
	"trace_id":           true,
	"signature_verified": true,
	"amount":             true, // Safe if it's just a number
	"currency":           true,
	"object":             true, // Stripe object type
	"livemode":           true,
}

// RedactJSON attempts to parse JSON and redact sensitive fields.
// Returns redacted JSON bytes, or original bytes if parsing fails.
func RedactJSON(raw []byte) []byte {
	var m map[string]any
	if err := json.Unmarshal(raw, &m); err != nil {
		// If not valid JSON, return a safe placeholder
		return []byte(`{"error":"unparseable_payload_redacted"}`)
	}

	redacted := RedactMap(m)
	result, err := json.Marshal(redacted)
	if err != nil {
		return []byte(`{"error":"redaction_failed"}`)
	}
	return result
}

// RedactMap recursively removes sensitive fields from a map.
// Returns a new map with only safe fields.
func RedactMap(m map[string]any) map[string]any {
	result := make(map[string]any)

	for key, value := range m {
		lowerKey := strings.ToLower(key)

		// Skip sensitive keys entirely
		if sensitiveKeys[lowerKey] {
			continue
		}

		// Recursively handle nested maps
		if nested, ok := value.(map[string]any); ok {
			result[key] = RedactMap(nested)
			continue
		}

		// Recursively handle arrays
		if arr, ok := value.([]any); ok {
			redactedArr := make([]any, 0, len(arr))
			for _, item := range arr {
				if nestedMap, ok := item.(map[string]any); ok {
					redactedArr = append(redactedArr, RedactMap(nestedMap))
				} else {
					// For non-map items, keep them (primitives)
					redactedArr = append(redactedArr, item)
				}
			}
			result[key] = redactedArr
			continue
		}

		// Keep the field
		result[key] = value
	}

	return result
}

// SafeFieldsFromWebhook extracts only allowlisted fields from a webhook payload.
// This is the most defensive approach - only log what's explicitly safe.
func SafeFieldsFromWebhook(payload map[string]any) map[string]any {
	result := make(map[string]any)

	for key, value := range payload {
		lowerKey := strings.ToLower(key)

		// Only include explicitly safe keys
		if safeKeys[lowerKey] {
			// Even for safe keys, avoid logging complex nested structures
			switch v := value.(type) {
			case string, int, int64, float64, bool, nil:
				result[key] = v
			case map[string]any:
				// Don't recurse - just note that a nested object exists
				result[key] = "[nested_object_redacted]"
			case []any:
				result[key] = "[array_redacted]"
			default:
				result[key] = "[complex_value_redacted]"
			}
		}
	}

	return result
}
