
import type { IncomingMessage } from "node:http";
import { Readable } from "node:stream";
import { ApiError } from "../../classes/ApiError.js";

const MAX_BODY_SIZE = 6 * 1024 * 1024; // 6 MB

export async function getBody(req: IncomingMessage): Promise<FormData> {
    const contentType = req.headers["content-type"];

    if (!contentType?.toLowerCase().startsWith("multipart/form-data;")) {
        throw new ApiError(
            "INVALID_BODY",
            "Content-Type must be multipart/form-data",
        );
    }

    const contentLength = Number(req.headers["content-length"]);

    if (
        Number.isFinite(contentLength) &&
        contentLength > MAX_BODY_SIZE
    ) {
        throw new ApiError(
            "IMAGE_TOO_LARGE",
            "Request body exceeds the allowed size",
        );
    }

    try {
        const request = new Request("http://localhost", {
            method: req.method,
            headers: req.headers as HeadersInit,
            body: Readable.toWeb(req) as ReadableStream<Uint8Array>,
            duplex: "half",
        } as RequestInit & { duplex: "half" });

        return await request.formData();
    } catch {
        throw new ApiError(
            "INVALID_BODY",
            "Unable to parse multipart form data",
        );
    }
}
