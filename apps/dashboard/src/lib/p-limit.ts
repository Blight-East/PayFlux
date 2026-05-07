export function pLimit(concurrency: number) {
    const queue: (() => void)[] = [];
    let activeCount = 0;

    const next = () => {
        activeCount--;
        if (queue.length > 0) {
            queue.shift()!();
        }
    };

    return async <T>(fn: () => Promise<T>): Promise<T> => {
        if (activeCount >= concurrency) {
            await new Promise<void>((resolve) => queue.push(resolve));
        }
        activeCount++;
        try {
            return await fn();
        } finally {
            next();
        }
    };
}
