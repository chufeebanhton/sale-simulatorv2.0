
import { createServer } from "node:http";
import { pipeline } from "node:stream/promises";
import { ImageDelivery } from "../Imager.deliver.js";

const PORT = 5400;
const MAX_ACTIVE_STREAMS = 50;

const delivery = new ImageDelivery(
    "../../../../uploads/images/products/indexs"
);

let activeStreams = 0;
let rejectedRequests = 0;
let streamErrors = 0;

const server = createServer(async (req, res) => {
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

    if (activeStreams >= MAX_ACTIVE_STREAMS) {
        rejectedRequests++;

        res.writeHead(503, {
            "Content-Type": "text/plain",
            "Retry-After": "1"
        });

        res.end("Image server is busy");
        return;
    }

    let stream;

    try {
        // Filename is still validated by ImageDelivery.
        stream = delivery.read(match[1]);
    } catch {
        res.writeHead(400);
        res.end("Invalid filename");
        return;
    }

    activeStreams++;

    res.writeHead(200, {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=3600",
        "X-Content-Type-Options": "nosniff"
    });

    try {
        await pipeline(stream, res);
    } catch (error) {
        streamErrors++;

        // If transmission failed, the response may already
        // have started; it can no longer become a 404/500.
        console.error("Image stream failed:", error);
    } finally {
        activeStreams--;

        console.log({
            activeStreams,
            rejectedRequests,
            streamErrors
        });
    }
});

server.listen(PORT, () => {
    console.log(`Image server listening on http://localhost:${PORT}/image`);
});
