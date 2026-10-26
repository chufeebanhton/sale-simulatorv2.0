import assert from "node:assert/strict";
import test from "node:test";

import { ApiError } from "../Classes/ApiError.js";
import {
    HttpRequestError,
    httpRequest,
} from "../services/mockAPI/product.httpRequest.js";
import { getBody } from "../services/untils/getBody.js";

test("httpRequest returns JSON and sends JSON request bodies", async (t) => {
    const originalFetch = globalThis.fetch;
    t.after(() => {
        globalThis.fetch = originalFetch;
    });

    globalThis.fetch = async (_input, init) => {
        assert.equal(init?.method, "POST");
        assert.equal(
            new Headers(init?.headers).get("content-type"),
            "application/json",
        );
        assert.deepEqual(JSON.parse(String(init?.body)), { name: "Example" });
        return new Response(JSON.stringify({ id: "1" }), { status: 201 });
    };

    assert.deepEqual(
        await httpRequest<{ id: string }, { name: string }>(
            "https://example.test/items",
            "POST",
            { name: "Example" },
        ),
        { id: "1" },
    );
});

test("httpRequest handles no-content and upstream error responses", async (t) => {
    const originalFetch = globalThis.fetch;
    t.after(() => {
        globalThis.fetch = originalFetch;
    });

    globalThis.fetch = async () => new Response(null, { status: 204 });
    assert.equal(await httpRequest<void>("https://example.test/items"), undefined);

    globalThis.fetch = async () =>
        new Response(JSON.stringify({ code: "OUT_OF_STOCK", message: "Unavailable" }), {
            status: 409,
            headers: { "Content-Type": "application/json" },
        });
    await assert.rejects(
        httpRequest("https://example.test/items"),
        (error: unknown) =>
            error instanceof HttpRequestError &&
            error.statusCode === 409 &&
            error.code === "OUT_OF_STOCK" &&
            error.message === "Unavailable",
    );

    globalThis.fetch = async () =>
        new Response("not JSON", { status: 502, statusText: "Bad Gateway" });
    await assert.rejects(
        httpRequest("https://example.test/items"),
        (error: unknown) =>
            error instanceof HttpRequestError &&
            error.message === "HTTP 502: Bad Gateway",
    );
});

test("getBody parses multipart data and rejects wrong content types", async (t) => {
    const server = (await import("node:http")).createServer(async (req, res) => {
        try {
            const body = await getBody(req);
            const value = body.get("field");
            res.writeHead(200, { "Content-Type": "text/plain" });
            res.end(typeof value === "string" ? value : "missing");
        } catch (error: unknown) {
            const code = error instanceof ApiError ? error.code : "UNKNOWN";
            res.writeHead(error instanceof ApiError ? error.statusCode : 500);
            res.end(code);
        }
    });
    t.after(async () => {
        if (!server.listening) return;
        server.close();
        await new Promise<void>((resolve) => server.once("close", resolve));
    });

    server.listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const baseUrl = `http://127.0.0.1:${address.port}`;

    const form = new FormData();
    form.set("field", "parsed value");
    const validResponse = await fetch(baseUrl, { method: "POST", body: form });
    assert.equal(validResponse.status, 200);
    assert.equal(await validResponse.text(), "parsed value");

    const invalidResponse = await fetch(baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
    });
    assert.equal(invalidResponse.status, 400);
    assert.equal(await invalidResponse.text(), "INVALID_BODY");

    const malformedResponse = await fetch(baseUrl, {
        method: "POST",
        headers: { "Content-Type": "multipart/form-data; boundary=broken" },
        body: "not a multipart body",
    });
    assert.equal(malformedResponse.status, 400);
    assert.equal(await malformedResponse.text(), "INVALID_BODY");
});
