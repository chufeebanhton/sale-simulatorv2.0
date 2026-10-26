import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { once } from "node:events";
import test from "node:test";

import type { Product } from "../interfaces/Product.types.js";

const products: Product[] = [
    {
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
    globalThis.fetch = async (input) => {
        assert.equal(
            String(input),
            "https://6abe5659c4d5ac548302681c.mockapi.io/api/v1/products/",
        );

        return new Response(JSON.stringify(products), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    };

    let productRouter: typeof import("../routers/product.router.js")["product_router"];
    try {
        ({ product_router: productRouter } = await import("../routers/product.router.js"));
    } finally {
        globalThis.fetch = originalFetch;
    }

    const server = createServer((req, res) => {
        void productRouter(req, res);
    });
    t.after(async () => closeServer(server));

    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const baseUrl = `http://127.0.0.1:${address.port}`;

    await t.test("returns the requested product page", async () => {
        const response = await fetch(`${baseUrl}/api/v2.0.0/products?page=2&limit=1`);
        const body = await response.json() as {
            status: string;
            data: Product[];
            meta: { timestamp: string };
        };

        assert.equal(response.status, 200);
        assert.equal(body.status, "success");
        assert.deepEqual(body.data, [products[1]]);
        assert.ok(Number.isFinite(Date.parse(body.meta.timestamp)));
    });

    await t.test("rejects invalid pagination parameters", async () => {
        const response = await fetch(`${baseUrl}/api/v2.0.0/products?page=0`);
        const body = await response.json() as {
            status: string;
            error: { code: string };
        };

        assert.equal(response.status, 422);
        assert.equal(body.status, "error");
        assert.equal(body.error.code, "VALIDATION_FAILED");
    });

    await t.test("returns a structured not-found response for unknown routes", async () => {
        const response = await fetch(`${baseUrl}/unknown`);
        const body = await response.json() as {
            status: string;
            error: { code: string };
        };

        assert.equal(response.status, 404);
        assert.equal(body.status, "error");
        assert.equal(body.error.code, "ROUTE_NOT_FOUND");
    });
});

async function closeServer(server: Server): Promise<void> {
    if (!server.listening) return;

    server.close();
    await once(server, "close");
}
