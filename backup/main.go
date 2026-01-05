#!/bin/bash
# stress_chaos_test.sh
# Usage: ./stress_chaos_test.sh

# -----------------------------
# Configuration
# -----------------------------
TOTAL=5000        # total number of events to send
CONC=50           # concurrent workers
DURATION=60       # total duration in seconds to run (approx)
NODE_URL="http://127.0.0.1:8080/v1/events/payment_exhaust"
METRICS_URL="http://127.0.0.1:8080/metrics"

# -----------------------------
# Event data pools
# -----------------------------
failure_categories=("processor_timeout" "card_declined" "insufficient_funds")
geo_buckets=("US" "EU" "APAC")
amount_buckets=("0-50" "50-200" "200-500")
payment_methods=("credit_card" "paypal" "apple_pay" "google_pay")

# -----------------------------
# Generate random event
# -----------------------------
generate_event() {
  EVENT_ID=$(uuidgen)
  TS=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  FC=${failure_categories[$RANDOM % ${#failure_categories[@]}]}
  GEO=${geo_buckets[$RANDOM % ${#geo_buckets[@]}]}
  AMT=${amount_buckets[$RANDOM % ${#amount_buckets[@]}]}
  PM=${payment_methods[$RANDOM % ${#payment_methods[@]}]}

  cat <<EOF
{
  "event_type":"payment_failed",
  "event_timestamp":"$TS",
  "event_id":"$EVENT_ID",
  "merchant_id_hash":"abc123",
  "payment_intent_id_hash":"xyz456",
  "processor":"stripe",
  "failure_category":"$FC",
  "retry_count":0,
  "geo_bucket":"$GEO",
  "amount_bucket":"$AMT",
  "system_source":"checkout_api",
  "payment_method_bucket":"$PM",
  "channel":"web",
  "retry_result":"failed",
  "failure_origin":"processor"
}
EOF
}

# -----------------------------
# Start metrics monitoring
# -----------------------------
echo "Starting metrics monitoring..."
(
  while true; do
    curl -s $METRICS_URL
    sleep 2
  done
) &
METRICS_PID=$!

# -----------------------------
# Stress test loop
# -----------------------------
echo "Starting stress test with $TOTAL events and concurrency $CONC..."
for i in $(seq 1 $TOTAL); do
  generate_event | hey -n 1 -c 1 -m POST -H "Content-Type: application/json" -d @- $NODE_URL &
  
  # Optional chaos: restart service mid-load
  if [ $i -eq $((TOTAL/2)) ]; then
    echo "---- Chaos: restarting node ----"
    # replace this with your actual node stop/start commands
    # e.g., pkill -f main.go && go run ~/payment-node/main.go &
    sleep 2  # simulate brief downtime
  fi
done

wait

# -----------------------------
# Cleanup
# -----------------------------
kill $METRICS_PID
echo "Stress + chaos test complete."
curl -s $METRICS_URL
