import type { Product, ProductPatch } from "../../interfaces/Product.types.js";
import { ApiError } from "../../classes/ApiError.js";

export class ProductCache {
    private cache = new Map<string, Product>();
    private length: number = 0;

    constructor(data: Product[]) {
        this.callBack(data);
    }

    size(): number {
        return this.cache.size;
    }

    callBack(data: Product[]): void {
        this.cache.clear();
        for (const item of data) {
            this.cache.set(item._id, item);
        }
        this.length = this.cache.size;
    }

    async getAll(): Promise<Product[]> {
        const result = [...this.cache.values()];
        if (!result) throw new ApiError(
            'CACHE_REQUEST_ERROR',
            'CACHE REQUEST ERROR'
        );
        return result;
    }

    async getLimit(page: number = 1, limit: number = this.length): Promise<Product[]> {
        const start = limit * (page - 1);
        const end = start + limit;
        if (
            !Number.isInteger(page) ||
            page < 1 ||
            !Number.isInteger(limit) ||
            limit < 1
        ) {
            throw new ApiError(
                "INVALID_INPUT_CACHE_REQUEST",
                "Page and limit must be positive integers",
            );
        }

        const result = [...this.cache.values()];
        return result.slice(start, end);
    }

    public getBy_Id(_id: string): Product | undefined {
        return this.cache.get(_id);
    }

    async post(data: Product): Promise<Product> {
        const isNewProduct = !this.cache.has(data._id);
        this.cache.set(data._id, data);
        if (isNewProduct) this.length++;
        return data;
    }

    public update(_id: string, data: ProductPatch): Product {
        const current = this.cache.get(_id);

        if (!current) {
            throw new ApiError(
                "NOT_FOUND",
                "Product not found in cache"
            );
        }

        const updated: Product = {
            ...current,
            ...data,
        };

        this.cache.set(_id, updated);

        return updated;
    }

    public delete(_id: string): Product {
        const product = this.cache.get(_id);

        if (!product) {
            throw new ApiError(
                "NOT_FOUND",
                "Product not found in cache"
            );
        }

        this.cache.delete(_id);
        this.length--;

        return product;
    }
}