package entitlements

import (
	"context"
	"fmt"
	"net/http"
	"strconv"

	"payment-node/internal/metrics"
)

// Middleware keys
type contextKey string

const (
	TierContextKey contextKey = "tier"
)

// EnforcementMiddleware wraps HTTP handlers with tier enforcement
type EnforcementMiddleware struct {
	registry *EntitlementsRegistry
	limiter  *ConcurrencyLimiter
}

// NewEnforcementMiddleware creates a new enforcement middleware
func NewEnforcementMiddleware(registry *EntitlementsRegistry) *EnforcementMiddleware {
	return &EnforcementMiddleware{
		registry: registry,
		limiter:  NewConcurrencyLimiter(),
	}
}

// Wrap wraps an HTTP handler with enforcement
func (em *EnforcementMiddleware) Wrap(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Extract tier from context or default to baseline
		tier := "baseline"
		if ctxTier := r.Context().Value(TierContextKey); ctxTier != nil {
			if tierStr, ok := ctxTier.(string); ok {
				tier = tierStr
			}
		}

		// Get entitlements (fail-closed)
		ent, err := em.registry.GetEntitlements(tier)
		if err != nil {
			// Unknown tier - use baseline entitlements
			ent, _ = em.registry.GetEntitlements("baseline")
			tier = "baseline"
		}

		// 1. CONCURRENT REQUEST LIMITER
		if !em.limiter.TryAcquire(tier, ent.MaxConcurrentRequests) {
			metrics.RecordConcurrencyBlock(tier)
			http.Error(w, "Too Many Requests", http.StatusTooManyRequests)
			return
		}
		defer em.limiter.Release(tier)

		// Update active requests gauge
		metrics.UpdateActiveRequests(tier, em.limiter.GetActive(tier))

		// 2. RESPONSE HEADERS (VISIBILITY LAYER)
		w.Header().Set("X-PayFlux-Tier", tier)
		w.Header().Set("X-PayFlux-SLA-Ms", strconv.Itoa(ent.SLAResponseTimeMs))
		w.Header().Set("X-PayFlux-Retention-Days", strconv.Itoa(ent.RetentionDays))

		// Store entitlements in context for downstream use
		ctx := context.WithValue(r.Context(), "entitlements", ent)
		r = r.WithContext(ctx)

		// Call next handler
		next(w, r)

		// Update active requests gauge after request completes
		metrics.UpdateActiveRequests(tier, em.limiter.GetActive(tier))
	}
}

// GetEntitlementsFromContext retrieves entitlements from request context
func GetEntitlementsFromContext(ctx context.Context) (Entitlements, error) {
	if ent := ctx.Value("entitlements"); ent != nil {
		if entitlements, ok := ent.(Entitlements); ok {
			return entitlements, nil
		}
	}
	return Entitlements{}, fmt.Errorf("entitlements not found in context")
}
