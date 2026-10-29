import type { ApiEnvelope, Product } from "../types/types.js";

export const API_BASE = "http://localhost:3000" as const;
export const IMAGE_BASE = "http://localhost:4000/images" as const;

export async function fetchProducts(): Promise<Product[]> {
  const response = await fetch(`${API_BASE}/api/v2.0.0/products?page=1&limit=50`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as ApiEnvelope<Product[]>;
  return Array.isArray(payload?.data) ? payload.data : [];
}
