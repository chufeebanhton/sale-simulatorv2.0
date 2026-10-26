import sharp, { type Metadata } from "sharp";
import { BufferData } from "../Imager.js";
import { ApiError } from "../../../Classes/ApiError.js";

export class ImageProcessor {
    constructor(private readonly data: BufferData) {
        if (!Buffer.isBuffer(data.buffer)) {
            throw new ApiError(
                "INVALID_IMAGE",
                "Image input must be a Buffer",
            );
        }

        if (data.buffer.length === 0) {
            throw new ApiError(
                "INVALID_IMAGE",
                "Image buffer is empty",
            );
        }
    }

    async metaData(
        buffer: Buffer = this.data.buffer,
    ): Promise<Metadata> {
        try {
            return await sharp(buffer).metadata();
        } catch {
            throw new ApiError(
                "IMAGE_PROCESSING_FAILED",
                "Failed to read image metadata",
            );
        }
    }

    async toWebp(): Promise<Buffer> {
        try {
            return await sharp(this.data.buffer)
                .resize(
                    this.data.sizeNeed.w,
                    this.data.sizeNeed.h,
                    {
                        fit: "cover",
                        position: "centre",
                    },
                )
                .webp({ quality: 82 })
                .toBuffer();
        } catch {
            throw new ApiError(
                "IMAGE_PROCESSING_FAILED",
                "Failed to process image",
            );
        }
    }

    root(): Buffer {
        return this.data.buffer;
    }
}