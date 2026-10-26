import { createReadStream, type ReadStream } from "node:fs";
import { resolve, join } from "node:path";
import { ApiError } from "../../Classes/ApiError.js";

export class ImageDelivery {
    constructor(private readonly directory: string) {}

    read(fileName: string): ReadStream {
        // Chỉ chấp nhận tên file UUID.webp
        const validFileName =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/i;

        if (!validFileName.test(fileName)) {
            throw new ApiError(
                "INVALID_IMAGE_PATH",
                "Invalid image filename",
            );
        }

        const rootPath = resolve(this.directory);
        const filePath = resolve(join(rootPath, fileName));

        // Bảo đảm file nằm trực tiếp trong thư mục ảnh
        if (resolve(filePath, "..") !== rootPath) {
            throw new ApiError(
                "INVALID_IMAGE_PATH",
                "Invalid image path",
            );
        }

        return createReadStream(filePath);
    }
}
