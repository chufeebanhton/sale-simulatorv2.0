import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { once } from "node:events";
import test from "node:test";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

import type { Product } from "../interfaces/Product.types.js";
import { healthRoute } from "../routers/health.router.js";
import { imageRouter } from "../routers/image.router.js";
import { sendError } from "../services/responser/responseHelper.js";
import { product_router } from "../routers/product.router.js";

const imageDirectory = join(
    process.cwd(),
    "uploads/images/products/indexs",
);

const products: Product[] = [
    {
        id: "upstream-1",
        _id: "product-1",
        sku: "SKU-1",
        name: "First product",
        description: "First test product",
        categoriesId: ["category-1"],
        brand: "Test brand",
        price: 10,
        stockQuantity: 5,
        compareAtPrice: 12,
        imageUrl: "first.webp",
        status: "active",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
    },
    {
        id: "upstream-2",
        _id: "product-2",
        sku: "SKU-2",
        name: "Second product",
        description: "Second test product",
        categoriesId: ["category-2"],
        brand: "Test brand",
        price: 20,
        stockQuantity: 0,
        compareAtPrice: 22,
        imageUrl: "second.webp",
        status: "inactive",
        createdAt: "2026-01-02T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
    },
];

test("product API returns paginated products and structured errors", async (t) => {
    const originalFetch = globalThis.fetch;
    const upstreamUrl =
        "https://6abe5659c4d5ac548302681c.mockapi.io/api/v1/products/";
    let createdProduct: Product | undefined;
    const generatedImageNames: string[] = [];

    globalThis.fetch = async (input, init) => {
        const url = String(input);
        const method = init?.method ?? "GET";

        if (url.startsWith("http://127.0.0.1:")) {
            return originalFetch(input, init);
        }
        if (url === upstreamUrl && method === "GET") {
            return jsonResponse(products);
        }
        if (url === upstreamUrl && method === "POST") {
            const body = JSON.parse(String(init?.body)) as Omit<Product, "id">;
            createdProduct = { ...body, id: "upstream-3" };
            generatedImageNames.push(createdProduct.imageUrl);
            return jsonResponse(createdProduct);
        }
        if (url === `${upstreamUrl}upstream-3` && method === "PATCH") {
            return jsonResponse(JSON.parse(String(init?.body)));
        }
        if (url === `${upstreamUrl}upstream-3` && method === "DELETE") {
            return jsonResponse(createdProduct);
        }

        throw new Error(`Unexpected upstream request: ${method} ${url}`);
    };

    const server = createServer((req, res) => {
        if (req.url?.startsWith("/images/")) {
            void imageRouter(req, res);
            return;
        }
        if (req.url?.startsWith("/health-check")) {
            try {
                healthRoute(req, res);
            } catch (error: unknown) {
                sendError(res, error);
            }
            return;
        }
        void product_router(req, res);
    });
    t.after(async () => {
        globalThis.fetch = originalFetch;
        await closeServer(server);
        await Promise.all(
            generatedImageNames.map((name) =>
                rm(join(imageDirectory, name), { force: true }),
            ),
        );
    });

    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const baseUrl = `http://127.0.0.1:${address.port}`;

    const pageResponse = await fetch(
        `${baseUrl}/api/v2.0.0/products?page=2&limit=1`,
    );
    const pageBody = await pageResponse.json() as {
        status: string;
        data: Product[];
        meta: { timestamp: string };
    };
    assert.equal(pageResponse.status, 200);
    assert.equal(pageBody.status, "success");
    assert.deepEqual(pageBody.data, [products[1]]);
    assert.ok(Number.isFinite(Date.parse(pageBody.meta.timestamp)));

    const invalidPageResponse = await fetch(
        `${baseUrl}/api/v2.0.0/products?page=0`,
    );
    const invalidPageBody = await invalidPageResponse.json() as {
        status: string;
        error: { code: string };
    };
    assert.equal(invalidPageResponse.status, 422);
    assert.equal(invalidPageBody.error.code, "VALIDATION_FAILED");

    const missingImageForm = new FormData();
    missingImageForm.set("name", "No image");
    const missingImageResponse = await fetch(
        `${baseUrl}/api/v2.0.0/products`,
        { method: "POST", body: missingImageForm },
    );
    const missingImageBody = await missingImageResponse.json() as {
        error: { code: string };
    };
    assert.equal(missingImageResponse.status, 415);
    assert.equal(missingImageBody.error.code, "INVALID_IMAGE");

    const form = new FormData();
    form.set("name", "Created product");
    form.set("sku", "SKU-3");
    form.set("description", "Product made by API test");
    form.set("brand", "Test brand");
    form.set("categoriesId", JSON.stringify(["category-1"]));
    form.set("price", "15");
    form.set("compareAtPrice", "12");
    form.set("stockQuantity", "4");
    const imageBytes = await createTestImage();
    form.set(
        "image",
        new Blob([new Uint8Array(imageBytes)], { type: "image/png" }),
        "product.png",
    );

    const postResponse = await fetch(`${baseUrl}/api/v2.0.0/products`, {
        method: "POST",
        body: form,
    });
    const postBody = await postResponse.json() as {
        status: string;
        data: string;
    };
    assert.equal(postResponse.status, 200);
    assert.equal(postBody.status, "success");
    assert.ok(createdProduct);
    assert.equal(postBody.data, createdProduct._id);
    assert.ok(generatedImageNames.length === 1);

    const imageResponse = await fetch(
        `${baseUrl}/images/${createdProduct.imageUrl}`,
    );
    assert.equal(imageResponse.status, 200);
    assert.match(
        imageResponse.headers.get("content-type") ?? "",
        /image\/webp/,
    );
    assert.ok((await imageResponse.arrayBuffer()).byteLength > 0);

    const invalidPatchForm = new FormData();
    invalidPatchForm.set("price", "5");
    const invalidPatchResponse = await fetch(
        `${baseUrl}/api/v2.0.0/products/${createdProduct._id}`,
        { method: "PATCH", body: invalidPatchForm },
    );
    const invalidPatchBody = await invalidPatchResponse.json() as {
        error: { code: string };
    };
    assert.equal(invalidPatchResponse.status, 422);
    assert.equal(invalidPatchBody.error.code, "VALIDATION_FAILED");

    const patchForm = new FormData();
    patchForm.set("name", "Updated product");
    patchForm.set("stockQuantity", "0");
    const patchResponse = await fetch(
        `${baseUrl}/api/v2.0.0/products/${createdProduct._id}`,
        { method: "PATCH", body: patchForm },
    );
    const patchBody = await patchResponse.json() as {
        status: string;
        data: { name: string; status: string };
    };
    assert.equal(patchResponse.status, 200);
    assert.equal(patchBody.data.name, "Updated product");
    assert.equal(patchBody.data.status, "inactive");

    const deleteResponse = await fetch(
        `${baseUrl}/api/v2.0.0/products/${createdProduct._id}`,
        { method: "DELETE" },
    );
    const deleteBody = await deleteResponse.json() as {
        status: string;
        data: unknown;
    };
    assert.equal(deleteResponse.status, 200);
    assert.equal(deleteBody.status, "success");
    assert.equal(deleteBody.data, null);

    const missingProductResponse = await fetch(
        `${baseUrl}/api/v2.0.0/products/unknown-product`,
        { method: "DELETE" },
    );
    const missingProductBody = await missingProductResponse.json() as {
        error: { code: string };
    };
    assert.equal(missingProductResponse.status, 404);
    assert.equal(missingProductBody.error.code, "NOT_FOUND");

    const deletedProductResponse = await fetch(
        `${baseUrl}/api/v2.0.0/products?page=1&limit=9`,
    );
    const deletedProductBody = await deletedProductResponse.json() as {
        data: Product[];
    };
    assert.ok(
        deletedProductBody.data.every(
            (product) => product._id !== createdProduct?._id,
        ),
    );

    const healthResponse = await fetch(`${baseUrl}/health-check`);
    const healthBody = await healthResponse.json() as {
        status: string;
        message: string;
    };
    assert.equal(healthResponse.status, 200);
    assert.equal(healthBody.status, "success");
    assert.equal(healthBody.message, "Health check success");

    const wrongHealthMethod = await fetch(`${baseUrl}/health-check`, {
        method: "POST",
    });
    assert.equal(wrongHealthMethod.status, 405);

    const invalidImageRoute = await fetch(`${baseUrl}/images/not-a-uuid.webp`);
    assert.equal(invalidImageRoute.status, 400);

    const missingImage = await fetch(
        `${baseUrl}/images/00000000-0000-4000-8000-000000000000.webp`,
    );
    assert.equal(missingImage.status, 404);

    const wrongImageMethod = await fetch(
        `${baseUrl}/images/12345678-1234-4234-8234-123456789abc.webp`,
        { method: "POST" },
    );
    assert.equal(wrongImageMethod.status, 405);

    const unknownRoute = await fetch(`${baseUrl}/unknown`);
    const unknownBody = await unknownRoute.json() as {
        status: string;
        error: { code: string };
    };
    assert.equal(unknownRoute.status, 404);
    assert.equal(unknownBody.error.code, "ROUTE_NOT_FOUND");
});

function jsonResponse(data: unknown): Response {
    return new Response(JSON.stringify(data), {
        status: 200,
        headers: { "Content-Type": "application/json" },
    });
}

async function createTestImage(): Promise<Buffer> {
    return sharp({
        create: {
            width: 320,
            height: 240,
            channels: 3,
            background: { r: 70, g: 130, b: 180 },
        },
    })
        .png()
        .toBuffer();
}

async function closeServer(server: Server): Promise<void> {
    if (!server.listening) return;

    server.close();
    await once(server, "close");
}
