package entitlementctx

import (
	"context"
	"payment-node/internal/entitlements"
)

type TierEntitlements = entitlements.Entitlements

type Registry interface {
	GetEntitlements(string) (entitlements.Entitlements, error)
}

func LoadRegistry(path string) (Registry, error) {
	return entitlements.LoadEntitlementsRegistry(path)
}

func TierFromContext(ctx context.Context) string {
	if ctx == nil {
		return "baseline"
	}
	if v := ctx.Value("tier"); v != nil {
		if s, ok := v.(string); ok && s != "" {
			return s
		}
	}
	return "baseline"
}

// Resolve resolves the tier and entitlements from the context and registry.
func Resolve(ctx context.Context, r Registry) (string, entitlements.Entitlements) {
	tier := TierFromContext(ctx)

	ent, err := r.GetEntitlements(tier)
	if err != nil {
		fallback, _ := r.GetEntitlements("baseline")
		return "baseline", fallback
	}

	return tier, ent
}
