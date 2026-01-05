#!/bin/bash
# stress_test.sh - minimal high-throughput POST generator for payment_exhaust node

NODE_URL="http://127.0.0.1:8080/v1/events/payment_exhaust"
TOTAL=5000        # total events
CONC=50           # concurrent requests

# Arrays for random selections
processors=("stripe" "adyen" "checkout" "internal")
failure_categories=("insufficient_funds" "processor_timeout" "invalid_payment_method" "suspected_fraud" "unknown")
geo_buckets=("US" "EU" "APAC")
payment_methods=("credit_card" "debit_card" "paypal")

tmpfile=$(mktemp)

for i in $(seq 1 $TOTAL); do
  event_json=$(cat <<EOF
{
  "event_type":"payment_failed",
  "event_timestamp":"$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "event_id":"$(uuidgen)",
  "merchant_id_hash":"abc123",
  "payment_intent_id_hash":"xyz456",
  "processor":"${processors[$RANDOM % ${#processors[@]}]}",
  "failure_category":"${failure_categories[$RANDOM % ${#failure_categories[@]}]}",
  "retry_count":0,
  "geo_bucket":"${geo_buckets[$RANDOM % ${#geo_buckets[@]}]}",
  "amount_bucket":"50-200",
  "system_source":"checkout_api",
  "payment_method_bucket":"${payment_methods[$RANDOM % ${#payment_methods[@]}]}",
  "channel":"web",
  "retry_result":"failed",
  "failure_origin":"processor"
}
EOF
)
  echo "$event_json" >> $tmpfile
done

echo "Sending $TOTAL events to $NODE_URL..."
hey -n $TOTAL -c $CONC -m POST -H "Content-Type: application/json" -D $tmpfile $NODE_URL

rm -f $tmpfile
echo "Stress test complete."
