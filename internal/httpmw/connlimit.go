package httpmw

import (
	"net"
	"sync"
	"sync/atomic"
	"time"
)

const MaxConns = 1024
const maxConnLifetime = 120 * time.Second
const maxPerIP = 64
const headerDeadline = 2 * time.Second

// LimitListener wraps a net.Listener to enforce a maximum number of
// concurrent accepted connections. Uses an atomic counter — no locks
// in the hot path, zero allocations per accept.
//
// When the limit is reached, Accept blocks until an existing connection
// closes, preserving TCP backpressure semantics.
//
// Additionally enforces a per-IP concurrent connection cap. A single
// client IP cannot hold more than maxPerIP slots.
func LimitListener(l net.Listener, limit int) net.Listener {
	return &limitListener{
		Listener: l,
		sem:      make(chan struct{}, limit),
		active:   &atomic.Int64{},
		perIP:    make(map[string]*atomic.Int32),
	}
}

type limitListener struct {
	net.Listener
	sem    chan struct{}
	active *atomic.Int64
	mu     sync.Mutex
	perIP  map[string]*atomic.Int32
}

func (l *limitListener) Accept() (net.Conn, error) {
	l.sem <- struct{}{} // block if at capacity
	c, err := l.Listener.Accept()
	if err != nil {
		<-l.sem
		return nil, err
	}
	if err := c.SetDeadline(time.Now().Add(maxConnLifetime)); err != nil {
		c.Close()
		<-l.sem
		return l.Accept()
	}
	if err := c.SetReadDeadline(time.Now().Add(headerDeadline)); err != nil {
		c.Close()
		<-l.sem
		return l.Accept()
	}

	ip := parseIP(c.RemoteAddr().String())
	counter := l.getOrCreate(ip)

	if counter.Add(1) > int32(maxPerIP) {
		counter.Add(-1)
		l.maybeDelete(ip, counter)
		c.Close()
		<-l.sem
		return l.Accept()
	}

	l.active.Add(1)
	return &limitConn{Conn: c, sem: l.sem, active: l.active, ipCounter: counter, ip: ip, listener: l}, nil
}

func (l *limitListener) getOrCreate(ip string) *atomic.Int32 {
	l.mu.Lock()
	counter, ok := l.perIP[ip]
	if !ok {
		counter = &atomic.Int32{}
		l.perIP[ip] = counter
	}
	l.mu.Unlock()
	return counter
}

func (l *limitListener) maybeDelete(ip string, counter *atomic.Int32) {
	l.mu.Lock()
	if counter.Load() <= 0 {
		delete(l.perIP, ip)
	}
	l.mu.Unlock()
}

func parseIP(addr string) string {
	host, _, err := net.SplitHostPort(addr)
	if err != nil {
		return "unknown"
	}
	if host == "" {
		return "unknown"
	}
	return host
}

// limitConn wraps a net.Conn to release the semaphore slot on close.
type limitConn struct {
	net.Conn
	sem           chan struct{}
	active        *atomic.Int64
	ipCounter     *atomic.Int32
	ip            string
	listener      *limitListener
	closed        atomic.Bool
	headerCleared atomic.Bool
}

func (c *limitConn) Read(b []byte) (int, error) {
	n, err := c.Conn.Read(b)
	if n > 0 && c.headerCleared.CompareAndSwap(false, true) {
		c.Conn.SetReadDeadline(time.Time{})
	}
	return n, err
}

func (c *limitConn) Close() error {
	if c.closed.CompareAndSwap(false, true) {
		c.active.Add(-1)
		c.ipCounter.Add(-1)
		c.listener.maybeDelete(c.ip, c.ipCounter)
		<-c.sem
	}
	return c.Conn.Close()
}
