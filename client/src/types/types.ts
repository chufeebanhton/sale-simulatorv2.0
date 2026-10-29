export type ProductStatus = "active" | "inactive";

export interface Product {
  id: string | null;
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
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ApiEnvelope<T> {
  status: "success" | "error";
  message: string;
  data: T;
  meta: {
    timestamp: string;
  };
}
