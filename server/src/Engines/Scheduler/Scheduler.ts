
import { CircleQueue } from "../../classes/CircleQueue.class.js";
import { ConcurrencyLimiter } from "./ConcurrencyLimiter.scheduler.js";
import { ApiError } from "../../classes/ApiError.js";

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
        release: () => void,
    ): void {
        void task.execute()
            .catch((error: unknown) => {
                // Lỗi bất ngờ bên trong execute.
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
                        resolve(await job());
                    } catch (error: unknown) {
                        reject(error);
                    }
                },
            };

            // Giữ thứ tự FIFO nếu đã có task chờ.
            if (!this.queue.isEmpty()) {
                if (!this.queue.enqueue(task)) {
                    reject(
                        new ApiError(
                            "QUEUE_FULL",
                            "Request queue is full",
                        ),
                    );
                }

                return;
            }

            // Thử chạy ngay nếu còn slot.
            const release = this.limiter.tryAcquire();

            if (release) {
                this.runTask(task, release);
                return;
            }

            // Hết slot thì đưa vào queue.
            if (!this.queue.enqueue(task)) {
                reject(
                    new ApiError(
                        "QUEUE_FULL",
                        "Request queue is full",
                    ),
                );
            }
        });
    }
}
