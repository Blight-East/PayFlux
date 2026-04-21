package entitlements

import (
	"time"
)

// CheckRetention checks if an artifact is within the retention window
// Returns true if allowed, false if expired
func CheckRetention(artifactTimestamp time.Time, retentionDays int) bool {
	if retentionDays <= 0 {
		return false
	}

	age := time.Since(artifactTimestamp)
	maxAge := time.Duration(retentionDays) * 24 * time.Hour

	return age < maxAge
}

// ShouldRouteAlert checks if alerts should be routed for this tier
func ShouldRouteAlert(alertRoutingEnabled bool) bool {
	return alertRoutingEnabled
}
