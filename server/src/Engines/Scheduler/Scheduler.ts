import { CircleQueue } from "../../classes/CircleQueue.class.js";
import { ConcurrencyLimiter } from "./ConcurrencyLimiter.scheduler.js";

interface QueueTask {
    execute: () => Promise<void>;
}

export class Scheduler {
    private queue: CircleQueue<QueueTask>;
    private limiter: ConcurrencyLimiter;

    constructor(limit: number, queue: number) {
        this.limiter = new ConcurrencyLimiter(limit);
        this.queue = new CircleQueue<QueueTask>(queue);
    }

    private pump(): void {
        while (!this.queue.isEmpty()) {
            const release = this.limiter.tryAcquire();

            if (!release) return;

            const task = this.queue.dequeue();

            if (!task) {
                release();
                return;
            }

            this.runTask(task, release);
        }
    }

    private runTask(
        task: QueueTask,
        release: () => void
    ): void {
        task.execute()
            .catch((error: unknown) => {
                console.error("Unexpected task error:", error);
            })
            .finally(() => {
                release();
                this.pump();
            });
    }

    submit<T>(job: () => Promise<T>): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            const task: QueueTask = {
                execute: async () => {
                    try {
                        const result = await job();
                        resolve(result);
                    } catch (error: unknown) {
                        reject(error);
                    }
                },
            };

            // Nếu queue đã có task chờ, giữ thứ tự FIFO.
            if (!this.queue.isEmpty()) {
                if (!this.queue.enqueue(task)) {
                    reject(new Error("Queue is full"));
                }

                return;
            }

            // Queue rỗng: thử lấy slot chạy ngay.
            const release = this.limiter.tryAcquire();

            if (release) {
                this.runTask(task, release);
                return;
            }

            // Hết slot: đưa task vào queue.
            if (!this.queue.enqueue(task)) {
                reject(new Error("Queue is full"));
            }
        });
    }
}