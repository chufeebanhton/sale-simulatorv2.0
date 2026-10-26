import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import test from "node:test";

import { ApiError } from "../Classes/ApiError.js";
import { sendError as sendApiError } from "../services/responser/responseHelper.js";
import { sendError as sendSharedError } from "../services/untils/ErrorHelper.js";
import { sendSuccess } from "../services/responser/responseHelper.js";

test("response helpers serialize success, known errors, and unexpected errors", async (t) => {
    const server = createServer((req, res) => {
        if (req.url === "/success") {
            sendSuccess(res, 201, "Created", { id: "item-1" });
        } else if (req.url === "/api-error") {
            sendApiError(
                res,
                new ApiError("VALIDATION_FAILED", "Invalid input", {
                    field: "name",
                }),
            );
        } else if (req.url === "/shared-error") {
            sendSharedError(
                res,
                new ApiError("ROUTE_NOT_FOUND", "Missing route"),
            );
        } else {
            sendApiError(res, new Error("private error"));
        }
    });
    t.after(async () => {
        if (!server.listening) return;
        server.close();
        await once(server, "close");
    });

    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const baseUrl = `http://127.0.0.1:${address.port}`;

    const success = await fetch(`${baseUrl}/success`);
    assert.equal(success.status, 201);
    assert.match(success.headers.get("content-type") ?? "", /application\/json/);
    const successBody = await success.json() as {
        status: string;
        message: string;
        data: { id: string };
        meta: { timestamp: string };
    };
    assert.equal(successBody.status, "success");
    assert.equal(successBody.message, "Created");
    assert.deepEqual(successBody.data, { id: "item-1" });
    assert.ok(Number.isFinite(Date.parse(successBody.meta.timestamp)));

    const knownError = await fetch(`${baseUrl}/api-error`);
    assert.equal(knownError.status, 422);
    const knownBody = await knownError.json() as {
        status: string;
        message: string;
        error: { code: string; details: { field: string } };
        meta: { timestamp: string };
    };
    assert.equal(knownBody.status, "error");
    assert.equal(knownBody.message, "Invalid input");
    assert.equal(knownBody.error.code, "VALIDATION_FAILED");
    assert.deepEqual(knownBody.error.details, { field: "name" });
    assert.ok(Number.isFinite(Date.parse(knownBody.meta.timestamp)));

    const sharedError = await fetch(`${baseUrl}/shared-error`);
    assert.equal(sharedError.status, 404);
    const sharedBody = await sharedError.json() as {
        error: { code: string };
    };
    assert.equal(sharedBody.error.code, "ROUTE_NOT_FOUND");

    const unexpectedError = await fetch(`${baseUrl}/unexpected`);
    assert.equal(unexpectedError.status, 500);
    const unexpectedBody = await unexpectedError.json() as {
        message: string;
        error: { code: string };
    };
    assert.equal(unexpectedBody.message, "Internal server error");
    assert.equal(unexpectedBody.error.code, "INTERNAL_SERVER_ERROR");
});
