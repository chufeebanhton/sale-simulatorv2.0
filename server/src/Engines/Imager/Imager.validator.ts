
import { Metadata } from "sharp";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_WIDTH = 8000;
const MAX_HEIGHT = 8000;
const MAX_PIXELS = 20_000_000;
const MIN_WIDTH = 200;
const MIN_HEIGHT = 200;

const ALLOWED_FORMATS = new Set([
    "jpeg",
    "png",
    "webp",
]);

export class ImageValidator {
    validateBuffer(buffer: Buffer): asserts buffer is Buffer {
        if (!Buffer.isBuffer(buffer)) {
            throw new Error("Image must be a Buffer");
        }

        if (buffer.length === 0) {
            throw new Error("Image buffer is empty");
        }

        if (buffer.length > MAX_FILE_SIZE) {
            throw new Error("Image exceeds the 5 MB limit");
        }
    }

    validateSignature(buffer: Buffer): void {
        const signatures: Record<string, number[]> = {
            png: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
            jpeg: [0xff, 0xd8, 0xff],
            webp: [0x52, 0x49, 0x46, 0x46],
        };

        const matches = Object.entries(signatures).some(
            ([format, signature]) => {
                if (format === "webp") {
                    return (
                        buffer.length >= 12 &&
                        signature.every(
                            (byte, index) => buffer[index] === byte
                        ) &&
                        buffer.toString("ascii", 8, 12) === "WEBP"
                    );
                }

                return (
                    buffer.length >= signature.length &&
                    signature.every(
                        (byte, index) => buffer[index] === byte
                    )
                );
            }
        );

        if (!matches) {
            throw new Error("Unsupported or invalid image signature");
        }
    }

    validateMetadata(metadata: Metadata): void {
        const { format, width, height, pages } = metadata;

        if (!format || !ALLOWED_FORMATS.has(format)) {
            throw new Error("Unsupported image format");
        }
        
        if (width < MIN_WIDTH || height < MIN_HEIGHT) {
            throw new Error(
                `Image dimensions must be at least ${MIN_WIDTH}x${MIN_HEIGHT}`
            );
        }

        if (
            !Number.isInteger(width) ||
            !Number.isInteger(height) ||
            !width ||
            !height ||
            width <= 0 ||
            height <= 0
        ) {
            throw new Error("Invalid image dimensions");
        }

        if (width > MAX_WIDTH || height > MAX_HEIGHT) {
            throw new Error("Image dimensions exceed the limit");
        }

        if (width * height > MAX_PIXELS) {
            throw new Error("Image exceeds the 20 megapixel limit");
        }

        if (pages !== undefined && pages > 1) {
            throw new Error("Animated or multi-page images are not allowed");
        }
    }

    validateOutput(buffer: Buffer, metadata: Metadata): void {
        if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
            throw new Error("Processed image buffer is invalid");
        }

        if (metadata.format !== "webp") {
            throw new Error("Output image must be WebP");
        }

        if (metadata.width !== 800 || metadata.height !== 800) {
            throw new Error("Output image must be 800x800");
        }
    }
}