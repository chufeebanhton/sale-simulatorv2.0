import { createReadStream, type ReadStream } from "node:fs";
import { resolve, join } from "node:path";

export class ImageDelivery {
    constructor(private readonly directory: string) {}

    read(fileName: string): ReadStream {
        // Chỉ chấp nhận tên file UUID.webp
        const validFileName =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/i; // Định dạng UUID.webp

        if (!validFileName.test(fileName)) {
            throw new Error("Invalid image filename");
        }

        const rootPath = resolve(this.directory);
        const filePath = resolve(join(rootPath, fileName)); // resolve đường dẫn tuyệt đối

        // Bảo đảm file nằm trực tiếp trong thư mục ảnh
        if (resolve(filePath, "..") !== rootPath) {
            throw new Error("Invalid image path");
        }
        return createReadStream(filePath);
    }
}

/*
Lỗi xảy ra ở đâu?	                             Kết quả xử lý
Method không phải GET	                             405
URL sai định dạng	                                 400
File không tồn tại, chưa gửi header	                 404
Lỗi đọc file trước khi gửi header	       Thường là 500
Lỗi sau khi đã gửi 200	                   Không thể đổi status; kết thúc hoặc hủy response
Client ngắt kết nối	                       Dừng stream, giải phóng slot và không nhất thiết xem là lỗi server
*/