import type { Product } from "../../types/types.js";

const API_BASE = "http://localhost:3000";
const IMAGE_BASE = "http://localhost:4000/images";

const form = document.getElementById("productForm") as HTMLFormElement | null;
const nameInput = document.getElementById("name") as HTMLInputElement | null;
const skuInput = document.getElementById("sku") as HTMLInputElement | null;
const descriptionInput = document.getElementById("description") as HTMLTextAreaElement | null;
const brandInput = document.getElementById("brand") as HTMLInputElement | null;
const categoryInput = document.getElementById("categories") as HTMLSelectElement | null;
const categoryTrigger = document.getElementById("categoriesTrigger") as HTMLButtonElement | null;
const categoryMenu = document.getElementById("categoriesMenu") as HTMLDivElement | null;
const categorySelectWrapper = document.getElementById("categorySelectWrapper") as HTMLDivElement | null;
const priceInput = document.getElementById("price") as HTMLInputElement | null;
const compareAtPriceInput = document.getElementById("compareAtPrice") as HTMLInputElement | null;
const stockInput = document.getElementById("stockQuantity") as HTMLInputElement | null;
const imageInput = document.getElementById("image") as HTMLInputElement | null;
const submitButton = document.getElementById("submitButton") as HTMLButtonElement | null;
const resetButton = document.getElementById("resetButton") as HTMLButtonElement | null;
const productGrid = document.getElementById("productGrid") as HTMLElement | null;
const statusBox = document.getElementById("statusBox") as HTMLElement | null;
const selectedProductId = document.getElementById("selectedProductId") as HTMLInputElement | null;

const state: {
  products: Product[];
  selectedId: string | null;
} = {
  products: [],
  selectedId: null,
};

function setStatus(message: string, isError = false): void {
  if (!statusBox) return;

  statusBox.textContent = message;
  statusBox.classList.toggle("error", isError);
}

