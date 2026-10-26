import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import sharp from "sharp";

import { ApiError } from "../classes/ApiError.js";
import { ConcurrencyLimiter } from "../Engines/Scheduler/ConcurrencyLimiter.scheduler.js";
import { ImageDelivery } from "../Engines/Imager/Imager.deliver.js";
import { ImageProcessor } from "../Engines/Imager/Gears/Imager.processor.js";
import { ImageValidator } from "../Engines/Imager/Gears/Imager.validator.js";
import { ImageMethods } from "../Engines/Imager/Gears/Imager.methods.js";
import type { BufferData } from "../Engines/Imager/Imager.js";

const sizeNeed = { w: 800, h: 800 };

async function createImage(format: "png" | "webp" = "png"): Promise<Buffer> {
    const image = sharp({
        create: {
            width: 320,
            height: 240,
            channels: 3,
            background: { r: 20, g: 80, b: 120 },
        },
    });
    return format === "png" ? image.png().toBuffer() : image.webp().toBuffer();
}

test("concurrency limiter validates, acquires, and releases slots once", () => {
    assert.throws(
        () => new ConcurrencyLimiter(0),
        (error: unknown) =>
            error instanceof ApiError &&
            error.code === "INVALID_CONCURRENCY_LIMIT",
    );

    const limiter = new ConcurrencyLimiter(1);
    const release = limiter.tryAcquire();
    assert.equal(typeof release, "function");
    assert.equal(limiter.getActiveCount(), 1);
    assert.equal(limiter.tryAcquire(), null);

    release?.();
    release?.();
    assert.equal(limiter.getActiveCount(), 0);
    assert.equal(typeof limiter.tryAcquire(), "function");
});

test("image processor reads metadata, exposes source bytes, and converts to WebP", async () => {
    const input = await createImage();
    const data: BufferData = { buffer: input, sizeNeed };
    const processor = new ImageProcessor(data);

    assert.equal(processor.root(), input);
    assert.equal((await processor.metaData()).format, "png");

    const output = await processor.toWebp();
    const metadata = await sharp(output).metadata();
    assert.equal(metadata.format, "webp");
    assert.equal(metadata.width, 800);
    assert.equal(metadata.height, 800);
});

test("image processor rejects empty buffers and malformed image metadata", async () => {
    assert.throws(
        () => new ImageProcessor({ buffer: Buffer.alloc(0), sizeNeed }),
        (error: unknown) => error instanceof ApiError && error.code === "INVALID_IMAGE",
    );
    await assert.rejects(
        new ImageProcessor({ buffer: Buffer.from("not image"), sizeNeed }).metaData(),
        (error: unknown) =>
            error instanceof ApiError &&
            error.code === "IMAGE_PROCESSING_FAILED",
    );
});

test("image validator accepts valid images and rejects invalid input and output", async () => {
    const validator: ImageValidator = new ImageValidator();
    const png = await createImage();
    validator.validateBuffer(png);
    validator.validateSignature(png);
    validator.validateMetadata(await sharp(png).metadata());

    assert.throws(
        () => validator.validateBuffer(Buffer.alloc(0)),
        (error: unknown) => error instanceof ApiError && error.code === "INVALID_IMAGE",
    );
    assert.throws(
        () => validator.validateSignature(Buffer.from("invalid")),
        (error: unknown) => error instanceof ApiError && error.code === "INVALID_IMAGE",
    );
    const validMetadata = await sharp(png).metadata();
    assert.throws(
        () => validator.validateMetadata({ ...validMetadata, format: "gif" }),
        (error: unknown) => error instanceof ApiError && error.code === "INVALID_IMAGE",
    );

    const output = await sharp(png).resize(800, 800).webp().toBuffer();
    validator.validateOutput(output, await sharp(output).metadata());
    const inputMetadata = await sharp(png).metadata();
    assert.throws(
        () => validator.validateOutput(png, inputMetadata),
        (error: unknown) =>
            error instanceof ApiError &&
            error.code === "IMAGE_PROCESSING_FAILED",
    );
});

test("image storage saves, updates, deletes, and rejects invalid paths", async (t) => {
    const directory = await mkdtemp(join(tmpdir(), "image-methods-"));
    t.after(() => rm(directory, { recursive: true, force: true }));

    const methods = new ImageMethods();
    const fileName = await methods.save(await createImage("webp"), directory);
    assert.match(fileName, /^[\da-f-]{36}\.webp$/i);

    const imagePath = join(directory, fileName);
    const replacement = await createImage("webp");
    assert.equal(await methods.update(replacement, imagePath), imagePath);
    assert.deepEqual(await readFile(imagePath), replacement);

    await methods.delete(directory, fileName);
    await assert.rejects(
        readFile(imagePath),
        (error: NodeJS.ErrnoException) => error.code === "ENOENT",
    );
    await assert.rejects(
        methods.delete(directory, "../not-an-image"),
        (error: unknown) =>
            error instanceof ApiError && error.code === "INVALID_IMAGE_PATH",
    );
    await assert.rejects(
        methods.save(Buffer.alloc(0), directory),
        (error: unknown) => error instanceof ApiError && error.code === "INVALID_IMAGE",
    );
});

test("image delivery validates UUID filenames and streams an existing file", async (t) => {
    const directory = await mkdtemp(join(tmpdir(), "image-delivery-"));
    t.after(() => rm(directory, { recursive: true, force: true }));

    const fileName = "12345678-1234-4234-8234-123456789abc.webp";
    const contents = await createImage("webp");
    await writeFile(join(directory, fileName), contents);

    const delivery = new ImageDelivery(directory);
    const stream = delivery.read(fileName);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
    }
    assert.deepEqual(Buffer.concat(chunks), contents);

    assert.throws(
        () => delivery.read("../outside.webp"),
        (error: unknown) =>
            error instanceof ApiError && error.code === "INVALID_IMAGE_PATH",
    );
});
