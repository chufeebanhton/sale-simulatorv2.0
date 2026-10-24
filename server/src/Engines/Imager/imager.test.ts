// import test from "node:test";
// import { ImageStoraging } from "./Imager.storage.js";
// import { ImageProcessor } from "./Imager.processor.js";

// const fakeImage = Buffer.from(
//     "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC",
//     "base64"
// );

// const uploadPath = "../../../uploads/products/images";

// const imageStorage = new ImageStoraging();
// const imagerProcessor = new ImageProcessor();

// async function createProduct(shouldFail: boolean): Promise<void> {
//     if (shouldFail) {
//         throw new Error("Database error");
//     }

//     console.log("Product created successfully");
// }

// async function converted(shouldFail: boolean): Promise<void> {
//     if (shouldFail) {
//         throw new Error("Convert Error");
//     }

//     console.log("Convert successfuly");
// }


// async function testUpload(shouldFail: boolean): Promise<void> {
//     const fileName = await imageStorage.save(fakeImage, uploadPath);

//     try {
//         await createProduct(shouldFail);
//         console.log("Image kept:", fileName);
//     } catch (error) {
//         await imageStorage.delete(uploadPath, fileName);
//         console.log("Image deleted:", fileName);
//         throw error;
//     }
// }

// async function testToWebp(shouldFail: boolean): Promise<void> {
//     const toWebp = await imagerProcessor.toWebp(fakeImage);
//     try {
//         await converted(shouldFail)
//         console.log(typeof toWebp);
//     } catch(error) {
//         throw error;
//     }
// }

// testToWebp(false);
// // testUpload(true);

// imagerProcessor.Dimession(fakeImage);