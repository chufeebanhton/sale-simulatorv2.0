import { writeFile, mkdir, unlink } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { join, resolve, basename } from "node:path";

export class ImageStorage {
    async delete(directory: string, fileName: string): Promise<void> {
        // Chỉ chấp nhận tên file do hệ thống tạo
        if (!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}\.png$/i.test(fileName)) {
            throw new Error("Invalid image filename");
        }

        const filePath = resolve(directory, fileName);

        // Bảo đảm đường dẫn cuối cùng nằm trực tiếp trong thư mục ảnh
        if (basename(filePath) !== fileName || resolve(directory) !== resolve(filePath, "..")) {
            throw new Error("Invalid image path");
        }

        try {
            await unlink(filePath);
        } catch (error) {
            if (
                error instanceof Error &&
                "code" in error &&
                error.code === "ENOENT"
            ) {
                // File không tồn tại: không thể xóa
                throw new Error(`Image not found: ${fileName}`);
            }

            // EACCES, EPERM, EISDIR... được truyền lên caller
            throw error;
        }
    }

    async save(buffer: Buffer, directory: string): Promise<string> {
        if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
            throw new Error("Image buffer must not be empty");
        }

        await mkdir(directory, { recursive: true });

        const fileName = `${randomUUID()}.webp`;
        const filePath = join(directory, fileName);

        // "wx": tạo file mới, không ghi đè file đã tồn tại
        await writeFile(filePath, buffer, { flag: "wx" });

        return fileName;
    }
}
