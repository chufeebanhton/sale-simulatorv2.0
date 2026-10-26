
import type { IncomingMessage, ServerResponse } from "node:http";
import { sendSuccess } from "../services/responser/responseHelper.js";
import { ApiError } from "../Classes/ApiError.js";

export function healthRoute(
    req: IncomingMessage,
    res: ServerResponse,
): void {
    const url = new URL(
        req.url ?? "/",
        `http://${req.headers.host ?? "localhost"}`,
    );

    if (url.pathname !== "/health-check") {
        throw new ApiError(
            "ROUTE_NOT_FOUND",
            "Health check route not found",
        );
    }

    if (req.method !== "GET") {
        throw new ApiError(
            "METHOD_NOT_ALLOWED",
            "Method not allowed",
        );
    }

    sendSuccess(res, 200, "Health check success", null);
}
