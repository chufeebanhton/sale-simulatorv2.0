import type { IncomingMessage } from "node:http";
import type { Product } from "../../interfaces/Product.types.js";

import { httpRequest } from "./product.httpRequest.js";
import { saveImage } from "../../Engines/Imager/Imager.js";
import { randomUUID } from "node:crypto";
import { getBody } from "../../services/untils/getBody.js";
import { ApiError } from "../../classes/ApiError.js";

const MOCK_API_URL =
    "https://6abe5659c4d5ac548302681c.mockapi.io/api/v1/products/";

const PRODUCT_IMG_PATH = "./uploads/images/products/indexs";

function requiredString(data: FormData, key: string): string {
    const value = data.get(key);

    if (typeof value !== "string" || !value.trim()) {
        throw new ApiError(
            "MISSING_FIELD",
            `Missing or invalid field: ${key}`,
        );
    }

    return value.trim();
}

function requiredNumber(data: FormData, key: string): number {
    const raw = requiredString(data, key);
    const value = Number(raw);

    if (!Number.isFinite(value) || value < 0) {
        throw new ApiError(
            "VALIDATION_FAILED",
            `Invalid numeric field: ${key}`,
        );
    }

    return value;
}

function requiredStringArray(data: FormData, key: string): string[] {
    const raw = requiredString(data, key);

    let value: unknown;

    try {
        value = JSON.parse(raw);
    } catch {
        throw new ApiError(
            "VALIDATION_FAILED",
            `Field ${key} must contain a valid JSON array`,
        );
    }

    if (
        !Array.isArray(value) ||
        !value.every(
            (item): item is string =>
                typeof item === "string" && item.trim().length > 0,
        )
    ) {
        throw new ApiError(
            "VALIDATION_FAILED",
            `Field ${key} must be an array of non-empty strings`,
        );
    }

    return value;
}

export async function GET(): Promise<Product[]> {
    const result = await httpRequest<Product[]>(MOCK_API_URL);
    return result;
}

export async function POST(req: IncomingMessage): Promise<Product> {
    const data = await getBody(req);
    const image = data.get("image");

    if (!(image instanceof File) || image.size === 0) {
        throw new ApiError("INVALID_IMAGE", "Image is missing or empty");
    }
    const name = requiredString(data, "name");
    const sku = requiredString(data, "sku");
    const description = requiredString(data, "description");
    const brand = requiredString(data, "brand");
    const categoriesId = requiredStringArray(data, "categoriesId");

    const price = requiredNumber(data, "price");
    const compareAtPrice = requiredNumber(data, "compareAtPrice");
    const stockQuantity = requiredNumber(data, "stockQuantity");
    if (price <= 0) {
        throw new ApiError(
            "VALIDATION_FAILED",
            "Price must be greater than zero",
        );
    }

    if (!Number.isInteger(stockQuantity)) {
        throw new ApiError(
            "VALIDATION_FAILED",
            "Stock quantity must be an integer",
        );
    }

    // Assumption: compareAtPrice is the original/list price.
    // A discounted selling price should not exceed it.
    if (price < compareAtPrice) { 
        throw new ApiError(
            "VALIDATION_FAILED",
            "Price must not exceed compare-at price",
        );
    }

    const buffer = Buffer.from(await image.arrayBuffer());
    const imageFileName = await saveImage(
        {
            buffer,
            sizeNeed: { w: 800, h: 800 },
        },
        PRODUCT_IMG_PATH,
    );

    const now = new Date().toISOString();

    const product: Product = {
        _id: randomUUID(),
        imageUrl: imageFileName,
        createdAt: now,
        updatedAt: now,
        status: stockQuantity > 0 ? "active" : "inactive",
        stockQuantity,
        sku,
        name,
        description,
        categoriesId,
        brand,
        price,
        compareAtPrice,
    };

    try {
        return await httpRequest<Product, Product>(
            MOCK_API_URL,
            "POST",
            product,
        );
    } catch {
        // The image has already been saved locally.
        // Add image cleanup here if the MockAPI request fails.
        throw new ApiError(
            "UPSTREAM_ERROR",
            "Failed to create product in the upstream API",
        );
    }
}

export async function PATCH(): Promise<Product> {
    throw new ApiError(
        "NOT_IMPLEMENTED",
        "Product update is not implemented yet",
    );
}

export async function DELETE(): Promise<Product> {
    throw new ApiError(
        "NOT_IMPLEMENTED",
        "Product deletion is not implemented yet",
    );
}
