import assert from "node:assert/strict";
import test from "node:test";

import { ProductCache } from "../Engines/Storage/Storage.js";
import { ApiError } from "../Classes/ApiError.js";
import type { Product } from "../interfaces/Product.types.js";

function product(id: string, name: string): Product {
    return {
        id: `upstream-${id}`,
        _id: id,
        sku: `SKU-${id}`,
        name,
        description: `${name} description`,
        categoriesId: ["category-1"],
        brand: "Test brand",
        price: 10,
        stockQuantity: 5,
        compareAtPrice: 12,
        imageUrl: `${id}.webp`,
        status: "active",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
    };
}

test("product cache starts populated and returns pages", async () => {
    const products = [
        product("1", "First"),
        product("2", "Second"),
        product("3", "Third"),
    ];
    const cache = new ProductCache(products);

    assert.equal(cache.size(), 3);
    assert.deepEqual(await cache.getAll(), products);
    assert.deepEqual(await cache.getLimit(1, 2), products.slice(0, 2));
    assert.deepEqual(await cache.getLimit(2, 2), [products[2]]);
    assert.deepEqual(await cache.getLimit(3, 2), []);
});

test("product cache reload replaces prior contents", async () => {
    const cache = new ProductCache([product("1", "First")]);
    const replacement = product("2", "Replacement");

    cache.callBack([replacement]);

    assert.equal(cache.size(), 1);
    assert.deepEqual(await cache.getAll(), [replacement]);
});

test("product cache adds products and includes them in later pages", async () => {
    const first = product("1", "First");
    const added = product("2", "Added");
    const cache = new ProductCache([first]);

    assert.equal(await cache.post(added), added);
    assert.equal(cache.size(), 2);
    assert.equal(cache.getBy_Id("2"), added);
    assert.deepEqual(await cache.getLimit(1, 2), [first, added]);
});

test("product cache rejects invalid page numbers", async () => {
    const cache = new ProductCache([product("1", "First")]);

    await assert.rejects(
        cache.getLimit(0, 1),
        (error: unknown) =>
            error instanceof ApiError &&
            error.code === "INVALID_INPUT_CACHE_REQUEST",
    );

    await assert.rejects(
        cache.getLimit(1, 1.5),
        (error: unknown) =>
            error instanceof ApiError &&
            error.code === "INVALID_INPUT_CACHE_REQUEST",
    );
});

test("product cache updates and deletes products by ID", async () => {
    const first = product("1", "First");
    const cache = new ProductCache([first]);

    const updated = cache.update("1", { name: "Renamed" });
    assert.equal(updated.name, "Renamed");
    assert.equal(cache.getBy_Id("1"), updated);
    assert.equal(cache.size(), 1);

    assert.equal(cache.delete("1"), updated);
    assert.equal(cache.size(), 0);
    assert.equal(cache.getBy_Id("1"), undefined);
});

test("product cache rejects updates and deletes for unknown IDs", () => {
    const cache = new ProductCache([]);

    assert.throws(
        () => cache.update("missing", { name: "Missing" }),
        (error: unknown) => error instanceof ApiError && error.code === "NOT_FOUND",
    );
    assert.throws(
        () => cache.delete("missing"),
        (error: unknown) => error instanceof ApiError && error.code === "NOT_FOUND",
    );
});
