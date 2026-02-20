package httpmw

import "net/http"

const maxBodyBytes = 10 << 20 // 10 MB

// BodyLimit wraps a handler with a global request body size cap.
// Bodies exceeding maxBodyBytes are rejected by http.MaxBytesReader,
// which returns HTTP 413 and terminates the connection.
func BodyLimit(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		r.Body = http.MaxBytesReader(w, r.Body, maxBodyBytes)
		next.ServeHTTP(w, r)
	})
}
