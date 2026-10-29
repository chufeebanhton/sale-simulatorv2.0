import { fetchProducts } from "../../api/api.js";
import { state } from "../../shared/state.js";
import { renderCategories, renderProducts, setStatus } from "../../shared/ui.js";

const categoryFilter = document.getElementById("categoryFilter") as HTMLButtonElement | null;
const categoryFilterMenu = document.getElementById("categoryFilterMenu") as HTMLDivElement | null;
const categoryFilterContainer = document.getElementById("categoryFilterContainer") as HTMLDivElement | null;
const sortButton = document.getElementById("sortButton") as HTMLButtonElement | null;
const productGrid = document.getElementById("productGrid");

if (!categoryFilter || !categoryFilterMenu || !categoryFilterContainer || !sortButton || !productGrid) {
  throw new Error("Required product page elements are missing.");
}

const categoryTrigger = categoryFilter;
const categoryList = categoryFilterMenu;
const categoryBox = categoryFilterContainer;

function setCategoryFilterState(value: string): void {
  state.selectedCategory = value;
  const selectedLabel = value === "all" ? "All categories" : value;
  const selectedValue = categoryTrigger.querySelector(".select-value");
  if (selectedValue) {
    selectedValue.textContent = selectedLabel;
  }

  categoryList.querySelectorAll(".select-option").forEach((option) => {
    const button = option as HTMLButtonElement;
    const isSelected = button.dataset.value === value;
    button.classList.toggle("is-selected", isSelected);
    button.setAttribute("aria-selected", String(isSelected));
  });

  categoryTrigger.setAttribute("aria-label", `Selected category: ${selectedLabel}`);
  categoryTrigger.setAttribute("aria-expanded", "false");
  categoryBox.classList.remove("is-open");
  renderProducts();
}

categoryTrigger.addEventListener("click", () => {
  const isOpen = categoryBox.classList.toggle("is-open");
  categoryTrigger.setAttribute("aria-expanded", String(isOpen));
});

categoryList.addEventListener("click", (event: Event) => {
  const target = event.target as HTMLElement;
  const option = target.closest(".select-option") as HTMLButtonElement | null;
  if (!option) return;

  const value = option.dataset.value ?? "all";
  setCategoryFilterState(value);
});

document.addEventListener("click", (event: Event) => {
  const target = event.target as Node;
  if (!categoryBox.contains(target)) {
    categoryBox.classList.remove("is-open");
    categoryTrigger.setAttribute("aria-expanded", "false");
  }
});

categoryTrigger.addEventListener("keydown", (event: KeyboardEvent) => {
  if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown") {
    event.preventDefault();
    const isOpen = !categoryBox.classList.contains("is-open");
    categoryBox.classList.toggle("is-open", isOpen);
    categoryTrigger.setAttribute("aria-expanded", String(isOpen));
    if (isOpen) {
      const firstOption = categoryList.querySelector(".select-option") as HTMLButtonElement | null;
      firstOption?.focus();
    }
  }
  if (event.key === "Escape" && categoryBox.classList.contains("is-open")) {
    categoryBox.classList.remove("is-open");
    categoryTrigger.setAttribute("aria-expanded", "false");
    categoryTrigger.focus();
  }
});

categoryList.addEventListener("keydown", (event: KeyboardEvent) => {
  const options = Array.from(categoryList.querySelectorAll(".select-option")) as HTMLButtonElement[];
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
    categoryBox.classList.remove("is-open");
    categoryTrigger.setAttribute("aria-expanded", "false");
    categoryTrigger.focus();
  }

  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    const activeOption = document.activeElement as HTMLButtonElement | null;
    if (activeOption?.dataset.value) {
      setCategoryFilterState(activeOption.dataset.value);
    }
  }
});

sortButton.addEventListener("click", () => {
  state.sortDirection = state.sortDirection === "asc" ? "desc" : "asc";
  sortButton.textContent =
    state.sortDirection === "asc" ? "Sort: Price ↑" : "Sort: Price ↓";
  renderProducts();
});

const safeProductGrid = productGrid as HTMLElement;

async function loadProducts(): Promise<void> {
  try {
    setStatus("Loading products...");
    const products = await fetchProducts();

    state.products = products;
    renderCategories(products);
    renderProducts();
    setStatus(`${products.length} products loaded`);
  } catch (error) {
    console.error(error);
    setStatus(
      "Unable to load products. Make sure the API server is running on localhost:3000.",
      true
    );
    safeProductGrid.innerHTML = `
      <div class="empty">
        <h3>Could not load products</h3>
        <p>Check that the server is running and the API is available at <strong>http://localhost:3000</strong>.</p>
      </div>
    `;
  }
}

sortButton.textContent = "Sort: Price ↑";
void loadProducts();
