import { Image } from "../Gears.saver/Imager.class.js"; // Image property
import { ImageValidator } from "../Gears.saver/Imager.validator.js";
import { ImageStorage } from "../Gears.saver/Imager.storage.js";
import { readFile } from "node:fs/promises";

export interface BufferData {
    buffer: Buffer,
    sizeNeed: {
        w: number | 800 | 600,
        h: number | 800 | 600
    }
}

export async function ImageFlower(bufferData: BufferData, path: string): Promise<string> {
    try {
        const image: Image = new Image(bufferData);
        const validator: ImageValidator = new ImageValidator();
        const imageStorage: ImageStorage = new ImageStorage();
        validator.validateBuffer(image.root());
        validator.validateSignature(image.root());
        validator.validateMetadata(await image.metaData());
        const output = await image.toWebp();
        const outputMetadata = await image.metaData(output);
        validator.validateOutput(output, outputMetadata);
        const fileName = await imageStorage.save(output, path);
        return fileName;
    } catch(error) {
        throw error;
    }
}

const fakeImage = await readFile("./68D4A0B1-52CA-4A7D-837C-5034E32F3500_1_105_c.jpeg");

// const fakeImage = Buffer.from(
//     "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC",
//     "base64"
// );

const flow = await ImageFlower({
    buffer: fakeImage,
    sizeNeed: {
        w: 800,
        h: 800
    }
}, "../../../../uploads/images/products/indexs")

console.log(flow)
