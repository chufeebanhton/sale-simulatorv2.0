export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  categoryId: string[];
  brand: string;
  price: number;
  stockQuantity: number;
  imageUrl: string;
  status: "active" | "inactive";
  createdAt: number;
  updatedAt: number;
}

export type ProductInput = Omit<Product, "id" | "createdAt" | "updatedAt">;

