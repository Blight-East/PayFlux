# Build stage
FROM golang:1.25.5-alpine AS builder

WORKDIR /app

# Install git for go mod download
RUN apk add --no-cache git

# Copy go mod files first for caching
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY *.go ./

# Build binary
RUN CGO_ENABLED=0 GOOS=linux go build -o payflux .

# Runtime stage
FROM alpine:3.19

WORKDIR /app

# Install ca-certificates for HTTPS
RUN apk add --no-cache ca-certificates

# Create dedicated non-root user with fixed UID/GID for deterministic behavior
RUN addgroup -g 1000 payflux && \
    adduser -D -u 1000 -G payflux payflux

# Copy binary from builder
COPY --from=builder /app/payflux .

# Expose port
EXPOSE 8080

# Run as dedicated non-root user (more auditable than 'nobody')
USER payflux:payflux

# Run
CMD ["./payflux"]