function parseCategories(raw: string): string[] {
  if (!raw.trim()) return [];

  const maybeParsed = raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (maybeParsed.length > 0) {
    return maybeParsed;
  }

  return raw
    .replace(/\[|\]|\"/g, "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getSelectedCategories(select: HTMLSelectElement | null): string[] {
  if (!select) return [];

  return Array.from(select.selectedOptions)
    .map((option) => option.value.trim())
    .filter(Boolean);
}

function syncCategorySelection(): void {
  if (!categoryInput || !categoryTrigger || !categoryMenu) return;

  const selectedValues = getSelectedCategories(categoryInput);
  const selectedLabel = selectedValues.length ? selectedValues.join(", ") : "Select categories";

  const valueNode = categoryTrigger.querySelector(".select-value");
  if (valueNode) {
    valueNode.textContent = selectedLabel;
  }

  categoryMenu.querySelectorAll(".category-option").forEach((option) => {
    const button = option as HTMLButtonElement;
    const isSelected = selectedValues.includes(button.dataset.value ?? "");
    button.classList.toggle("is-selected", isSelected);
    button.setAttribute("aria-selected", String(isSelected));
  });
}

function setCategoryValue(value: string, isSelected: boolean): void {
  if (!categoryInput) return;

  const option = Array.from(categoryInput.options).find((item) => item.value === value);
  if (!option) return;

  option.selected = isSelected;
  syncCategorySelection();
}

function buildFormData(): FormData {
  const formData = new FormData();

  if (!nameInput || !skuInput || !descriptionInput || !brandInput || !categoryInput || !priceInput || !compareAtPriceInput || !stockInput) {
    throw new Error("Missing form fields");
  }

  const selectedCategories = getSelectedCategories(categoryInput);

  formData.append("name", nameInput.value.trim());
  formData.append("sku", skuInput.value.trim());
  formData.append("description", descriptionInput.value.trim());
  formData.append("brand", brandInput.value.trim());
  formData.append("categoriesId", JSON.stringify(selectedCategories));
  formData.append("price", String(Number(priceInput.value)));
  formData.append("compareAtPrice", String(Number(compareAtPriceInput.value)));
  formData.append("stockQuantity", String(Number(stockInput.value)));

  if (imageInput && imageInput.files && imageInput.files[0]) {
    formData.append("image", imageInput.files[0]);
  }

  return formData;
}

function resetForm(): void {
  form?.reset();
  if (categoryInput) {
    Array.from(categoryInput.options).forEach((option) => {
      option.selected = false;
    });
  }
  syncCategorySelection();
  state.selectedId = null;
  if (selectedProductId) selectedProductId.value = "";
  if (submitButton) submitButton.textContent = "Create product";
}

function fillForm(product: Product): void {
  if (!nameInput || !skuInput || !descriptionInput || !brandInput || !categoryInput || !priceInput || !compareAtPriceInput || !stockInput || !selectedProductId) {
    return;
  }

  state.selectedId = product._id;
  selectedProductId.value = product._id;
  nameInput.value = product.name;
  skuInput.value = product.sku;
  descriptionInput.value = product.description;
  brandInput.value = product.brand;
  Array.from(categoryInput.options).forEach((option) => {
    option.selected = product.categoriesId.includes(option.value);
  });
  syncCategorySelection();
  priceInput.value = String(product.price);
  compareAtPriceInput.value = String(product.compareAtPrice);
  stockInput.value = String(product.stockQuantity);

  if (submitButton) {
    submitButton.textContent = `Update product (${product.name})`;
  }
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value || 0);
}

function renderProducts(): void {
  if (!productGrid) return;

  if (!state.products.length) {
    productGrid.innerHTML = `
      <div class="empty-card">
        <h3>No products yet</h3>
      </div>
    `;
    return;
  }

  productGrid.innerHTML = state.products
    .map((product) => `
      <article class="mini-card ${state.selectedId === product._id ? "selected" : ""}" data-id="${product._id}">
        <div class="mini-image-wrap">
          <img src="${product.imageUrl ? `${IMAGE_BASE}/${encodeURIComponent(product.imageUrl)}` : "https://placehold.co/400x300/EEF2FF/1F2937?text=No+Image"}" alt="${product.name}" />
        </div>
        <div class="mini-card-body">
          <div class="mini-row">
            <strong class="mini-title">${product.name}</strong>
            <span class="mini-badge ${product.status}">${product.status}</span>
          </div>
          <p class="mini-brand">${product.brand}</p>
          <p class="mini-price">${formatMoney(product.price)}</p>
          <p class="mini-meta">SKU: ${product.sku}</p>
          <p class="mini-meta">Stock: ${product.stockQuantity}</p>
          <p class="mini-meta mini-categories">Categories: ${product.categoriesId.join(", ") || "General"}</p>
          <button
            type="button"
            class="delete-button"
            data-id="${product._id}"
            aria-label="Delete ${product.name}"
          >
            Delete
          </button>
        </div>
      </article>
    `)
    .join("");

  productGrid.querySelectorAll(".mini-card").forEach((card) => {
    card.addEventListener("click", () => {
      const id = card.getAttribute("data-id");
      const selected = state.products.find((product) => product._id === id);
      if (selected) {
        fillForm(selected);
      }
    });
  });

  productGrid.querySelectorAll(".delete-button").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const id = button.getAttribute("data-id");
      if (id) {
        void deleteProduct(id);
      }
    });
  });
}

async function fetchProducts(): Promise<Product[]> {
  const response = await fetch(`${API_BASE}/api/v2.0.0/products?page=1&limit=50`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  const payload = (await response.json()) as { data?: Product[] };
  return Array.isArray(payload.data) ? payload.data : [];
}

async function deleteProduct(productId: string): Promise<void> {
  const product = state.products.find((item) => item._id === productId);
  if (!product) return;

  const confirmed = window.confirm(`Delete "${product.name}"?`);
  if (!confirmed) return;

  try {
    setStatus(`Deleting ${product.name}...`);

    const response = await fetch(`${API_BASE}/api/v2.0.0/products/${productId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error(`Delete failed (${response.status})`);
    }

    if (state.selectedId === productId) {
      resetForm();
    }

    await loadProducts(`Product "${product.name}" deleted successfully`);
  } catch (error) {
    console.error(error);
    setStatus(error instanceof Error ? error.message : "Delete failed.", true);
  }
}

async function loadProducts(statusMessage?: string): Promise<void> {
  try {
    setStatus(statusMessage ?? "Loading products...");
    const freshProducts = await fetchProducts();
    state.products = freshProducts;
    renderProducts();
    setStatus(statusMessage ?? `${state.products.length} products loaded`);
  } catch (error) {
    console.error(error);
    setStatus("Could not load products from the API.", true);
  }
}

async function refreshAfterSave(message: string): Promise<void> {
  setStatus(`${message} — refreshing list...`);
  await new Promise((resolve) => setTimeout(resolve, 350));
  await loadProducts(message);
}

async function submitProduct(event: SubmitEvent): Promise<void> {
  event.preventDefault();

  if (!form) return;

  const formData = buildFormData();

  try {
    setStatus("Saving product...");

    const isUpdate = Boolean(state.selectedId);
    let successMessage = "Product created successfully";
    if (isUpdate) {
      const currentProduct = state.products.find((product) => product._id === state.selectedId);
      const requestData = new FormData();

      for (const [key, value] of formData.entries()) {
        requestData.append(key, value as string | Blob);
      }

      if (imageInput && imageInput.files && imageInput.files[0]) {
        requestData.append("imageUrl", currentProduct?.imageUrl ?? "");
      }

      const response = await fetch(`${API_BASE}/api/v2.0.0/products/${state.selectedId}`, {
        method: "PATCH",
        body: requestData,
      });

      if (!response.ok) {
        throw new Error(`Update failed (${response.status})`);
      }

      successMessage = "Product updated successfully";
    } else {
      if (!imageInput || !imageInput.files || !imageInput.files[0]) {
        throw new Error("Image is required for creating a product.");
      }

      const response = await fetch(`${API_BASE}/api/v2.0.0/products`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Create failed (${response.status})`);
      }
    }

    resetForm();

    if (isUpdate) {
      await refreshAfterSave(successMessage);
    } else {
      await loadProducts(successMessage);
    }

    form.reset();
  } catch (error) {
    console.error(error);
    setStatus(error instanceof Error ? error.message : "Request failed.", true);
  }
}

