import type { Product } from "../../interfaces/Product.types.js";
import { httpRequest } from "./product.httpRequest.js";

const MOCK_API_URL = "https://6abe5659c4d5ac548302681c.mockapi.io/api/v1/products";

export async function GET(): Promise<Product[]> {
    const result = await httpRequest(MOCK_API_URL);
    return result as Product[];
}

export async function POST(): Promise<Product> {
    return {} as Product
}

export async function PATCH(): Promise<Product> {
    return {} as Product
}

export async function DELETE(): Promise<Product> {
    return {} as Product
}