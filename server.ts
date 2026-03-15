import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Proxy for Warframe.market API to avoid CORS issues
  app.get("/api/wm/:path(*)", async (req, res) => {
    try {
      const targetPath = req.params.path;
      const query = new URLSearchParams(req.query as any).toString();
      const url = `https://api.warframe.market/v1/${targetPath}${query ? `?${query}` : ""}`;
      
      const response = await fetch(url, {
        headers: {
          "Language": "en",
          "Platform": "pc",
          "Accept": "application/json",
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to fetch from Warframe.market" });
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Proxy error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
