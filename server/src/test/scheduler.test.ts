import assert from "node:assert/strict";
import test from "node:test";

import { Scheduler } from "../Engines/Scheduler/Scheduler.js";
import { ApiError } from "../classes/ApiError.js";

function deferred<T = void>(): {
    promise: Promise<T>;
    resolve: (value: T) => void;
} {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((resolvePromise) => {
        resolve = resolvePromise;
    });
    return { promise, resolve };
}

test("scheduler enforces concurrency, preserves queued order, and rejects excess work", async () => {
    const scheduler = new Scheduler(1, 2);
    const gate = deferred();
    const started: number[] = [];

    const first = scheduler.submit(async () => {
        started.push(1);
        await gate.promise;
        return 1;
    });
    const second = scheduler.submit(async () => {
        started.push(2);
        return 2;
    });
    const third = scheduler.submit(async () => {
        started.push(3);
        return 3;
    });
    const overflow = scheduler.submit(async () => 4);

    await assert.rejects(
        overflow,
        (error: unknown) => error instanceof ApiError && error.code === "QUEUE_FULL",
    );
    assert.deepEqual(started, [1]);

    gate.resolve();
    assert.deepEqual(await Promise.all([first, second, third]), [1, 2, 3]);
    assert.deepEqual(started, [1, 2, 3]);
});

test("scheduler rejects a failed job and continues queued work", async () => {
    const scheduler = new Scheduler(1, 1);
    const gate = deferred();

    const failedJob = scheduler.submit(async () => {
        await gate.promise;
        throw new Error("job failed");
    });
    const followingJob = scheduler.submit(async () => "completed");

    gate.resolve();

    await assert.rejects(failedJob, /job failed/);
    assert.equal(await followingJob, "completed");
});
