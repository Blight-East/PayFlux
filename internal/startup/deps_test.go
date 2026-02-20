package startup

import (
	"context"
	"errors"
	"fmt"
	"net"
	"os"
	"testing"
	"time"
)

// mockRedisConn implements RedisConn for deterministic testing without real Redis.
type mockRedisConn struct {
	authErr  error
	pingResp string
	pingErr  error
	infoResp string
	infoErr  error
	setErr   error
	getResp  string
	getErr   error
	delResp  int64
	delErr   error
}

func (m *mockRedisConn) Auth(_ context.Context, _ string) error        { return m.authErr }
func (m *mockRedisConn) Ping(_ context.Context) (string, error)        { return m.pingResp, m.pingErr }
func (m *mockRedisConn) Info(_ context.Context, _ string) (string, error) { return m.infoResp, m.infoErr }
func (m *mockRedisConn) Set(_ context.Context, _, _ string, _ time.Duration) error { return m.setErr }
func (m *mockRedisConn) Get(_ context.Context, _ string) (string, error) { return m.getResp, m.getErr }
func (m *mockRedisConn) Del(_ context.Context, _ string) (int64, error)  { return m.delResp, m.delErr }
func (m *mockRedisConn) Close() error                                    { return nil }

// validInfoResponse returns a minimal Redis INFO server response.
func validInfoResponse() string {
	return "# Server\r\nredis_version:7.2.4\r\nredis_mode:standalone\r\n"
}

// successMock returns a mock that passes all checks.
func successMock() *mockRedisConn {
	return &mockRedisConn{
		pingResp: "PONG",
		infoResp: validInfoResponse(),
		getResp:  depProbeValue,
		delResp:  1,
	}
}

// startTCPListener starts a TCP listener on a random port, returns addr and cleanup.
func startTCPListener(t *testing.T) string {
	t.Helper()
	l, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("failed to start TCP listener: %v", err)
	}
	t.Cleanup(func() { l.Close() })
	// Accept connections in background so dial doesn't hang
	go func() {
		for {
			conn, err := l.Accept()
			if err != nil {
				return
			}
			conn.Close()
		}
	}()
	return l.Addr().String()
}

func TestValidateDependencies_Success(t *testing.T) {
	addr := startTCPListener(t)
	mock := successMock()

	result, err := ValidateDependencies(mock, addr)
	if err != nil {
		t.Fatalf("expected success, got error: %v", err)
	}
	if result.RedisAddr != addr {
		t.Errorf("expected addr %s, got %s", addr, result.RedisAddr)
	}
	if result.RedisVersion != "7.2.4" {
		t.Errorf("expected version 7.2.4, got %s", result.RedisVersion)
	}
}

func TestValidateDependencies_UnreachableHost(t *testing.T) {
	// Use a port that is definitely not listening
	mock := successMock()
	_, err := ValidateDependencies(mock, "127.0.0.1:1")
	if err == nil {
		t.Fatal("expected error for unreachable host")
	}
	depErr, ok := err.(*DepError)
	if !ok {
		t.Fatalf("expected *DepError, got %T", err)
	}
	if depErr.Operation != "tcp_connect" {
		t.Errorf("expected operation tcp_connect, got %s", depErr.Operation)
	}
}

func TestValidateDependencies_WrongPort(t *testing.T) {
	mock := successMock()
	_, err := ValidateDependencies(mock, "127.0.0.1:1")
	if err == nil {
		t.Fatal("expected error for wrong port")
	}
	depErr, ok := err.(*DepError)
	if !ok {
		t.Fatalf("expected *DepError, got %T", err)
	}
	if depErr.Operation != "tcp_connect" {
		t.Errorf("expected operation tcp_connect, got %s", depErr.Operation)
	}
}

func TestValidateDependencies_AuthFailure(t *testing.T) {
	addr := startTCPListener(t)
	mock := successMock()
	mock.authErr = errors.New("NOAUTH Authentication required")

	// Set REDIS_PASSWORD to trigger auth path
	os.Setenv("REDIS_PASSWORD", "wrong")
	defer os.Unsetenv("REDIS_PASSWORD")

	_, err := ValidateDependencies(mock, addr)
	if err == nil {
		t.Fatal("expected error for auth failure")
	}
	depErr, ok := err.(*DepError)
	if !ok {
		t.Fatalf("expected *DepError, got %T", err)
	}
	if depErr.Operation != "auth" {
		t.Errorf("expected operation auth, got %s", depErr.Operation)
	}
	// Must not leak password in error
	if depErr.Reason != "auth failed" {
		t.Errorf("error reason should not contain password details, got: %s", depErr.Reason)
	}
}

