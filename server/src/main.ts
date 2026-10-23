import { createServer } from "node:http";
import { product_router } from "./routers/product.router.js";
import { healthRoute } from "./routers/health.router.js";

const PORT = 3000;

const server = createServer((req, res) => {
    product_router(req, res);
    // healthRoute(req, res);
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/api/v2.0.0`);
});