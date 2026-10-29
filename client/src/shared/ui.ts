import { IMAGE_BASE } from "../api/api.js";
import { state } from "./state.js";
import type { Product } from "../types/types.js";

function formatPrice(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value) || 0);
}

export function setStatus(message: string, isError = false): void {
  const statusNode = document.getElementById("status");
  if (!statusNode) return;

  statusNode.textContent = message;
  statusNode.style.color = isError ? "#b91c1c" : "#64748b";
}

function getVisibleProducts(): Product[] {
  const filtered =
    state.selectedCategory === "all"
      ? state.products
      : state.products.filter(
          (product) =>
            Array.isArray(product.categoriesId) &&
            product.categoriesId.includes(state.selectedCategory)
        );

  const sorted = [...filtered];
  sorted.sort((a, b) => {
    const delta = Number(a.price) - Number(b.price);
    return state.sortDirection === "asc" ? delta : -delta;
  });

  return sorted;
}

function getImageUrl(product: Product): string {
  const fileName = product?.imageUrl || "";
  if (!fileName) {
    return "https://placehold.co/800x800/EEF2FF/1F2937?text=No+Image";
  }

  return `${IMAGE_BASE}/${encodeURIComponent(fileName)}`;
}

export function renderCategories(products: Product[]): void {
  const categoryMenu = document.getElementById("categoryFilterMenu") as HTMLDivElement | null;
  const categoryFilter = document.getElementById("categoryFilter") as HTMLButtonElement | null;
  if (!categoryMenu || !categoryFilter) return;

  const categories = [
    ...new Set(
      products.flatMap((product) =>
        Array.isArray(product.categoriesId) ? product.categoriesId : []
      )
    ),
  ].sort((a, b) => a.localeCompare(b));

  const options = [
    '<button type="button" class="select-option" role="option" data-value="all" aria-selected="true">All categories</button>',
  ];

  categories.forEach((category) => {
    options.push(
      `<button type="button" class="select-option" role="option" data-value="${category}" aria-selected="false">${category}</button>`
    );
  });

  categoryMenu.innerHTML = options.join("");

  const currentValue = state.selectedCategory === "all" ? "all" : state.selectedCategory;
  const currentLabel = currentValue === "all" ? "All categories" : currentValue;

  categoryFilter.querySelector(".select-value")!.textContent = currentLabel;
  categoryFilter.setAttribute("aria-label", `Selected category: ${currentLabel}`);

  categoryMenu.querySelectorAll(".select-option").forEach((option) => {
    const button = option as HTMLButtonElement;
    const isSelected = button.dataset.value === currentValue;
    button.classList.toggle("is-selected", isSelected);
    button.setAttribute("aria-selected", String(isSelected));
  });
}

export function renderProducts(): void {
  const productGrid = document.getElementById("productGrid");
  if (!productGrid) return;

  const visibleProducts = getVisibleProducts();

  if (!visibleProducts.length) {
    productGrid.innerHTML = `
      <div class="empty">
        <h3>No products found</h3>
        <p>Try a different category or sort order.</p>
      </div>
    `;
    return;
  }

  productGrid.innerHTML = visibleProducts
    .map((product) => {
      const productCategories = Array.isArray(product.categoriesId)
        ? product.categoriesId
        : [];
      const stockText =
        product.stockQuantity > 0 ? `${product.stockQuantity} left` : "Out of stock";

      return `
        <article class="card">
          <img
            class="thumb"
            src="${getImageUrl(product)}"
            alt="${product.name}"
            loading="lazy"
          />
          <div class="content">
            <div class="meta-row">
              <span class="chip">${productCategories.slice(0, 2).join(" • ") || "General"}</span>
              <span class="status-pill ${product.status}">${product.status}</span>
            </div>

            <h3>${product.name}</h3>
            <p class="brand">${product.brand}</p>
            <p class="description">${product.description}</p>

            <div class="price-row">
              <span class="price">${formatPrice(product.price)}</span>
              <span class="compare">${product.compareAtPrice ? formatPrice(product.compareAtPrice) : ""}</span>
            </div>

            <div class="stock">
              <span>${stockText}</span>
              <span>SKU: ${product.sku}</span>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}
