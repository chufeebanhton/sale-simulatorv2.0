import sharp, { type Metadata } from "sharp";
import { BufferData } from "../Imager.js";

export class ImageProcessor {
    constructor(private data: BufferData){
        if (!Buffer.isBuffer(data.buffer)) {
            throw new TypeError("Image input must be a Buffer");
        }

        if (data.buffer.length === 0) {
            throw new Error("Image buffer is empty");
        }
    }
    async metaData(buffer: Buffer | undefined = undefined): Promise<Metadata> {
        buffer = !buffer ? this.data.buffer : buffer;
        return sharp(buffer).metadata();
    }

    async toWebp(): Promise<Buffer> {
        const output = await sharp(this.data.buffer)
            .resize(this.data.sizeNeed.w, this.data.sizeNeed.h, {
                fit: "cover",
                position: "centre",
            })
            .webp({ quality: 82 })
            .toBuffer();
        return output;
    }

    root(): Buffer {
        return this.data.buffer;
    }
}
