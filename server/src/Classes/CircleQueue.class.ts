export class CircleQueue<T> {
    private items: T[];
    private front: number = 0;
    private rare: number = 0;
    private count: number = 0;
    private capacity: number;
    constructor(capacity: number) {
        if (!Number.isInteger(capacity) || capacity <= 0) {
            throw new Error("Capacity must be a positive integer");
        }
        this.items = new Array(capacity);
        this.capacity = capacity;
    }
    enqueue(item: T): boolean {
        if (this.count >= this.capacity) return false;

        this.items[this.rare % this.capacity] = item;
        this.rare++;
        this.count++;

        return true;
    }

    dequeue(): T | undefined {
       if (this.count === 0) return undefined;

        const index = this.front % this.capacity;
        const item = this.items[index];

        this.items[index] = undefined as T;
        this.front++;
        this.count--;

        return item;
    }

    peek(): T | undefined {
         return (this.count) ? this.items[this.front % this.capacity] : undefined;
    }

    size(): number {
        return this.count;
    }

    isEmpty(): boolean {
        return this.count === 0;
    }
}