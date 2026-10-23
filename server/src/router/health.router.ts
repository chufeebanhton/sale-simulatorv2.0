import type { IncomingMessage, ServerResponse } from "node:http";

export function healthRoute(req: IncomingMessage, res: ServerResponse): void {
    const url = new URL(
        req.url ?? "/",
            `http://${req.headers.host ?? "localhost"}`,
        );
    if (url.pathname === "/health-check") {
        res.writeHead(200, {
            "Content-Type": "application/json; charset=utf-8",
        });
        return;
    }
    res.end(
        JSON.stringify({
            status: "ok",
            service: "sale-simulator/v2.0",
        }),
    );
}
