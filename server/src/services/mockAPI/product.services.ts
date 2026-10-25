import type { Product } from "../../interfaces/Product.types.js";
import { httpRequest } from "./product.httpRequest.js";
import { saveImage } from "../../Engines/Imager/Imager.js"; 
import { randomUUID } from "node:crypto";

const MOCK_API_URL = "https://6abe5659c4d5ac548302681c.mockapi.io/api/v1/products";
const PRODUCT_IMG_PATH = "./uploads/images/products/indexs";

export async function GET(): Promise<Product[]> {
    const result = await httpRequest(MOCK_API_URL);
    return result as Product[];
}

export async function POST(data: FormData): Promise<Product> {
    const image = data.get('image');
    if (!(image instanceof File)) {
        throw new Error("Image is missing or invalid");
    }
    if (Number(data.get("price")) < Number(data.get("compareAtPrice"))) throw new Error("Price lesser than Origin Price")

    const buffer = Buffer.from(await image.arrayBuffer());

    const fileName = await saveImage(
        { buffer, sizeNeed: { w: 800, h: 800 } },
        PRODUCT_IMG_PATH
    );

    const time = new Date().toISOString();
    const _id = randomUUID().slice(0, 12);
    const imageUrl = fileName;
    const createdAt = time;
    const updatedAt = time;
    const stockQuantity = Number(data.get('stockQuantity')?? 0);
    const status = stockQuantity > 0 ? "active" : "inactive";
    const product: Product = {
        _id, imageUrl, createdAt, updatedAt, status, stockQuantity,
        sku: String(data.get("sku")),
        name: String(data.get("name")),
        description: String(data.get("description")),
        categoriesId: JSON.parse(String(data.get("categoriesId"))),
        brand: String(data.get("brand")),
        price: Number(data.get("price")),
        compareAtPrice: Number(data.get("compareAtPrice"))
    }
    const result = await httpRequest(MOCK_API_URL, 'POST', product);
    return result as Product;
}

export async function PATCH(): Promise<Product> {
    return {} as Product
}

export async function DELETE(): Promise<Product> {
    return {} as Product
}