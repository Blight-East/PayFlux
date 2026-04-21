package admin

import (
	"crypto/subtle"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"payment-node/internal/config"
)

const (
	internalAuthHeader = "X-Internal-Auth"
	contentTypeJSON    = "application/json"
)

// Allowed reason codes for override justification
var allowedReasonCodes = map[string]bool{
	"incident_mitigation":  true,
	"enterprise_override":  true,
	"experiment":           true,
	"debugging":            true,
	"compliance_exception": true,
}

// Allowed severity values
var allowedSeverities = map[string]bool{
	"info":     true,
	"warning":  true,
	"critical": true,
	"low":      true,
	"elevated": true,
	"high":     true,
}

// SignalOverrideRequest represents a PATCH request to update signal overrides
type SignalOverrideRequest struct {
	Enabled    *bool    `json:"enabled,omitempty"`
	Severity   *string  `json:"severity,omitempty"`
	Threshold  *float64 `json:"threshold,omitempty"`
	ExpiresAt  *int64   `json:"expires_at,omitempty"`  // Unix timestamp
	ReasonCode *string  `json:"reason_code,omitempty"` // Categorical justification
	Operator   string   `json:"operator,omitempty"`    // For audit logging
}

// SignalResponse represents the response for signal queries
type SignalResponse struct {
	SignalID        string                 `json:"signal_id"`
	EffectiveConfig config.SignalConfig    `json:"effective_config"`
	OverrideActive  bool                   `json:"override_active"`
	Override        *config.SignalOverride `json:"override,omitempty"`
}

// ErrorResponse represents an error response
type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message"`
}

// validateInternalAuth checks the internal auth header
// Returns true if valid, false otherwise
func validateInternalAuth(r *http.Request) bool {
	expectedToken := os.Getenv("PAYFLUX_INTERNAL_AUTH_TOKEN")
	if expectedToken == "" {
		// If no token configured, reject all requests
		return false
	}

	providedToken := r.Header.Get(internalAuthHeader)
	if providedToken == "" {
		return false
	}

	// Constant-time comparison to prevent timing attacks
	return subtle.ConstantTimeCompare([]byte(providedToken), []byte(expectedToken)) == 1
}

// writeJSON writes a JSON response
func writeJSON(w http.ResponseWriter, statusCode int, data interface{}) {
	w.Header().Set("Content-Type", contentTypeJSON)
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(data)
}

// writeError writes an error response
func writeError(w http.ResponseWriter, statusCode int, errorType, message string) {
	writeJSON(w, statusCode, ErrorResponse{
		Error:   errorType,
		Message: message,
	})
}

// ListSignalsHandler returns a handler for GET /internal/signals
func ListSignalsHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Validate auth
		if !validateInternalAuth(r) {
			writeError(w, http.StatusUnauthorized, "unauthorized", "Invalid or missing internal auth token")
			return
		}

		// Only allow GET
		if r.Method != http.MethodGet {
			writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET is allowed")
			return
		}

		// Get all signals from runtime config
		allSignals := config.GetAllSignals()

		// Build response with effective configs
		responses := make([]SignalResponse, 0, len(allSignals))
		for id := range allSignals {
			// Get effective config (with overrides and tier enforcement applied)
			effectiveCfg := config.GetEffectiveSignalConfig(id)

			resp := SignalResponse{
				SignalID:        id,
				EffectiveConfig: effectiveCfg,
				OverrideActive:  config.HasSignalOverride(id),
			}

			if override, hasOverride := config.GetSignalOverride(id); hasOverride {
				resp.Override = &override
			}

			responses = append(responses, resp)
		}

		writeJSON(w, http.StatusOK, responses)
	}
}

// SignalHandler returns a handler for /internal/signals/:id
func SignalHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Validate auth
		if !validateInternalAuth(r) {
			writeError(w, http.StatusUnauthorized, "unauthorized", "Invalid or missing internal auth token")
			return
		}

		// Extract signal ID from path
		path := strings.TrimPrefix(r.URL.Path, "/internal/signals/")
		signalID := strings.TrimSpace(path)

		if signalID == "" {
			writeError(w, http.StatusBadRequest, "bad_request", "Signal ID is required")
			return
		}

		switch r.Method {
		case http.MethodGet:
			handleGetSignal(w, signalID)
		case http.MethodPatch:
			handlePatchSignal(w, r, signalID)
		case http.MethodDelete:
			handleDeleteSignal(w, signalID)
		default:
			writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET, PATCH, DELETE are allowed")
		}
	}
}

