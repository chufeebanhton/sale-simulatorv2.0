import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { ImageDelivery } from "../Imager.deliver.js";

const delivery = new ImageDelivery(
    "../../../uploads/images/products/indexs"
);

async function testInvalidFilename() {
    console.log("\n--- Test 1: Invalid filename ---");

    try {
        delivery.read("../secret.txt");

        console.error("FAIL: Filename should have been rejected");
    } catch (error) {
        console.log("PASS: Filename rejected");
        console.error(error);
    }
}

async function testMissingFile() {
    console.log("\n--- Test 2: File does not exist ---");

    try {
        const stream = delivery.read(
            "00000000-0000-4000-8000-000000000000.webp"
        );

        await pipeline(
            stream,
            createWriteStream("./missing-output.webp")
        );

        console.error("FAIL: Expected a missing-file error");
    } catch (error) {
        console.log("PASS: Missing-file error caught");
        console.error(error);
    }
}

await testInvalidFilename();
await testMissingFile();

/**
 * <img src="http://localhost:4000/images/abc123.webp">
    ↓
Image Server :4000
    ↓
ImageDelivery
    ↓
createReadStream()
    ↓
Client nhận bytes của ảnh
 */
