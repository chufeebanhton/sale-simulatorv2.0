import type { IncomingMessage, ServerResponse } from "node:http";
import { once } from "node:events";
import { pipeline } from "node:stream/promises";
import { ImageDelivery } from "../Engines/Imager/Imager.deliver.js";
import { Scheduler } from "../Engines/Scheduler/Scheduler.js";

const delivery = new ImageDelivery(
    "./uploads/images/products/indexs"
);

const scheduler: Scheduler = new Scheduler(100, 5000);

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
    res: ServerResponse
): Promise<void> {
    if (req.method !== "GET") {
        res.writeHead(405, { Allow: "GET" });
        res.end("Method Not Allowed");
        return;
    }

    const url = new URL(
        req.url ?? "/",
        `http://${req.headers.host ?? "localhost"}`
    );

    const match = url.pathname.match(
        /^\/images\/([0-9a-f-]+\.webp)$/i
    );

    if (!match) {
        res.writeHead(400);
        res.end("Invalid image path");
        return;
    }

    try {
        await scheduler.submit(async () => {
            console.log("Requested filename:", match[1]);
            const stream = delivery.read(match[1]);
            try {
                await once(stream, "open");

                res.writeHead(200, {
                    "Content-Type": "image/webp",
                });

                await pipeline(stream, res);
            } catch (error) {
                if (res.headersSent || res.destroyed) {
                    if (!res.destroyed) {
                        res.destroy(
                            error instanceof Error ? error : undefined
                        );
                    }
                    throw error;
                }

                const code = getErrorCode(error);

                if (code === "ENOENT") {
                    res.writeHead(404);
                    res.end("Image Not Found");
                    return;
                }

                res.writeHead(500);
                res.end("Internal Server Error");
            }
        });
    } catch (error) {
        console.error("Scheduler task failed:", error);
        res.writeHead(503);
        res.end("Scheduler task failed");
    }
}