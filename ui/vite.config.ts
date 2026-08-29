import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// TrueForge ships no CORS middleware, so the app has to be same-origin with the
// harness. Everything under /api is proxied to it, and SSE needs buffering off
// or turn events arrive in one lump at the end.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    dedupe: ["react", "react-dom"],
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8790",
        changeOrigin: true,
        configure(proxy) {
          proxy.on("proxyRes", (res) => {
            if (res.headers["content-type"]?.includes("text/event-stream")) {
              res.headers["cache-control"] = "no-cache";
              res.headers["x-accel-buffering"] = "no";
            }
          });
        },
      },
    },
  },
});
