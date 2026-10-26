import {
    writeFile,
    mkdir,
    unlink,
    rename,
} from "node:fs/promises";

import { randomUUID } from "node:crypto";
import { join, resolve, basename } from "node:path";

import { ApiError } from "../../../classes/ApiError.js";

export class ImageMethods {
    private isValidFileName(fileName: string): boolean {
        return /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}\.webp$/i.test(fileName);
    }

    async delete(
        directory: string,
        fileName: string,
    ): Promise<void> {
        if (!this.isValidFileName(fileName)) {
            throw new ApiError(
                "INVALID_IMAGE_PATH",
                "Invalid image filename",
            );
        }

        const rootPath = resolve(directory);
        const filePath = resolve(rootPath, fileName);

        if (
            basename(filePath) !== fileName ||
            resolve(filePath, "..") !== rootPath
        ) {
            throw new ApiError(
                "INVALID_IMAGE_PATH",
                "Invalid image path",
            );
        }

        try {
            await unlink(filePath);
        } catch (error: unknown) {
            if (
                typeof error === "object" &&
                error !== null &&
                "code" in error &&
                error.code === "ENOENT"
            ) {
                throw new ApiError(
                    "IMAGE_NOT_FOUND",
                    "Image not found",
                    { fileName },
                );
            }

            throw new ApiError(
                "IMAGE_STORAGE_FAILED",
                "Failed to delete image",
            );
        }
    }

    async save(
        buffer: Buffer,
        directory: string,
    ): Promise<string> {
        if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
            throw new ApiError(
                "INVALID_IMAGE",
                "Image buffer must not be empty",
            );
        }

        const rootPath = resolve(directory);
        const fileName = `${randomUUID()}.webp`;
        const filePath = join(rootPath, fileName);

        try {
            await mkdir(rootPath, { recursive: true });
            await writeFile(filePath, buffer, { flag: "wx" });
            return fileName;
        } catch {
            throw new ApiError(
                "IMAGE_STORAGE_FAILED",
                "Failed to save image",
            );
        }
    }

    async update(
        buffer: Buffer,
        imgPath: string,
    ): Promise<string> {
        if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
            throw new ApiError(
                "INVALID_IMAGE",
                "Image buffer must not be empty",
            );
        }

        const tempPath = `${imgPath}.${randomUUID()}.tmp`;

        try {
            // Ghi ảnh mới vào file tạm trước.
            await writeFile(tempPath, buffer, { flag: "wx" });

            // Thay thế ảnh cũ sau khi ghi file tạm thành công.
            await rename(tempPath, imgPath);
            return imgPath;
        } catch (error: unknown) {
            // Dọn file tạm nếu thao tác thất bại.
            try {
                await unlink(tempPath);
            } catch {
                // File tạm có thể chưa được tạo.
            }

            if (
                typeof error === "object" &&
                error !== null &&
                "code" in error &&
                error.code === "ENOENT"
            ) {
                throw new ApiError(
                    "IMAGE_NOT_FOUND",
                    "Image path or parent directory not found",
                );
            }

            throw new ApiError(
                "IMAGE_STORAGE_FAILED",
                "Failed to update image",
            );
        }
    }
}
