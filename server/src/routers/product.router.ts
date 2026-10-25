import type { IncomingMessage, ServerResponse } from "node:http";
import { Scheduler } from "../Engines/Scheduler/Scheduler.js";
import { GET } from "../services/mockAPI/product.services.js";
import type { Product } from "../interfaces/Product.types.js";
import { ProductCache } from "../Engines/Storage/Storage.js";
import { sendResponse } from "../services/responser/product.response.js";

const scheduler = new Scheduler(100, 1000);
const productCache = new ProductCache(
    await scheduler.submit<Product[]>(() => GET())
);

export const product_router = async (
    req: IncomingMessage,
    res: ServerResponse
): Promise<void> => {
    const url = new URL(
        req.url ?? "/",
        `http://${req.headers.host ?? "localhost"}`
    );

    const pathname = url.pathname;

    try {
        if (req.method === "GET" && pathname === "/api/v2.0.0/products") {
            const page = Number(url.searchParams.get("page") ?? 1);
            const limit = Number(url.searchParams.get("limit") ?? 9);
            if (!productCache.isExist()) {
                const products = await scheduler.submit<Product[]>(() => GET());
                productCache.callBack(products);
            }
            const data = await productCache.get(page, limit);
            sendResponse(res, 200, "Products retrieved successfully", data);
            return;
        }

        if ( req.method === "POST" && pathname === "/api/v2.0.0/products" ) {
            return;
        }

        if (
            req.method === "PATCH" &&
            pathname === "/api/v2.0.0/products"
        ) {
            return;
        }

        if (
            req.method === "DELETE" &&
            pathname === "/api/v2.0.0/products"
        ) {
            return;
        }

        sendResponse(
            res,
            404,
            "Route not found",
            null,
            { code: "ROUTE_NOT_FOUND" }
        );
    } catch (error: unknown) {
        const message = error instanceof Error
            ? error.message
            : "Unknown error";

        sendResponse(
            res,
            500,
            "Failed to process product request",
            null,
            {
                code: "PRODUCT_REQUEST_ERROR",
                details: message
            }
        );
    }
};