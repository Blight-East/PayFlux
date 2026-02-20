package startup

import (
	"context"
	"time"

	"github.com/redis/go-redis/v9"
)

// GoRedisConn adapts a go-redis client to the RedisConn interface.
type GoRedisConn struct {
	client *redis.Client
}

// NewGoRedisConn creates a RedisConn backed by a go-redis client.
// The client is created with a short dial timeout and no pooling —
// this is a probe connection, not a production connection.
func NewGoRedisConn(addr, password string, db int) *GoRedisConn {
	opts := &redis.Options{
		Addr:         addr,
		Password:     password,
		DB:           db,
		DialTimeout:  depDialTimeout,
		ReadTimeout:  depDialTimeout,
		WriteTimeout: depDialTimeout,
		PoolSize:     1,
	}
	return &GoRedisConn{client: redis.NewClient(opts)}
}

func (c *GoRedisConn) Auth(ctx context.Context, password string) error {
	// go-redis handles AUTH via the Options.Password field at connection time.
	// If we get here, auth was already attempted. We re-issue AUTH explicitly.
	return c.client.Do(ctx, "AUTH", password).Err()
}

func (c *GoRedisConn) Ping(ctx context.Context) (string, error) {
	return c.client.Ping(ctx).Result()
}

func (c *GoRedisConn) Info(ctx context.Context, section string) (string, error) {
	return c.client.Info(ctx, section).Result()
}

func (c *GoRedisConn) Set(ctx context.Context, key, value string, expiration time.Duration) error {
	return c.client.Set(ctx, key, value, expiration).Err()
}

func (c *GoRedisConn) Get(ctx context.Context, key string) (string, error) {
	return c.client.Get(ctx, key).Result()
}

func (c *GoRedisConn) Del(ctx context.Context, key string) (int64, error) {
	return c.client.Del(ctx, key).Result()
}

func (c *GoRedisConn) Close() error {
	return c.client.Close()
}
