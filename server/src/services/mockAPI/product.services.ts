import type { IncomingMessage } from "node:http";
import type { Product, ProductPatch } from "../../interfaces/Product.types.js";

import { httpRequest } from "./product.httpRequest.js";
import { saveImage, removeImage, updateImage } from "../../Engines/Imager/Imager.js";
import { randomUUID } from "node:crypto";
import { getBody } from "../../services/untils/getBody.js";
import { ApiError } from "../../Classes/ApiError.js";

const MOCK_API_URL =
    "https://6abe5659c4d5ac548302681c.mockapi.io/api/v1/products/";

const PRODUCT_IMG_PATH = "./uploads/images/products/indexs";

// POST FIELDS

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

// UPDATE FIELDS

function optionalString(
    data: FormData,
    key: string,
): string | undefined {
    if (!data.has(key)) return undefined;

    const value = data.get(key);

    if (typeof value !== "string" || !value.trim()) {
        throw new ApiError(
            "VALIDATION_FAILED",
            `Invalid field: ${key}`,
        );
    }

    return value.trim();
}

function optionalNumber(
    data: FormData,
    key: string,
): number | undefined {
    const raw = optionalString(data, key);

    if (raw === undefined) return undefined;

    const value = Number(raw);

    if (!Number.isFinite(value) || value < 0) {
        throw new ApiError(
            "VALIDATION_FAILED",
            `Invalid numeric field: ${key}`,
        );
    }

    return value;
}

function optionalStringArray(
    data: FormData,
    key: string,
): string[] | undefined {
    const raw = optionalString(data, key);

    if (raw === undefined) return undefined;

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
                typeof item === "string" &&
                item.trim().length > 0,
        )
    ) {
        throw new ApiError(
            "VALIDATION_FAILED",
            `Invalid array field: ${key}`,
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
        id: null,
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
        await removeImage(product.imageUrl, PRODUCT_IMG_PATH);
        throw new ApiError(
            "UPSTREAM_ERROR",
            "Failed to create product in the upstream API",
        );
    }
}

export async function PATCH(
    req: IncomingMessage,
    id: string | null,
    currentProduct: Product,
): Promise<ProductPatch> {
    if (!id) throw new ApiError(
        "INVALID_ID",
        "ID has been founded"
    )
    const data = await getBody(req);
    const patch: Partial<Product> = {};
    const name = optionalString(data, "name");
    const sku = optionalString(data, "sku");
    const description = optionalString(data, "description");
    const brand = optionalString(data, "brand");
    const categoriesId = optionalStringArray(data, "categoriesId");
    const imageUrl = optionalString(data, "imageUrl");
    const price = optionalNumber(data, "price");
    const compareAtPrice = optionalNumber(data, "compareAtPrice");
    const stockQuantity = optionalNumber(data, "stockQuantity");

    if (name !== undefined) patch.name = name;
    if (sku !== undefined) patch.sku = sku;
    if (description !== undefined) patch.description = description;
    if (brand !== undefined) patch.brand = brand;
    if (categoriesId !== undefined) patch.categoriesId = categoriesId;
    if (price !== undefined) {
        if (price <= 0) {
            throw new ApiError("VALIDATION_FAILED", "Price must be greater than zero");
        }
        patch.price = price;
    }
    if (compareAtPrice !== undefined) {
        patch.compareAtPrice = compareAtPrice;
    }

    if (stockQuantity !== undefined) {
        if (!Number.isInteger(stockQuantity)) {
            throw new ApiError(
                "VALIDATION_FAILED",
                "Stock quantity must be an integer",
            );
        }
        patch.stockQuantity = stockQuantity;
    }
    // Validate price against the final combined state,
    // not only against fields present in this request.
    const finalPrice = patch.price ?? currentProduct.price;
    const finalCompareAtPrice =
        patch.compareAtPrice ?? currentProduct.compareAtPrice;

    if (finalPrice < finalCompareAtPrice) {
        throw new ApiError(
            "VALIDATION_FAILED",
            "Price must not be less than compare-at price",
        );
    }

    const image = data.get("image");
    let newImagePath: string | undefined;
    if (image !== null) {
        if (!imageUrl) {
            throw new ApiError("INVALID_IMAGE", "Invalid image")
        }
        if (imageUrl !== currentProduct.imageUrl) {
            throw new ApiError("INVALID_IMAGE", "Invalid image")
        }
        if (!(image instanceof File) || image.size === 0) {
            throw new ApiError("INVALID_IMAGE", "Invalid image");
        }

        const buffer = Buffer.from(await image.arrayBuffer());

        newImagePath = await updateImage(
            {
                buffer,
                sizeNeed: { w: 800, h: 800 },
            },
            `${PRODUCT_IMG_PATH}/${imageUrl}`,
        );
        patch.imageUrl = newImagePath.split('/').at(-1);
    }

    if (stockQuantity !== undefined) {
        patch.status = stockQuantity > 0 ? "active" : "inactive";
    }

    if (Object.keys(patch).length === 0) {
        throw new ApiError(
            "VALIDATION_FAILED",
            "No valid fields supplied for update",
        );
    }
    patch.updatedAt = new Date().toISOString();
    try {
        const MockId = currentProduct.id;
        await httpRequest<Product, Partial<Product>>(
            `${MOCK_API_URL}${MockId}`,
            "PATCH",
            patch,
        );
        return patch as ProductPatch;
    } catch (error) {
        // If upstream failed, clean up the newly saved image.
        if (newImagePath) {
            await removeImage(currentProduct.imageUrl, PRODUCT_IMG_PATH);
        }

        throw error;
    }
}

export async function DELETE(id: Partial<Product>, imageUrl: string): Promise<Product> {
    let result: Product;

    try {
        result = await httpRequest<Product, Partial<Product>>(
            `${MOCK_API_URL}${id}`,
            "DELETE"
        );
    } catch {
        throw new ApiError(
            "UPSTREAM_ERROR",
            "Failed to delete product in the upstream API",
        );
    }

    await removeImage(imageUrl, PRODUCT_IMG_PATH);
    return result;
}
