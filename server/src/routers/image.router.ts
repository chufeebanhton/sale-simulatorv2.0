import type { IncomingMessage, ServerResponse } from "node:http";
import { once } from "node:events";
import { pipeline } from "node:stream/promises";

import { ImageDelivery } from "../Engines/Imager/Imager.deliver.js";
import { Scheduler } from "../Engines/Scheduler/Scheduler.js";
import { ApiError } from "../classes/ApiError.js";
import { sendError } from "../services/responser/responseHelper.js";

const delivery = new ImageDelivery("./uploads/images/products/indexs");

const scheduler = new Scheduler(100, 5000);

function getErrorCode(error: unknown): string | undefined {
    if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        typeof error.code === "string"
    ) {
        return error.code;
    }

    return undefined;
}

export async function imageRouter(
    req: IncomingMessage,
    res: ServerResponse,
): Promise<void> {
    try {
        if (req.method !== "GET") {
            res.setHeader("Allow", "GET");

            throw new ApiError(
                "METHOD_NOT_ALLOWED",
                "Method not allowed",
            );
        }

        const url = new URL(
            req.url ?? "/",
            `http://${req.headers.host ?? "localhost"}`,
        );

        const match = url.pathname.match(
            /^\/images\/([0-9a-f-]+\.webp)$/i,
        );

        if (!match) {
            throw new ApiError(
                "INVALID_IMAGE_PATH",
                "Invalid image path",
            );
        }

        const fileName = match[1];

        await scheduler.submit(async () => {
            const stream = delivery.read(fileName);

            try {
                // Wait until the file has been opened.
                // An error before "open" rejects this await.
                await once(stream, "open");

                res.writeHead(200, {
                    "Content-Type": "image/webp",
                    "X-Content-Type-Options": "nosniff",
                });

                await pipeline(stream, res);
            } catch (error: unknown) {
                if (res.headersSent || res.destroyed) {
                    if (!res.destroyed) {
                        res.destroy(
                            error instanceof Error ? error : undefined,
                        );
                    }

                    throw error;
                }

                if (getErrorCode(error) === "ENOENT") {
                    throw new ApiError(
                        "IMAGE_NOT_FOUND",
                        "Image not found",
                    );
                }

                throw new ApiError(
                    "IMAGE_DELIVERY_FAILED",
                    "Failed to deliver image",
                );
            }
        });
    } catch (error: unknown) {
        if (res.headersSent || res.destroyed || res.writableEnded) {
            return;
        }

        sendError(res, error);
    }
}