if (categoryTrigger && categoryMenu && categorySelectWrapper) {
  categoryTrigger.addEventListener("click", () => {
    const isOpen = categorySelectWrapper.classList.toggle("is-open");
    categoryTrigger.setAttribute("aria-expanded", String(isOpen));
  });

  categoryMenu.addEventListener("click", (event: Event) => {
    const target = event.target as HTMLElement;
    const option = target.closest(".category-option") as HTMLButtonElement | null;
    if (!option) return;

    const value = option.dataset.value ?? "";
    if (!value) return;

    const isSelected = !option.classList.contains("is-selected");
    option.classList.toggle("is-selected", isSelected);
    option.setAttribute("aria-selected", String(isSelected));
    setCategoryValue(value, isSelected);
  });

  document.addEventListener("click", (event: Event) => {
    const target = event.target as Node;
    if (!categorySelectWrapper.contains(target)) {
      categorySelectWrapper.classList.remove("is-open");
      categoryTrigger.setAttribute("aria-expanded", "false");
    }
  });

  categoryTrigger.addEventListener("keydown", (event: KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown") {
      event.preventDefault();
      const isOpen = !categorySelectWrapper.classList.contains("is-open");
      categorySelectWrapper.classList.toggle("is-open", isOpen);
      categoryTrigger.setAttribute("aria-expanded", String(isOpen));
      if (isOpen) {
        const firstOption = categoryMenu.querySelector(".category-option") as HTMLButtonElement | null;
        firstOption?.focus();
      }
    }

    if (event.key === "Escape" && categorySelectWrapper.classList.contains("is-open")) {
      categorySelectWrapper.classList.remove("is-open");
      categoryTrigger.setAttribute("aria-expanded", "false");
      categoryTrigger.focus();
    }
  });

  categoryMenu.addEventListener("keydown", (event: KeyboardEvent) => {
    const options = Array.from(categoryMenu.querySelectorAll(".category-option")) as HTMLButtonElement[];
    const currentIndex = options.findIndex((option) => option === document.activeElement);

    if (event.key === "ArrowDown") {
      event.preventDefault();
      const nextIndex = currentIndex < options.length - 1 ? currentIndex + 1 : 0;
      options[nextIndex]?.focus();
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      const nextIndex = currentIndex > 0 ? currentIndex - 1 : options.length - 1;
      options[nextIndex]?.focus();
    }

    if (event.key === "Escape") {
      event.preventDefault();
      categorySelectWrapper.classList.remove("is-open");
      categoryTrigger.setAttribute("aria-expanded", "false");
      categoryTrigger.focus();
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const activeOption = document.activeElement as HTMLButtonElement | null;
      if (!activeOption) return;

      const value = activeOption.dataset.value ?? "";
      if (!value) return;

      const isSelected = !activeOption.classList.contains("is-selected");
      activeOption.classList.toggle("is-selected", isSelected);
      activeOption.setAttribute("aria-selected", String(isSelected));
      setCategoryValue(value, isSelected);
    }
  });
}

if (form) {
  form.addEventListener("submit", submitProduct);
}

if (resetButton) {
  resetButton.addEventListener("click", () => {
    resetForm();
    setStatus("Form reset");
  });
}

syncCategorySelection();
void loadProducts();
