import assert from "node:assert/strict";
import test from "node:test";

import { CircleQueue } from "../classes/CircleQueue.class.js";

test("circle queue reports state and handles empty/full boundaries", () => {
    const queue = new CircleQueue<number>(2);

    assert.equal(queue.isEmpty(), true);
    assert.equal(queue.isFull(), false);
    assert.equal(queue.size(), 0);
    assert.equal(queue.peek(), undefined);
    assert.equal(queue.dequeue(), undefined);

    assert.equal(queue.enqueue(1), true);
    assert.equal(queue.enqueue(2), true);
    assert.equal(queue.isFull(), true);
    assert.equal(queue.enqueue(3), false);
    assert.equal(queue.peek(), 1);
    assert.equal(queue.size(), 2);
});

test("circle queue preserves FIFO order while wrapping around", () => {
    const queue = new CircleQueue<string>(3);

    queue.enqueue("one");
    queue.enqueue("two");
    queue.enqueue("three");
    assert.equal(queue.dequeue(), "one");
    assert.equal(queue.dequeue(), "two");
    assert.equal(queue.enqueue("four"), true);
    assert.equal(queue.enqueue("five"), true);
    assert.deepEqual(
        [queue.dequeue(), queue.dequeue(), queue.dequeue()],
        ["three", "four", "five"],
    );
    assert.equal(queue.isEmpty(), true);
});

test("circle queue requires a positive integer capacity", () => {
    assert.throws(() => new CircleQueue(0), /positive integer/);
    assert.throws(() => new CircleQueue(1.5), /positive integer/);
});
