import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import sharp from "sharp";

import { removeImage, updateImage, saveImage } from "./Imager.js";
import { ApiError } from "../../classes/ApiError.js";

const sizeNeed = { w: 800, h: 800 };

async function createValidImage(): Promise<Buffer> {
    return sharp({
        create: {
            width: 320,
            height: 240,
            channels: 3,
            background: { r: 70, g: 130, b: 180 },
        },
    })
        .png()
        .toBuffer();
}

test("saveImage stores an 800x800 WebP image", async (t) => {
    const directory = await mkdtemp(join(tmpdir(), "imager-save-"));
    t.after(() => rm(directory, { recursive: true, force: true }));

    const fileName = await saveImage(
        { buffer: await createValidImage(), sizeNeed },
        directory,
    );

    assert.match(
        fileName,
        /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}\.webp$/i,
    );

    const output = await readFile(join(directory, fileName));
    const metadata = await sharp(output).metadata();
    assert.equal(metadata.format, "webp");
    assert.equal(metadata.width, 800);
    assert.equal(metadata.height, 800);
});

test("saveImage rejects an invalid image without saving a file", async (t) => {
    const directory = await mkdtemp(join(tmpdir(), "imager-invalid-"));
    t.after(() => rm(directory, { recursive: true, force: true }));

    await assert.rejects(
        saveImage({ buffer: Buffer.from("not an image"), sizeNeed }, directory),
        (error: unknown) =>
            error instanceof ApiError && error.code === "INVALID_IMAGE",
    );

    assert.deepEqual(await readdir(directory), []);
});

test("removeImage deletes a previously saved image", async (t) => {
    const directory = await mkdtemp(join(tmpdir(), "imager-remove-"));
    t.after(() => rm(directory, { recursive: true, force: true }));

    const fileName = await saveImage(
        { buffer: await createValidImage(), sizeNeed },
        directory,
    );

    await removeImage(fileName, directory);
    await assert.rejects(
        readFile(join(directory, fileName)),
        (error: NodeJS.ErrnoException) => error.code === "ENOENT",
    );
});

test("update replaces an existing image with processed WebP data", async (t) => {
    const directory = await mkdtemp(join(tmpdir(), "imager-update-"));
    t.after(() => rm(directory, { recursive: true, force: true }));

    const imagePath = join(directory, "product.webp");
    await writeFile(imagePath, Buffer.from("old image"));

    const resultPath = await updateImage(
        { buffer: await createValidImage(), sizeNeed },
        imagePath,
    );

    assert.equal(resultPath, imagePath);
    const metadata = await sharp(await readFile(imagePath)).metadata();
    assert.equal(metadata.format, "webp");
    assert.equal(metadata.width, 800);
    assert.equal(metadata.height, 800);
});

test("update reports a missing destination directory", async (t) => {
    const directory = await mkdtemp(join(tmpdir(), "imager-missing-"));
    t.after(() => rm(directory, { recursive: true, force: true }));

    await assert.rejects(
        updateImage(
            { buffer: await createValidImage(), sizeNeed },
            join(directory, "missing", "product.webp"),
        ),
        (error: unknown) =>
            error instanceof ApiError && error.code === "IMAGE_NOT_FOUND",
    );
});
