package entitlements

import (
	"testing"
	"time"
)

func TestCheckRetention_WithinWindow(t *testing.T) {
	now := time.Now()
	timestamp := now.Add(-5 * 24 * time.Hour) // 5 days ago

	if !CheckRetention(timestamp, 7) {
		t.Error("should allow access within retention window")
	}
}

func TestCheckRetention_OutsideWindow(t *testing.T) {
	now := time.Now()
	timestamp := now.Add(-10 * 24 * time.Hour) // 10 days ago

	if CheckRetention(timestamp, 7) {
		t.Error("should block access outside retention window")
	}
}

func TestCheckRetention_ExactBoundary(t *testing.T) {
	now := time.Now()
	timestamp := now.Add(-7 * 24 * time.Hour) // Exactly 7 days ago

	// Should reject at exact boundary (strict less-than)
	if CheckRetention(timestamp, 7) {
		t.Error("should reject access at exact retention boundary")
	}

	// Just before boundary should allow
	timestampBefore := now.Add(-7*24*time.Hour + 1*time.Minute)
	if !CheckRetention(timestampBefore, 7) {
		t.Error("should allow access just before retention boundary")
	}
}

func TestCheckRetention_ZeroRetention(t *testing.T) {
	now := time.Now()
	timestamp := now.Add(-1 * time.Hour)

	if CheckRetention(timestamp, 0) {
		t.Error("should block when retention is 0")
	}
}

func TestCheckRetention_NegativeRetention(t *testing.T) {
	now := time.Now()
	timestamp := now.Add(-1 * time.Hour)

	if CheckRetention(timestamp, -1) {
		t.Error("should block when retention is negative")
	}
}

func TestShouldRouteAlert_Enabled(t *testing.T) {
	if !ShouldRouteAlert(true) {
		t.Error("should route when enabled")
	}
}

func TestShouldRouteAlert_Disabled(t *testing.T) {
	if ShouldRouteAlert(false) {
		t.Error("should not route when disabled")
	}
}

func BenchmarkCheckRetention(b *testing.B) {
	timestamp := time.Now().Add(-5 * 24 * time.Hour)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		CheckRetention(timestamp, 7)
	}
}
