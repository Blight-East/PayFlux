package subscription

// AuthorityPolicy is the field-level authority arbitration table for the
// subscription reducer. For each interpreted field on the projection, the
// policy declares which source is authoritative.
//
// This is the v1 policy: every field's authority is "webhook" because the
// polling reconciliation worker doesn't exist yet. When polling lands, the
// policy gets updated and the reducer version is bumped — that's a logic
// change that should be exercised through the RAC test harness before any
// production change.
//
// The policy here MUST be kept in sync with the version table in
// SUBSCRIPTION_REDUCER_CONTRACT.md.
var AuthorityPolicy = map[string]AuthoritySource{
	"status":                 AuthorityWebhook,
	"current_period_start":   AuthorityWebhook,
	"current_period_end":     AuthorityWebhook,
	"cancel_at_period_end":   AuthorityWebhook,
	"canceled_at":            AuthorityWebhook,
	"trial_start":            AuthorityWebhook,
	"trial_end":              AuthorityWebhook,
}

// AuthorityFor returns the authority source for a given interpreted field.
// Returns AuthorityWebhook (the v1 default) for unknown fields — but
// callers should never pass an unknown field; the merge function operates
// on a closed set.
func AuthorityFor(field string) AuthoritySource {
	if src, ok := AuthorityPolicy[field]; ok {
		return src
	}
	return AuthorityWebhook
}

// EventSource maps a reducer-side observation source to the authority tag.
// During projection-only mode, the reducer only consumes webhook events,
// so this always returns AuthorityWebhook. When polling and manual
// reconciliation come online, this mapping grows.
type EventSource string

const (
	EventSourceWebhook EventSource = "webhook"
	// EventSourcePolling and EventSourceManual reserved for future use.
)

func (es EventSource) Authority() AuthoritySource {
	switch es {
	case EventSourceWebhook:
		return AuthorityWebhook
	}
	return AuthorityWebhook
}
