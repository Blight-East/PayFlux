package startup

import (
	"context"
	"fmt"
	"net"
	"os"
	"strings"
	"time"
)

const (
	depDialTimeout = 2 * time.Second
	depProbeKey    = "payflux:boot_probe"
	depProbeValue  = "1"
)

// DepError is a structured dependency validation failure.
type DepError struct {
	Reason    string
	Host      string
	Operation string
}

func (e *DepError) Error() string {
	return fmt.Sprintf("dependency validation failed:\n  - reason: %s\n  - host: %s\n  - operation: %s",
		e.Reason, e.Host, e.Operation)
}

// RedisConn abstracts the Redis operations needed for dependency validation.
// The main binary passes a real connection; tests pass a mock.
type RedisConn interface {
	// Auth sends AUTH with the given password. Returns nil if successful.
	Auth(ctx context.Context, password string) error
	// Ping sends PING and returns the response string.
	Ping(ctx context.Context) (string, error)
	// Info sends INFO <section> and returns the raw response.
	Info(ctx context.Context, section string) (string, error)
	// Set sets a key to a value with expiration.
	Set(ctx context.Context, key, value string, expiration time.Duration) error
	// Get returns the value for a key.
	Get(ctx context.Context, key string) (string, error)
	// Del deletes a key. Returns the number of keys deleted.
	Del(ctx context.Context, key string) (int64, error)
	// Close closes the connection.
	Close() error
}

// DepResult contains metadata from a successful dependency validation.
type DepResult struct {
	RedisAddr    string
	RedisVersion string
}

// ValidateDependencies verifies that Redis is reachable, authenticated,
// writable, and compatible before the system starts. Returns a DepResult
// on success or a *DepError on failure.
//
// This function does not retry, does not loop, does not sleep.
// It either succeeds immediately or fails with a structured error.
func ValidateDependencies(conn RedisConn, addr string) (*DepResult, error) {
	ctx, cancel := context.WithTimeout(context.Background(), depDialTimeout)
	defer cancel()

	// Step 1: TCP connectivity
	d := net.Dialer{Timeout: depDialTimeout}
	tcpConn, err := d.DialContext(ctx, "tcp", addr)
	if err != nil {
		return nil, &DepError{
			Reason:    fmt.Sprintf("tcp dial failed: %v", err),
			Host:      addr,
			Operation: "tcp_connect",
		}
	}
	tcpConn.Close()

	// Step 2: AUTH (if password configured)
	if password := os.Getenv("REDIS_PASSWORD"); password != "" {
		if err := conn.Auth(ctx, password); err != nil {
			return nil, &DepError{
				Reason:    "auth failed",
				Host:      addr,
				Operation: "auth",
			}
		}
	}

	// Step 3: PING
	pong, err := conn.Ping(ctx)
	if err != nil {
		return nil, &DepError{
			Reason:    fmt.Sprintf("ping failed: %v", err),
			Host:      addr,
			Operation: "ping",
		}
	}
	if pong != "PONG" {
		return nil, &DepError{
			Reason:    fmt.Sprintf("ping returned %q, expected PONG", pong),
			Host:      addr,
			Operation: "ping",
		}
	}

	// Step 4: Server info validation
	info, err := conn.Info(ctx, "server")
	if err != nil {
		return nil, &DepError{
			Reason:    fmt.Sprintf("info server failed: %v", err),
			Host:      addr,
			Operation: "info_server",
		}
	}

	version := extractInfoField(info, "redis_version")
	if version == "" {
		return nil, &DepError{
			Reason:    "redis_version not found in INFO server",
			Host:      addr,
			Operation: "info_server",
		}
	}

	mode := extractInfoField(info, "redis_mode")
	if mode != "" && mode != "standalone" {
		return nil, &DepError{
			Reason:    fmt.Sprintf("redis_mode=%q, expected standalone", mode),
			Host:      addr,
			Operation: "info_server",
		}
	}

	// Step 5: Write test
	if err := conn.Set(ctx, depProbeKey, depProbeValue, 10*time.Second); err != nil {
		return nil, &DepError{
			Reason:    fmt.Sprintf("write probe failed: %v", err),
			Host:      addr,
			Operation: "write_probe",
		}
	}

	// Step 6: Read test
	got, err := conn.Get(ctx, depProbeKey)
	if err != nil {
		return nil, &DepError{
			Reason:    fmt.Sprintf("read probe failed: %v", err),
			Host:      addr,
			Operation: "read_probe",
		}
	}
	if got != depProbeValue {
		return nil, &DepError{
			Reason:    fmt.Sprintf("read probe mismatch: got %q, expected %q", got, depProbeValue),
			Host:      addr,
			Operation: "read_probe",
		}
	}

	// Step 7: Delete test key
	deleted, err := conn.Del(ctx, depProbeKey)
	if err != nil {
		return nil, &DepError{
			Reason:    fmt.Sprintf("delete probe failed: %v", err),
			Host:      addr,
			Operation: "delete_probe",
		}
	}
	if deleted != 1 {
		return nil, &DepError{
			Reason:    fmt.Sprintf("delete probe returned %d, expected 1", deleted),
			Host:      addr,
			Operation: "delete_probe",
		}
	}

	return &DepResult{
		RedisAddr:    addr,
		RedisVersion: version,
	}, nil
}

// extractInfoField parses a Redis INFO response for a specific field.
// INFO format: "field:value\r\n" per line.
func extractInfoField(info, field string) string {
	for _, line := range strings.Split(info, "\n") {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, field+":") {
			return strings.TrimPrefix(line, field+":")
		}
	}
	return ""
}
