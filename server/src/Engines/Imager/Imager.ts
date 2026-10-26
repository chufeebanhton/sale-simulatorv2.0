import { ImageProcessor } from "./Gears/Imager.processor.js";
import { ImageValidator } from "./Gears/Imager.validator.js";
import { ImageMethods } from "./Gears/Imager.methods.js";

export interface BufferData {
    buffer: Buffer;
    sizeNeed: {
        w: number;
        h: number;
    };
}

const validator: ImageValidator = new ImageValidator();
const imageStorage: ImageMethods = new ImageMethods();

async function processImage(bufferData: BufferData): Promise<Buffer> {
    const image: ImageProcessor = new ImageProcessor(bufferData);

    // Validate input
    const imageRoot: Buffer = image.root();
    validator.validateBuffer(imageRoot);
    validator.validateSignature(imageRoot);
    validator.validateMetadata(await image.metaData());

    // Process to WebP
    const output = await image.toWebp();
    const outputMetadata = await image.metaData(output);

    // Validate output
    validator.validateOutput(output, outputMetadata);

    return output;
}

export async function saveImage(
    bufferData: BufferData,
    path: string,
): Promise<string> {
    const output = await processImage(bufferData);
    return imageStorage.save(output, path);
}

export async function updateImage(
    bufferData: BufferData,
    imgPath: string,
): Promise<string> {
    const output = await processImage(bufferData);
    return imageStorage.update(output, imgPath);
}

export async function removeImage(
    fileName: string,
    directory: string,
): Promise<void> {
    await imageStorage.delete(directory, fileName);
}