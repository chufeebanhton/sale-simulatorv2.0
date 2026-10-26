import { type IncomingMessage, type ServerResponse } from "node:http";
import { Scheduler } from "../Engines/Scheduler/Scheduler.js";
import { DELETE, GET, PATCH, POST } from "../services/mockAPI/product.services.js";
import type { Product } from "../interfaces/Product.types.js";
import { ProductCache } from "../Engines/Storage/Storage.js";
import { sendSuccess, sendError } from "../services/responser/responseHelper.js";
import { ApiError } from "../Classes/ApiError.js";

const scheduler = new Scheduler(100, 1000);
const productCache = new ProductCache([]);

let initialized = false;

let loadingPromise: Promise<Product[]> | null = null;

export async function loadProducts(): Promise<Product[]> {
    if (initialized) {
        // Cache already has products.
        // The actual return path should use your cache API.
        return productCache.getAll();
    }

    if (!loadingPromise) {
        loadingPromise = scheduler
            .submit<Product[]>(() => GET())
            .then((products) => {
                productCache.callBack(products);
                initialized = true;
                return products;
            })
            .finally(() => {
                loadingPromise = null;
            });
    }

    return loadingPromise;
}

export async function product_router(
    req: IncomingMessage,
    res: ServerResponse
): Promise<void> {
    const url = new URL(
        req.url ?? "/",
        `http://${req.headers.host ?? "localhost"}`
    );
    const pathname = url.pathname;

    try {
        if (req.method === "GET" && pathname === "/api/v2.0.0/products") {
            const page = Number(url.searchParams.get("page") ?? 1);
            const limit = Number(url.searchParams.get("limit") ?? 9);

            if (!Number.isInteger(page) || page < 1) {
                throw new ApiError("VALIDATION_FAILED", "page must be a positive integer");
            }

            if (!Number.isInteger(limit) || limit < 1) {
                throw new ApiError("VALIDATION_FAILED", "limit must be a positive integer");
            }

            await loadProducts();

            const data = await productCache.getLimit(page, limit);

            sendSuccess(res, 200, "Products retrieved successfully", data);

            return;
        }

        if (req.method === "POST" && pathname === "/api/v2.0.0/products") {
            const product = await scheduler.submit<Product>(() => POST(req));
            // go to Storage
            const result = await productCache.post(product);
            sendSuccess(res, 200, "Products retrieved successfully", result._id);
            return;
        }

        if (
            req.method === "PATCH" &&
            pathname.startsWith("/api/v2.0.0/products/")
        ) {
            const _id = pathname.split("/").at(-1);

            if (!_id) {
                throw new ApiError(
                    "VALIDATION_FAILED",
                    "Product ID is required",
                );
            }

            // const product = await scheduler.submit(() => PATCH(id, ))

            await loadProducts();
            const currentProduct = await productCache.getBy_Id(_id);

            if (!currentProduct) {
                throw new ApiError("NOT_FOUND", "Product not found");
            }

            const updatedProduct = await scheduler.submit(() =>
                PATCH(req, _id, currentProduct),
            );
            productCache.update(_id, updatedProduct);

            sendSuccess(res, 200, "Product updated successfully", updatedProduct);
            return;
        }
        if (
            req.method === "DELETE" &&
            pathname.startsWith("/api/v2.0.0/products/")
        ) {
            try {
                const _id = decodeURIComponent(
                    pathname.slice("/api/v2.0.0/products/".length)
                );

                if (!_id || _id.includes("/")) {
                    throw new ApiError(
                        "VALIDATION_FAILED",
                        "Invalid product ID"
                    );
                }
                await loadProducts();

                const product = productCache.getBy_Id(_id);

                if (!product) {
                    throw new ApiError(
                        "NOT_FOUND",
                        "Product not found"
                    );
                }

                await scheduler.submit(
                    () => DELETE(product.id, product.imageUrl)
                );

                productCache.delete(_id);

                sendSuccess(
                    res,
                    200,
                    "Product deleted successfully",
                    null
                );
            } catch (error) {
                // Chuyển lỗi cho error handler chung của router.
                throw error;
            }

            return;
        }

        throw new ApiError(
            "ROUTE_NOT_FOUND",
            "Product route not found"
        );
    } catch (error: unknown) {
        sendError(res, error);
    }
}