func TestValidateDependencies_PingFails(t *testing.T) {
	addr := startTCPListener(t)
	mock := successMock()
	mock.pingResp = ""
	mock.pingErr = errors.New("connection reset")

	_, err := ValidateDependencies(mock, addr)
	if err == nil {
		t.Fatal("expected error for ping failure")
	}
	depErr := err.(*DepError)
	if depErr.Operation != "ping" {
		t.Errorf("expected operation ping, got %s", depErr.Operation)
	}
}

func TestValidateDependencies_ClusterMode(t *testing.T) {
	addr := startTCPListener(t)
	mock := successMock()
	mock.infoResp = "# Server\r\nredis_version:7.2.4\r\nredis_mode:cluster\r\n"

	_, err := ValidateDependencies(mock, addr)
	if err == nil {
		t.Fatal("expected error for cluster mode")
	}
	depErr := err.(*DepError)
	if depErr.Operation != "info_server" {
		t.Errorf("expected operation info_server, got %s", depErr.Operation)
	}
}

func TestValidateDependencies_MissingVersion(t *testing.T) {
	addr := startTCPListener(t)
	mock := successMock()
	mock.infoResp = "# Server\r\nredis_mode:standalone\r\n"

	_, err := ValidateDependencies(mock, addr)
	if err == nil {
		t.Fatal("expected error for missing version")
	}
	depErr := err.(*DepError)
	if depErr.Operation != "info_server" {
		t.Errorf("expected operation info_server, got %s", depErr.Operation)
	}
}

func TestValidateDependencies_WriteFailure(t *testing.T) {
	addr := startTCPListener(t)
	mock := successMock()
	mock.setErr = errors.New("READONLY You can't write against a read only replica")

	_, err := ValidateDependencies(mock, addr)
	if err == nil {
		t.Fatal("expected error for write failure")
	}
	depErr := err.(*DepError)
	if depErr.Operation != "write_probe" {
		t.Errorf("expected operation write_probe, got %s", depErr.Operation)
	}
}

func TestValidateDependencies_ReadMismatch(t *testing.T) {
	addr := startTCPListener(t)
	mock := successMock()
	mock.getResp = "wrong_value"

	_, err := ValidateDependencies(mock, addr)
	if err == nil {
		t.Fatal("expected error for read mismatch")
	}
	depErr := err.(*DepError)
	if depErr.Operation != "read_probe" {
		t.Errorf("expected operation read_probe, got %s", depErr.Operation)
	}
}

func TestValidateDependencies_DeleteFailure(t *testing.T) {
	addr := startTCPListener(t)
	mock := successMock()
	mock.delResp = 0
	mock.delErr = errors.New("ERR operation not permitted")

	_, err := ValidateDependencies(mock, addr)
	if err == nil {
		t.Fatal("expected error for delete failure")
	}
	depErr := err.(*DepError)
	if depErr.Operation != "delete_probe" {
		t.Errorf("expected operation delete_probe, got %s", depErr.Operation)
	}
}

func TestDepError_Format(t *testing.T) {
	err := &DepError{
		Reason:    "tcp dial failed: connection refused",
		Host:      "localhost:6379",
		Operation: "tcp_connect",
	}
	msg := err.Error()
	if msg == "" {
		t.Fatal("error message should not be empty")
	}
	// Verify structured format
	for _, expected := range []string{"reason:", "host:", "operation:"} {
		if !contains(msg, expected) {
			t.Errorf("error message missing %q: %s", expected, msg)
		}
	}
}

func TestExtractInfoField(t *testing.T) {
	info := "# Server\r\nredis_version:7.2.4\r\nredis_mode:standalone\r\nuptime_in_seconds:12345\r\n"

	tests := []struct {
		field    string
		expected string
	}{
		{"redis_version", "7.2.4"},
		{"redis_mode", "standalone"},
		{"uptime_in_seconds", "12345"},
		{"nonexistent", ""},
	}

	for _, tt := range tests {
		t.Run(fmt.Sprintf("field=%s", tt.field), func(t *testing.T) {
			got := extractInfoField(info, tt.field)
			if got != tt.expected {
				t.Errorf("extractInfoField(%q) = %q, want %q", tt.field, got, tt.expected)
			}
		})
	}
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && searchString(s, substr)
}

func searchString(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
