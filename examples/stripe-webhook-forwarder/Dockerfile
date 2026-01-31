# Pin to specific version for reproducibility and security
FROM golang:1.21.6-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY main.go .
RUN go build -o forwarder .

# Use pinned minimal runtime image
FROM alpine:3.19.1

RUN apk --no-cache add ca-certificates

WORKDIR /app

COPY --from=builder /app/forwarder .

# Run as non-root user for security
USER nobody:nobody

EXPOSE 8081
CMD ["./forwarder"]
