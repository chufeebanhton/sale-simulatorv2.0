import { Image } from "./Image.class.js"; // Image property
import { ImageValidator } from "./Imager.validator.js";
import { ImageStorage } from "./Imager.storage.js";
import { readFile } from "node:fs/promises";

const fakeImage = await readFile("./68D4A0B1-52CA-4A7D-837C-5034E32F3500_1_105_c.jpeg");

// const fakeImage = Buffer.from(
//     "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC",
//     "base64"
// );
try {
    const image: Image = new Image(fakeImage, {w: 800, h: 800});
    const validator: ImageValidator = new ImageValidator();
    const imageStorage: ImageStorage = new ImageStorage();
    validator.validateBuffer(image.root());
    validator.validateSignature(image.root());
    validator.validateMetadata(await image.metaData());

    const output = await image.toWebp();

    const outputMetadata = await image.metaData(output);

    validator.validateOutput(output, outputMetadata);

    const fileName = await imageStorage.save(output, "../../../uploads/images/products/indexs");
    console.log(fileName);
} catch(error) {
    console.error(error);
}
