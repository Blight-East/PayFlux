#!/bin/bash
TOTAL=5000
CONC=50

echo "Starting chaos stress test..."

# Launch ingest node in background
go run main.go &
NODE_PID=$!

# Run stress test with hey
hey -n $TOTAL -c $CONC -m POST -H "Content-Type: application/json" -d '{"event_type":"payment_failed","event_id":"uuidTEST"}' http://127.0.0.1:8080/v1/events/payment_exhaust

# Simulate chaos: restart node mid-load
kill -9 $NODE_PID
go run main.go &
echo "Chaos stress test complete."
