import type { IncomingMessage } from "node:http";
import { Readable } from "node:stream";

export async function getBody(req: IncomingMessage): Promise<FormData> {
    const request = new Request("http://localhost", {
        method: req.method,
        headers: req.headers,
        body: Readable.toWeb(req) as ReadableStream<Uint8Array>,
        duplex: "half",
    } as RequestInit & { duplex: "half" });

    return await request.formData();
}