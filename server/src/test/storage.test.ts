import assert from "node:assert/strict";
import test from "node:test";

import { ProductCache } from "../Engines/Storage/Storage.js";
import { ApiError } from "../classes/ApiError.js";
import type { Product } from "../interfaces/Product.types.js";

function product(id: string, name: string): Product {
    return {
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

    assert.equal(cache.isExist(), true);
    assert.equal(cache.size(), 3);
    assert.deepEqual(await cache.get(1, 2), products.slice(0, 2));
    assert.deepEqual(await cache.get(2, 2), [products[2]]);
    assert.deepEqual(await cache.get(3, 2), []);
});

test("product cache adds products and includes them in later pages", async () => {
    const first = product("1", "First");
    const added = product("2", "Added");
    const cache = new ProductCache([first]);

    assert.equal(await cache.post(added), added);
    assert.equal(cache.size(), 2);
    assert.deepEqual(await cache.get(1, 2), [first, added]);
});

test("product cache rejects invalid page numbers", async () => {
    const cache = new ProductCache([product("1", "First")]);

    await assert.rejects(
        cache.get(0, 1),
        (error: unknown) =>
            error instanceof ApiError &&
            error.code === "INVALID_INPUT_CACHE_REQUEST",
    );
});
