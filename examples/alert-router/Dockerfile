# Pin to specific version for reproducibility and security
FROM golang:1.21.6-alpine AS builder

WORKDIR /app

COPY go.mod ./
RUN go mod download 2>/dev/null || true

COPY main.go .

RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o alert-router .

# Use pinned minimal runtime image
FROM alpine:3.19.1

RUN apk --no-cache add ca-certificates

WORKDIR /app

COPY --from=builder /app/alert-router .

# Already running as non-root (security best practice)
USER nobody:nobody

ENTRYPOINT ["/app/alert-router"]
