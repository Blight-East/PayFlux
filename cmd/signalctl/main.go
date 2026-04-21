package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
)

const (
	defaultBaseURL = "http://localhost:8080"
	authHeader     = "X-Internal-Auth"
)

func main() {
	if len(os.Args) < 2 {
		printUsage()
		os.Exit(1)
	}

	command := os.Args[1]

	switch command {
	case "list":
		listSignals()
	case "enable":
		if len(os.Args) < 3 {
			fmt.Println("Error: signal ID required")
			fmt.Println("Usage: signalctl enable <signal_id>")
			os.Exit(1)
		}
		enableSignal(os.Args[2])
	case "disable":
		if len(os.Args) < 3 {
			fmt.Println("Error: signal ID required")
			fmt.Println("Usage: signalctl disable <signal_id>")
			os.Exit(1)
		}
		disableSignal(os.Args[2])
	case "set-threshold":
		if len(os.Args) < 4 {
			fmt.Println("Error: signal ID and threshold value required")
			fmt.Println("Usage: signalctl set-threshold <signal_id> <value>")
			os.Exit(1)
		}
		setThreshold(os.Args[2], os.Args[3])
	case "clear":
		if len(os.Args) < 3 {
			fmt.Println("Error: signal ID required")
			fmt.Println("Usage: signalctl clear <signal_id>")
			os.Exit(1)
		}
		clearOverride(os.Args[2])
	case "help", "-h", "--help":
		printUsage()
	default:
		fmt.Printf("Unknown command: %s\n\n", command)
		printUsage()
		os.Exit(1)
	}
}

func printUsage() {
	fmt.Println("signalctl - PayFlux Signal Control CLI")
	fmt.Println()
	fmt.Println("Usage:")
	fmt.Println("  signalctl list                           List all signals")
	fmt.Println("  signalctl enable <signal_id>             Enable a signal")
	fmt.Println("  signalctl disable <signal_id>            Disable a signal")
	fmt.Println("  signalctl set-threshold <id> <value>     Set signal threshold (0-1)")
	fmt.Println("  signalctl clear <signal_id>              Clear signal override")
	fmt.Println()
	fmt.Println("Environment Variables:")
	fmt.Println("  PAYFLUX_INTERNAL_AUTH_TOKEN  Internal auth token (required)")
	fmt.Println("  PAYFLUX_BASE_URL             Base URL (default: http://localhost:8080)")
}

func getBaseURL() string {
	if url := os.Getenv("PAYFLUX_BASE_URL"); url != "" {
		return strings.TrimSuffix(url, "/")
	}
	return defaultBaseURL
}

func getAuthToken() string {
	token := os.Getenv("PAYFLUX_INTERNAL_AUTH_TOKEN")
	if token == "" {
		fmt.Println("Error: PAYFLUX_INTERNAL_AUTH_TOKEN environment variable not set")
		os.Exit(1)
	}
	return token
}

func makeRequest(method, path string, body io.Reader) ([]byte, error) {
	url := getBaseURL() + path
	token := getAuthToken()

	req, err := http.NewRequest(method, url, body)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set(authHeader, token)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("request failed with status %d: %s", resp.StatusCode, string(respBody))
	}

	return respBody, nil
}

func listSignals() {
	respBody, err := makeRequest("GET", "/internal/signals", nil)
	if err != nil {
		fmt.Printf("Error: %v\n", err)
		os.Exit(1)
	}

	var signals []map[string]interface{}
	if err := json.Unmarshal(respBody, &signals); err != nil {
		fmt.Printf("Error parsing output: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("Found %d signals:\n\n", len(signals))
	for _, sig := range signals {
		signalID := sig["signal_id"].(string)
		effectiveCfg := sig["effective_config"].(map[string]interface{})
		overrideActive := sig["override_active"].(bool)

		enabled := effectiveCfg["enabled"].(bool)
		sigType := effectiveCfg["type"].(string)

		status := "enabled"
		if !enabled {
			status = "disabled"
		}

		overrideMarker := ""
		if overrideActive {
			overrideMarker = " [OVERRIDE]"
		}

		fmt.Printf("  %s (%s) - %s%s\n", signalID, sigType, status, overrideMarker)
	}
}

func enableSignal(signalID string) {
	updateSignal(signalID, map[string]interface{}{
		"enabled": true,
	})
	fmt.Printf("Signal %s enabled\n", signalID)
}

func disableSignal(signalID string) {
	updateSignal(signalID, map[string]interface{}{
		"enabled": false,
	})
	fmt.Printf("Signal %s disabled\n", signalID)
}

func setThreshold(signalID, valueStr string) {
	var value float64
	if _, err := fmt.Sscanf(valueStr, "%f", &value); err != nil {
		fmt.Printf("Error: invalid threshold value: %s\n", valueStr)
		os.Exit(1)
	}

	if value < 0 || value > 1 {
		fmt.Println("Error: threshold must be between 0 and 1")
		os.Exit(1)
	}

	updateSignal(signalID, map[string]interface{}{
		"threshold": value,
	})
	fmt.Printf("Signal %s threshold set to %.2f\n", signalID, value)
}

func updateSignal(signalID string, update map[string]interface{}) {
	body, err := json.Marshal(update)
	if err != nil {
		fmt.Printf("Error: %v\n", err)
		os.Exit(1)
	}

	path := fmt.Sprintf("/internal/signals/%s", signalID)
	respBody, err := makeRequest("PATCH", path, bytes.NewReader(body))
	if err != nil {
		fmt.Printf("Error: %v\n", err)
		os.Exit(1)
	}

	var response map[string]interface{}
	if err := json.Unmarshal(respBody, &response); err != nil {
		fmt.Printf("Error parsing output: %v\n", err)
		os.Exit(1)
	}

	// Pretty print response
	prettyJSON, _ := json.MarshalIndent(response, "", "  ")
	fmt.Println(string(prettyJSON))
}

func clearOverride(signalID string) {
	path := fmt.Sprintf("/internal/signals/%s", signalID)
	respBody, err := makeRequest("DELETE", path, nil)
	if err != nil {
		fmt.Printf("Error: %v\n", err)
		os.Exit(1)
	}

	var response map[string]interface{}
	if err := json.Unmarshal(respBody, &response); err != nil {
		fmt.Printf("Error parsing output: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("Override cleared for signal %s\n", signalID)

	// Pretty print response
	prettyJSON, _ := json.MarshalIndent(response, "", "  ")
	fmt.Println(string(prettyJSON))
}
