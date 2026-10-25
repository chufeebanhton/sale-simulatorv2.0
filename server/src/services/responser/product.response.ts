
import type { ServerResponse } from "node:http";
import type { ApiResponse, ResponseMeta } from "../../interfaces/Api.response.js";


export function sendResponse<T>(
    res: ServerResponse,
    statusCode: number,
    message: string,
    data: T | null = null,
    error: ApiResponse<T>["error"] = null,
    meta: ResponseMeta = {}
): void {
    const body: ApiResponse<T> = {
        status: statusCode >= 200 && statusCode < 300
            ? "success"
            : "error",
        message,
        data,
        error,
        meta: {
            timestamp: new Date().toISOString(),
            ...meta
        }
    };

    res.statusCode = statusCode;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(body));
}
