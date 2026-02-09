package ratelimit

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// Config holds numeric rate limit configuration (NO tier semantics)
type Config struct {
	Capacity   int // max tokens
	RefillRate int // tokens per second
	Window     int // TTL in seconds
}

// Result holds rate limit check result
type Result struct {
	Allowed   bool
	Remaining int
	Reset     int64
}

// bucketState represents the token bucket state in Redis
type bucketState struct {
	Tokens     float64 `json:"tokens"`
	LastRefill int64   `json:"lastRefill"`
}

// Limiter implements atomic token bucket rate limiting using Redis Lua
type Limiter struct {
	redis *redis.Client
}

// NewLimiter creates a new rate limiter
func NewLimiter(redisClient *redis.Client) *Limiter {
	return &Limiter{redis: redisClient}
}

// Check performs atomic rate limit check using Lua script
// This is identical to the TypeScript implementation for consistency
func (l *Limiter) Check(ctx context.Context, accountID string, cfg Config) (*Result, error) {
	// Validate config
	if cfg.Capacity <= 0 || cfg.RefillRate <= 0 || cfg.Window <= 0 {
		return nil, fmt.Errorf("invalid rate limit config: capacity=%d refill=%d window=%d",
			cfg.Capacity, cfg.RefillRate, cfg.Window)
	}

	// Key by accountId ONLY (not tier, not API key)
	key := fmt.Sprintf("rl:account:%s", accountID)
	now := time.Now().UnixMilli()

	// Atomic Lua script (same logic as TypeScript/Dashboard version)
	script := `
		local key = KEYS[1]
		local now = tonumber(ARGV[1])
		local capacity = tonumber(ARGV[2])
		local refillRate = tonumber(ARGV[3])
		local ttl = tonumber(ARGV[4])
		
		-- Get current state or initialize
		local stateJson = redis.call('GET', key)
		local tokens, lastRefill
		
		if stateJson then
			local state = cjson.decode(stateJson)
			tokens = state.tokens
			lastRefill = state.lastRefill
		else
			tokens = capacity
			lastRefill = now
		end
		
		-- Refill tokens based on elapsed time
		local elapsedSeconds = (now - lastRefill) / 1000
		local refillTokens = elapsedSeconds * refillRate
		tokens = math.min(capacity, tokens + refillTokens)
		lastRefill = now
		
		-- Check if request is allowed
		local allowed = 0
		local reset = 0
		
		if tokens >= 1 then
			allowed = 1
			tokens = tokens - 1
			if tokens < 1 then
				reset = math.ceil((1 - tokens) / refillRate)
			end
		else
			reset = math.ceil((1 - tokens) / refillRate)
		end
		
		-- Save updated state
		local newState = cjson.encode({tokens = tokens, lastRefill = lastRefill})
		redis.call('SETEX', key, ttl, newState)
		
		-- Return: allowed, remaining tokens, reset time
		return {allowed, math.floor(tokens), reset}
	`

	// Execute Lua script
	result, err := l.redis.Eval(ctx, script,
		[]string{key},
		now, cfg.Capacity, cfg.RefillRate, cfg.Window,
	).Result()

	if err != nil {
		return nil, fmt.Errorf("rate limit check failed: %w", err)
	}

	// Parse result
	vals, ok := result.([]interface{})
	if !ok || len(vals) != 3 {
		return nil, fmt.Errorf("unexpected lua script result format")
	}

	allowed, ok1 := vals[0].(int64)
	remaining, ok2 := vals[1].(int64)
	resetOffset, ok3 := vals[2].(int64)

	if !ok1 || !ok2 || !ok3 {
		return nil, fmt.Errorf("failed to parse lua script result")
	}

	return &Result{
		Allowed:   allowed == 1,
		Remaining: int(remaining),
		Reset:     time.Now().Unix() + resetOffset,
	}, nil
}

// Validate checks if a Config is valid
func (c Config) Validate() error {
	if c.Capacity <= 0 {
		return fmt.Errorf("capacity must be > 0, got %d", c.Capacity)
	}
	if c.RefillRate <= 0 {
		return fmt.Errorf("refillRate must be > 0, got %d", c.RefillRate)
	}
	if c.Window <= 0 {
		return fmt.Errorf("window must be > 0, got %d", c.Window)
	}
	return nil
}
