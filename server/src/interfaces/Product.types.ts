export interface Product {
  _id: string;
  sku: string;
  name: string;
  description: string;
  categoriesId: string[];
  brand: string;
  price: number;
  stockQuantity: number;
  compareAtPrice: number;
  imageUrl: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

export type ProductInput = Omit<Product, "id" | "createdAt" | "updatedAt" | "status" | "imageUrl">;

