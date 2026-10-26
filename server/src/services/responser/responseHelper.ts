
import type { ServerResponse } from "node:http";
import type { ApiErrorCode, ApiSuccess } from "../../interfaces/ApiResponse.js";
import {ErrorStatusMap} from "../../interfaces/ApiResponse.js";
import { ApiError } from "../../Classes/ApiError.js"

export function sendSuccess<T>(
    res: ServerResponse,
    statusCode: number,
    message: string,
    data: T,
): void {
    const body: ApiSuccess<T> = {
        status: "success",
        message,
        data,
        meta: {
            timestamp: new Date().toISOString(),
        },
    };

    res.writeHead(statusCode, {
        "Content-Type": "application/json; charset=utf-8",
    });

    res.end(JSON.stringify(body));
}


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

    const statusCode = apiError?.code
        ? ErrorStatusMap[apiError.code] ?? 500
        : 500;
    console.log(statusCode)
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

