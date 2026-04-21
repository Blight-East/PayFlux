package entitlements

import (
	"context"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
)

func TestEnforcementMiddleware_Headers(t *testing.T) {
	registry, err := LoadEntitlementsRegistry("../../config/tier_entitlements.runtime.json")
	if err != nil {
		t.Fatal(err)
	}

	middleware := NewEnforcementMiddleware(registry)

	handler := middleware.Wrap(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	tests := []struct {
		tier              string
		expectedSLA       string
		expectedRetention string
	}{
		{"baseline", "5000", "7"},
		{"proof", "2000", "30"},
		{"shield", "1000", "90"},
		{"fortress", "500", "365"},
	}

	for _, tc := range tests {
		t.Run(tc.tier, func(t *testing.T) {
			req := httptest.NewRequest("GET", "/test", nil)
			ctx := context.WithValue(req.Context(), TierContextKey, tc.tier)
			req = req.WithContext(ctx)

			w := httptest.NewRecorder()
			handler(w, req)

			if w.Header().Get("X-PayFlux-Tier") != tc.tier {
				t.Errorf("expected tier %s, got %s", tc.tier, w.Header().Get("X-PayFlux-Tier"))
			}

			if w.Header().Get("X-PayFlux-SLA-Ms") != tc.expectedSLA {
				t.Errorf("expected SLA %s, got %s", tc.expectedSLA, w.Header().Get("X-PayFlux-SLA-Ms"))
			}

			if w.Header().Get("X-PayFlux-Retention-Days") != tc.expectedRetention {
				t.Errorf("expected retention %s, got %s", tc.expectedRetention, w.Header().Get("X-PayFlux-Retention-Days"))
			}
		})
	}
}

func TestEnforcementMiddleware_UnknownTier(t *testing.T) {
	registry, err := LoadEntitlementsRegistry("../../config/tier_entitlements.runtime.json")
	if err != nil {
		t.Fatal(err)
	}

	middleware := NewEnforcementMiddleware(registry)

	handler := middleware.Wrap(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	req := httptest.NewRequest("GET", "/test", nil)
	ctx := context.WithValue(req.Context(), TierContextKey, "unknown")
	req = req.WithContext(ctx)

	w := httptest.NewRecorder()
	handler(w, req)

	// Should fallback to baseline
	if w.Header().Get("X-PayFlux-Tier") != "baseline" {
		t.Errorf("expected baseline tier for unknown, got %s", w.Header().Get("X-PayFlux-Tier"))
	}

	if w.Header().Get("X-PayFlux-SLA-Ms") != "5000" {
		t.Errorf("expected baseline SLA for unknown tier")
	}
}

func TestEnforcementMiddleware_ConcurrencyLimit(t *testing.T) {
	registry, err := LoadEntitlementsRegistry("../../config/tier_entitlements.runtime.json")
	if err != nil {
		t.Fatal(err)
	}

	middleware := NewEnforcementMiddleware(registry)

	tier := "baseline" // limit is 10
	limit := 10

	// Create a blocking handler
	var wg sync.WaitGroup
	started := make(chan struct{})
	proceed := make(chan struct{})

	handler := middleware.Wrap(func(w http.ResponseWriter, r *http.Request) {
		started <- struct{}{}
		<-proceed
		w.WriteHeader(http.StatusOK)
	})

	// Start exactly 'limit' requests that will block
	for i := 0; i < limit; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			req := httptest.NewRequest("GET", "/test", nil)
			ctx := context.WithValue(req.Context(), TierContextKey, tier)
			req = req.WithContext(ctx)
			w := httptest.NewRecorder()
			handler(w, req)
		}()
	}

	// Wait for all blocking requests to start
	for i := 0; i < limit; i++ {
		<-started
	}

	// Now try one more request - should be rejected
	req := httptest.NewRequest("GET", "/test", nil)
	ctx := context.WithValue(req.Context(), TierContextKey, tier)
	req = req.WithContext(ctx)
	w := httptest.NewRecorder()
	handler(w, req)

	if w.Code != http.StatusTooManyRequests {
		t.Errorf("expected 429, got %d", w.Code)
	}

	// Release all blocking requests
	close(proceed)
	wg.Wait()
}

func TestEnforcementMiddleware_ContextPropagation(t *testing.T) {
	registry, err := LoadEntitlementsRegistry("../../config/tier_entitlements.runtime.json")
	if err != nil {
		t.Fatal(err)
	}

	middleware := NewEnforcementMiddleware(registry)

	handler := middleware.Wrap(func(w http.ResponseWriter, r *http.Request) {
		ent, err := GetEntitlementsFromContext(r.Context())
		if err != nil {
			t.Error("entitlements not found in context")
		}

		if ent.RetentionDays != 30 {
			t.Errorf("expected retention 30, got %d", ent.RetentionDays)
		}

		w.WriteHeader(http.StatusOK)
	})

	req := httptest.NewRequest("GET", "/test", nil)
	ctx := context.WithValue(req.Context(), TierContextKey, "proof")
	req = req.WithContext(ctx)

	w := httptest.NewRecorder()
	handler(w, req)
}

func BenchmarkEnforcementMiddleware(b *testing.B) {
	registry, err := LoadEntitlementsRegistry("../../config/tier_entitlements.runtime.json")
	if err != nil {
		b.Fatal(err)
	}

	middleware := NewEnforcementMiddleware(registry)

	handler := middleware.Wrap(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	req := httptest.NewRequest("GET", "/test", nil)
	ctx := context.WithValue(req.Context(), TierContextKey, "proof")
	req = req.WithContext(ctx)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		w := httptest.NewRecorder()
		handler(w, req)
	}
}
