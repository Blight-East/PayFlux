#!/bin/bash
# Deployment Safety Monitor
# Monitors production deployment and triggers automatic rollback if safety thresholds exceeded

set -euo pipefail

PROD_URL="${PROD_URL:-https://prod.payflux.dev}"
BASELINE_P95="${BASELINE_P95:-0.050}"  # 50ms baseline
ERROR_THRESHOLD="${ERROR_THRESHOLD:-0.5}"  # 0.5% error rate
LATENCY_THRESHOLD="${LATENCY_THRESHOLD:-15}"  # 15% increase
MONITOR_DURATION="${MONITOR_DURATION:-300}"  # 5 minutes

echo "🔍 Starting deployment safety monitor..."
echo "   Production URL: $PROD_URL"
echo "   Baseline P95: ${BASELINE_P95}s"
echo "   Error threshold: ${ERROR_THRESHOLD}%"
echo "   Latency threshold: +${LATENCY_THRESHOLD}%"
echo "   Monitor duration: ${MONITOR_DURATION}s"
echo ""

start_time=$(date +%s)

while true; do
  current_time=$(date +%s)
  elapsed=$((current_time - start_time))
  
  if [ $elapsed -gt $MONITOR_DURATION ]; then
    echo "✅ Safety monitor completed successfully (${MONITOR_DURATION}s elapsed)"
    exit 0
  fi
  
  echo "[$(date +%H:%M:%S)] Checking metrics (${elapsed}s elapsed)..."
  
  # Check error rate
  metrics=$(curl -s "${PROD_URL}/metrics" || echo "")
  
  if [ -z "$metrics" ]; then
    echo "⚠️  WARNING: Could not fetch metrics"
    sleep 10
    continue
  fi
  
  # Calculate error rate
  error_count=$(echo "$metrics" | grep -E 'http_requests_total.*code="5[0-9]{2}"' | awk '{sum+=$2} END {print sum+0}')
  total_count=$(echo "$metrics" | grep 'http_requests_total' | awk '{sum+=$2} END {print sum+0}')
  
  if [ "$total_count" -gt 0 ]; then
    error_pct=$(echo "scale=2; ($error_count / $total_count) * 100" | bc)
    echo "   Error rate: ${error_pct}% (${error_count}/${total_count})"
    
    if (( $(echo "$error_pct > $ERROR_THRESHOLD" | bc -l) )); then
      echo ""
      echo "❌ CRITICAL: Error rate exceeded threshold!"
      echo "   Current: ${error_pct}%"
      echo "   Threshold: ${ERROR_THRESHOLD}%"
      echo ""
      echo "🔄 Triggering automatic rollback..."
      
      # Trigger rollback
      if [ -f "./deploy.sh" ]; then
        ./deploy.sh --rollback
      else
        echo "⚠️  deploy.sh not found - manual rollback required"
      fi
      
      exit 1
    fi
  fi
  
  # Check latency
  current_p95=$(echo "$metrics" | grep 'http_request_duration_seconds{quantile="0.95"}' | awk '{print $2}' | head -1)
  
  if [ -n "$current_p95" ]; then
    threshold_p95=$(echo "scale=4; $BASELINE_P95 * (1 + $LATENCY_THRESHOLD / 100)" | bc)
    echo "   P95 latency: ${current_p95}s (threshold: ${threshold_p95}s)"
    
    if (( $(echo "$current_p95 > $threshold_p95" | bc -l) )); then
      echo ""
      echo "❌ CRITICAL: Latency exceeded threshold!"
      echo "   Current P95: ${current_p95}s"
      echo "   Baseline P95: ${BASELINE_P95}s"
      echo "   Threshold: ${threshold_p95}s (+${LATENCY_THRESHOLD}%)"
      echo ""
      echo "🔄 Triggering automatic rollback..."
      
      # Trigger rollback
      if [ -f "./deploy.sh" ]; then
        ./deploy.sh --rollback
      else
        echo "⚠️  deploy.sh not found - manual rollback required"
      fi
      
      exit 1
    fi
  fi
  
  echo "   ✅ All checks passed"
  echo ""
  
  sleep 10
done
