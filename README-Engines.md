# Engines — Usage Guide

A small collection of TypeScript utilities for image processing/storage, image delivery, product caching, and limiting concurrent asynchronous jobs.

## Requirements

- Node.js with TypeScript support/build tooling already configured in the parent project.
- `sharp` installed for image processing.
- Existing project modules referenced by the code:
  - `../../classes/CircleQueue.class.js`
  - `../../interfaces/Product.types.js`
- Compile TypeScript using the parent project's build configuration. Imports use `.js` extensions for Node ESM output.

## Modules

```text
Engines/
├── Imager/
│   ├── Imager.ts                 # Public saveImage() and update() functions
│   ├── Imager.deliver.ts         # Validates image filename and returns a read stream
│   └── Gears/
│       ├── Imager.processor.ts   # Sharp resize/conversion + metadata
│       ├── Imager.validator.ts   # Input/output validation
│       └── Imager.methods.ts     # Save/update/delete file operations
├── Scheduler/
│   ├── Scheduler.ts              # FIFO queue + concurrency-limited job execution
│   └── ConcurrencyLimiter.scheduler.ts
└── Storage/
    └── Storage.ts                # In-memory ProductCache
```

## 1. Image processing and storage

Import the public functions from `Imager.ts`:

```ts
import { saveImage, update } from "./Engines/Imager/Imager.js";
import { readFile } from "node:fs/promises";

const buffer = await readFile("./input.jpg");

const fileName = await saveImage(
  {
    buffer,
    sizeNeed: { w: 800, h: 800 },
  },
  "./uploads/images/products",
);

console.log(fileName); // UUID.webp
```

`BufferData` contains:

- `buffer`: raw image bytes as a Node.js `Buffer`.
- `sizeNeed.w` and `sizeNeed.h`: requested output dimensions. The current validator requires the final image to be exactly **800 × 800**, so use `{ w: 800, h: 800 }` with the current implementation.

Processing pipeline:

1. Validate the buffer exists and is no larger than 5 MiB.
2. Check the image signature.
3. Read metadata and validate format/dimensions/pixel count/page count.
4. Resize with `sharp` using `fit: "cover"` and convert to WebP at quality 82.
5. Validate the WebP output and save it with a UUID filename.
6. Return the generated filename, e.g. `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx.webp`.

Accepted input formats are JPEG, PNG, and WebP. Current validation limits are: 5 MiB file size, at least 200 × 200, at most 8000 × 8000, and at most 20 million pixels; animated/multi-page images are rejected.

### Updating an image

```ts
const newFileName = await update(
  { buffer: newBuffer, sizeNeed: { w: 800, h: 800 } },
  "./uploads/images/products/old-uuid.webp",
);
```

Pass the actual existing image path as the second argument. Review the current `ImageMethods.update()` implementation before relying on it in production: it deletes the old file before writing the replacement, and its temporary-file/path handling should be hardened to avoid losing the old image if writing fails.

## 2. Image delivery

`ImageDelivery` validates a filename and returns a Node.js read stream. It does not send an HTTP response itself.

```ts
import { ImageDelivery } from "./Engines/Imager/Imager.deliver.js";
import { pipeline } from "node:stream/promises";

const delivery = new ImageDelivery("./uploads/images/products");
const imageStream = delivery.read("xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx.webp");

// In an HTTP handler, stream to the response:
// res.writeHead(200, { "Content-Type": "image/webp" });
// await pipeline(imageStream, res);
```

The filename must be a UUID followed by `.webp`. The caller is responsible for mapping errors to HTTP statuses and handling stream errors/client disconnects. The included `test/image.server.ts` is an example standalone server on port 5400 with a maximum of 50 active streams.

## 3. Scheduler and concurrency limiter

The scheduler runs asynchronous jobs immediately when a concurrency slot is available. Otherwise it queues jobs in FIFO order, up to the configured queue capacity.

```ts
import { Scheduler } from "./Engines/Scheduler/Scheduler.js";

const scheduler = new Scheduler(20, 200); // 20 active jobs, queue capacity 200

const result = await scheduler.submit(async () => {
  // Perform asynchronous work here
  return await someAsyncOperation();
});
```

- `new Scheduler(maxConcurrency, queueCapacity)` configures active concurrency and waiting queue capacity.
- `submit(() => Promise<T>)` returns a `Promise<T>` that resolves with the job result or rejects if the job fails / queue is full.
- Queue order is FIFO. If the queue already contains waiting jobs, new jobs are queued behind them even if a slot becomes available during submission.
- `ConcurrencyLimiter.tryAcquire()` returns a release callback when a slot is available, or `null` when the limit has been reached. Call the callback once when work completes; repeated calls are guarded against.

The scheduler does not itself create HTTP `503` responses. The route/controller should catch a queue-full rejection and decide how to respond.

## 4. Product cache

`ProductCache` stores products in a `Map` keyed by the combination `${product._id}:${product.name}`.

```ts
import { ProductCache } from "./Engines/Storage/Storage.js";
import type { Product } from "./interfaces/Product.types.js";

const cache = new ProductCache(products as Product[]);

const isReady = cache.isExist();
const total = cache.size();
const pageOne = await cache.get(1, 9);
const created = await cache.post(newProduct);
```

- `isExist()` reports whether the cache has been initialized.
- `size()` returns the number of entries in the map.
- `get(page, limit)` returns a 1-based page of products. For example, `get(1, 9)` returns the first nine entries.
- `post(product)` inserts/replaces the cache entry and returns the stored product.
- `callBack(products)` loads/reloads entries from an array.

Note: because the key includes both `_id` and `name`, changing a product's name can create a second cache key unless the old key is removed. The current cache is in-memory only; it does not persist data to a database or external API.

## Tests / examples

The `Imager/test` folder contains exploratory scripts for processing a sample image, streaming delivery, and checking invalid/missing files. They are standalone TypeScript scripts rather than a unified test suite; run them using the TypeScript runner/build setup configured by the parent project.

## Implementation notes to review

- `ImageMethods.delete()` currently validates `.png` filenames, while saved images are `.webp`; align this before using delete for generated images.
- `ImageDelivery` only accepts UUID `.webp` names. Make sure route validation and the stored filename format match this contract.
- `ImageMethods.update()` should ideally write a temporary file in the same directory, then atomically rename it over the old file; avoid deleting the original before a successful write.
- `ProductCache.get()` should validate that `page` and `limit` are positive integers. Its current check permits `limit = 0` and non-integer values.
- `ProductCache` uses a composite key. If `_id` is guaranteed unique, consider using only `_id` as the key for simpler updates.
