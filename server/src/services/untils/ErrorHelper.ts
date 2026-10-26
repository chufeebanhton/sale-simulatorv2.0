
import type { ServerResponse } from "node:http";
import { ApiError } from "../../Classes/ApiError.js";
import type { ApiErrorCode } from "../../interfaces/ApiResponse.js";

interface ErrorResponse {
    status: "error";
    message: string;
    error: {
        code: ApiErrorCode;
        details?: unknown;
    };
    meta: {
        timestamp: string;
    };
}

export function sendError(
    res: ServerResponse,
    error: unknown,
): void {
    // Nếu response đã gửi hoặc kết thúc thì không gửi lần nữa.
    if (res.headersSent || res.writableEnded) {
        return;
    }

    const apiError =
        error instanceof ApiError ? error : null;

    const statusCode = apiError?.statusCode ?? 500;

    const body: ErrorResponse = {
        status: "error",
        message: apiError?.message
            ?? "Internal server error",
        error: {
            code: apiError?.code
                ?? "INTERNAL_SERVER_ERROR",
            ...(apiError?.details !== undefined
                ? { details: apiError.details }
                : {}),
        },
        meta: {
            timestamp: new Date().toISOString(),
        },
    };

    res.writeHead(statusCode, {
        "Content-Type": "application/json; charset=utf-8",
    });

    res.end(JSON.stringify(body));
}
