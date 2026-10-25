import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { ImageDelivery } from "../Imager.deliver.js";

const delivery = new ImageDelivery(
    "../../../../uploads/images/products/indexs"
);

try {
    const stream = delivery.read(
        "10acb51c-401e-4e5a-81dc-e42190e2d11@.webp"
    );

    await pipeline(
        stream,
        createWriteStream("./test-output.webp")
    );

    console.log("Stream test successful");
} catch (error) {
    console.error("Stream test failed:", error);
}