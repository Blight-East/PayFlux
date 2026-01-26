package evidence

import (
	"sync/atomic"
	"time"
)

var (
	DegradedCount          uint64
	DropCount              uint64
	ContractViolationCount uint64
	LastGoodAt             atomic.Value // stores time.Time
)

func init() {
	LastGoodAt.Store(time.Time{})
}

func GetLastGoodAt() time.Time {
	return LastGoodAt.Load().(time.Time)
}

func SetLastGoodAt(t time.Time) {
	LastGoodAt.Store(t)
}
