import sharp, { type Metadata } from "sharp";

interface sizeNeed {
    w: 800 | 600,
    h: 800 | 600
}

export class Image {
    constructor(private buffer: Buffer, private readonly sizeNeed: sizeNeed){
        if (!Buffer.isBuffer(buffer)) {
            throw new TypeError("Image input must be a Buffer");
        }

        if (buffer.length === 0) {
            throw new Error("Image buffer is empty");
        }
    }
    async metaData(buffer: Buffer | undefined = undefined): Promise<Metadata> {
        buffer = !buffer ? this.buffer : buffer;
        return sharp(buffer).metadata();
    }

    async toWebp(): Promise<Buffer> {
        const output = await sharp(this.buffer)
            .resize(this.sizeNeed.w, this.sizeNeed.h, {
                fit: "cover",
                position: "centre",
            })
            .webp({ quality: 82 })
            .toBuffer();
        return output;
    }

    root(): Buffer {
        return this.buffer;
    }
}
