import type { Product } from "../types/types.js";

export type SortDirection = "asc" | "desc";

export const state: {
  products: Product[];
  selectedCategory: string;
  sortDirection: SortDirection;
} = {
  products: [],
  selectedCategory: "all",
  sortDirection: "asc",
};