// handleGetSignal handles GET /internal/signals/:id
func handleGetSignal(w http.ResponseWriter, signalID string) {
	// Check if signal exists in runtime config
	_, exists := config.GetSignalConfig(signalID)
	if !exists {
		writeError(w, http.StatusNotFound, "not_found", fmt.Sprintf("Signal %s not found", signalID))
		return
	}

	// Get effective config (with overrides applied)
	effectiveCfg := config.GetEffectiveSignalConfig(signalID)

	resp := SignalResponse{
		SignalID:        signalID,
		EffectiveConfig: effectiveCfg,
		OverrideActive:  config.HasSignalOverride(signalID),
	}

	if override, hasOverride := config.GetSignalOverride(signalID); hasOverride {
		resp.Override = &override
	}

	writeJSON(w, http.StatusOK, resp)
}

// handlePatchSignal handles PATCH /internal/signals/:id
func handlePatchSignal(w http.ResponseWriter, r *http.Request, signalID string) {
	// Check if signal exists
	_, ok := config.GetSignalConfig(signalID)
	if !ok {
		writeError(w, http.StatusNotFound, "not_found", fmt.Sprintf("Signal %s not found", signalID))
		return
	}

	// Parse request body
	var req SignalOverrideRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "Invalid JSON body")
		return
	}

	// Validate severity if provided
	if req.Severity != nil {
		if !allowedSeverities[*req.Severity] {
			writeError(w, http.StatusBadRequest, "bad_request", fmt.Sprintf("Invalid severity: %s", *req.Severity))
			return
		}
	}

	// Validate threshold if provided
	if req.Threshold != nil {
		if *req.Threshold < 0 || *req.Threshold > 1 {
			writeError(w, http.StatusBadRequest, "bad_request", "Threshold must be between 0 and 1")
			return
		}
	}

	// Validate ExpiresAt if provided
	if req.ExpiresAt != nil {
		if *req.ExpiresAt <= time.Now().Unix() {
			writeError(w, http.StatusBadRequest, "bad_request", "ExpiresAt must be in the future")
			return
		}
	}

	// Validate ReasonCode if provided
	if req.ReasonCode != nil {
		if !allowedReasonCodes[*req.ReasonCode] {
			writeError(w, http.StatusBadRequest, "bad_request",
				fmt.Sprintf("Invalid reason_code: %s. Allowed: incident_mitigation, enterprise_override, experiment, debugging, compliance_exception", *req.ReasonCode))
			return
		}
	}

	// Get override store
	store := config.GetGlobalOverrideStore()
	if store == nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "Override store not initialized")
		return
	}

	// Create override
	override := config.SignalOverride{
		Enabled:    req.Enabled,
		Severity:   req.Severity,
		Threshold:  req.Threshold,
		ExpiresAt:  req.ExpiresAt,
		ReasonCode: req.ReasonCode,
		UpdatedAt:  time.Now().Unix(),
	}

	// Determine operator (from request or default)
	operator := req.Operator
	if operator == "" {
		operator = "api_user"
	}

	// Set override with audit logging
	store.SetOverrideWithAudit(signalID, override, operator)

	// Return updated effective config
	handleGetSignal(w, signalID)
}

// handleDeleteSignal handles DELETE /internal/signals/:id
func handleDeleteSignal(w http.ResponseWriter, signalID string) {
	// Check if signal exists
	_, ok := config.GetSignalConfig(signalID)
	if !ok {
		writeError(w, http.StatusNotFound, "not_found", fmt.Sprintf("Signal %s not found", signalID))
		return
	}

	// Get override store
	store := config.GetGlobalOverrideStore()
	if store == nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "Override store not initialized")
		return
	}

	// Delete override with audit logging
	store.DeleteOverrideWithAudit(signalID, "api_user")

	// Return updated effective config (without override)
	handleGetSignal(w, signalID)
}
