import { ImageProcessor } from "./Gears/Imager.processor.js"; // Image property
import { ImageValidator } from "./Gears/Imager.validator.js";
import { ImageMethods } from "./Gears/Imager.methods.js";

export interface BufferData {
    buffer: Buffer,
    sizeNeed: {
        w: number | 800 | 600,
        h: number | 800 | 600
    }
}

export async function saveImage(bufferData: BufferData, path: string): Promise<string> {
    try {
        const image: ImageProcessor = new ImageProcessor(bufferData);
        const validator: ImageValidator = new ImageValidator();
        const imageStorage: ImageMethods = new ImageMethods();

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

export async function update(bufferData: BufferData, imgPath: string): Promise<string> {
    try {
        const image: ImageProcessor = new ImageProcessor(bufferData);
        const validator: ImageValidator = new ImageValidator();
        const imageStorage: ImageMethods = new ImageMethods();

        validator.validateBuffer(image.root());
        validator.validateSignature(image.root());
        validator.validateMetadata(await image.metaData());

        const output = await image.toWebp();
        const outputMetadata = await image.metaData(output);

        validator.validateOutput(output, outputMetadata);
        
        const fileName = await imageStorage.update(output, imgPath);
        return fileName;
    } catch(error) {
        throw error;
    }
}