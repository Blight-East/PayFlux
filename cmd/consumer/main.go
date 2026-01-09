package main

import (
	"context"
	"log"
	"os"
	"strings"

	"github.com/redis/go-redis/v9"
)

var (
	ctx = context.Background()

	redisAddr    = env("REDIS_ADDR", "localhost:6379")
	streamKey    = env("STREAM_KEY", "events_stream")
	groupName    = env("GROUP_NAME", "payment_consumers")
	consumerName = env("CONSUMER_NAME", "consumer-1")

	rdb *redis.Client
)

func main() {
	rdb = redis.NewClient(&redis.Options{Addr: redisAddr})
	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Fatalf("Failed to connect to Redis at %s: %v", redisAddr, err)
	}
	log.Printf("Connected to Redis (%s)", redisAddr)

	// Ensure group exists (safe if already exists)
	_, err := rdb.XGroupCreateMkStream(ctx, streamKey, groupName, "0").Result()
	if err != nil && !strings.Contains(err.Error(), "BUSYGROUP") {
		log.Fatalf("Failed to create consumer group: %v", err)
	}

	log.Printf("Consumer started (stream=%s group=%s consumer=%s)", streamKey, groupName, consumerName)

	for {
		streams, err := rdb.XReadGroup(ctx, &redis.XReadGroupArgs{
			Group:    groupName,
			Consumer: consumerName,
			Streams:  []string{streamKey, ">"},
			Block:    0,
			Count:    50,
		}).Result()

		if err != nil {
			log.Printf("XREADGROUP error: %v", err)
			continue
		}

		for _, s := range streams {
			for _, msg := range s.Messages {
				// “Processing” is just logging for now
				log.Printf("Processed id=%s data=%v", msg.ID, msg.Values["data"])

				if err := rdb.XAck(ctx, streamKey, groupName, msg.ID).Err(); err != nil {
					log.Printf("XACK error id=%s: %v", msg.ID, err)
				}
			}
		}
	}
}

func env(k, def string) string {
	if v := os.Getenv(k); strings.TrimSpace(v) != "" {
		return v
	}
	return def
}
