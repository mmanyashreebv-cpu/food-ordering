
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const strip = (prefix) => (path) =>
  path.replace(new RegExp(`^${prefix}`), "");

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api/inventory": {
        target: "http://localhost:8001",
        rewrite: strip("/api/inventory"),
      },
      "/api/orders": {
        target: "http://localhost:8002",
        rewrite: strip("/api/orders"),
      },
      "/api/users": {
        target: "http://localhost:8003",
        rewrite: strip("/api/users"),
      },
    },
  },
});
