
export class ConcurrencyLimiter {
    private activeCount = 0;

    constructor(private readonly maxConcurrency: number) {
        if (!Number.isInteger(maxConcurrency) || maxConcurrency <= 0) {
            throw new Error("maxConcurrency must be a positive integer");
        }
    }

    tryAcquire(): (() => void) | null {
        if (this.activeCount >= this.maxConcurrency) {
            return null;
        }

        this.activeCount++;

        let released = false;

        return () => {
            // Không cho phép giải phóng cùng một slot hai lần
            if (released) return;

            released = true;
            --this.activeCount;
        };
    }

    getActiveCount(): number {
        return this.activeCount;
    }
}
