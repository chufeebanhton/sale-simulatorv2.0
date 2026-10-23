import { createServer } from "node:http";
// import { router } from "./router/router.js";
import { healthRoute } from "./router/health.router.js";

const PORT = 3000;

const server = createServer((req, res) => {
//   router(req, res);
    healthRoute(req, res);
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/api/v2.0.0`);
});