import { createServer } from "node:http";
import { product_router } from "./routers/product.router.js";
import { healthRoute } from "./routers/health.router.js";
import { imageRouter } from "./routers/image.router.js";

const PORT = 3000;
const IMAGE_PORT = 4000;

const server = createServer((req, res) => {
    product_router(req, res);
});

const healthCheck = createServer((req, res) => {
    healthRoute(req, res);
})

const imageServer = createServer((req, res) => {
    void imageRouter(req, res);
})

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/api/v2.0.0`);
});

imageServer.listen(IMAGE_PORT, () => {
  console.log(`Waiting for Image Request at http://localhost:${IMAGE_PORT}`)
})

healthCheck.listen(1200, () => {
  console.log(`Health check at http://localhost:1200`);
})