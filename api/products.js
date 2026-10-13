// Vercel serverless function: lee productos y variantes de Tiendanube.
// El token vive en la variable de entorno TIENDANUBE_TOKEN (nunca en el HTML).
const STORE_ID = process.env.TIENDANUBE_STORE_ID || "4249527";

module.exports = async (req, res) => {
  const token = process.env.TIENDANUBE_TOKEN;
  if (!token) {
    res.status(500).json({ error: "Falta la variable TIENDANUBE_TOKEN en Vercel" });
    return;
  }
  try {
    const out = [];
    for (let page = 1; page <= 10; page++) {
      const url = `https://api.tiendanube.com/v1/${STORE_ID}/products?per_page=200&page=${page}&fields=id,handle,canonical_url,published,variants`;
      const r = await fetch(url, {
        headers: {
          Authentication: `bearer ${token}`,
          "User-Agent": "Sadima Recomendador",
          "Content-Type": "application/json",
        },
      });
      if (r.status === 404) break; // sin más páginas
      if (!r.ok) {
        res.status(502).json({ error: "Tiendanube respondió " + r.status });
        return;
      }
      const items = await r.json();
      if (!Array.isArray(items) || items.length === 0) break;
      for (const p of items) {
        const handle =
          (p.canonical_url || "").split("/").filter(Boolean).pop() ||
          (p.handle && (p.handle.es || Object.values(p.handle)[0])) ||
          "";
        out.push({
          handle,
          published: p.published !== false,
          variants: (p.variants || []).map((v) => ({
            id: v.id,
            values: (v.values || []).map((x) => (x && (x.es || Object.values(x)[0])) || ""),
            price: Number(v.price) || null,
            promo: Number(v.promotional_price) || null,
            stock: v.stock_management ? v.stock : null,
          })),
        });
      }
      if (items.length < 200) break;
    }
    res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate=3600");
    res.status(200).json({ updated: new Date().toISOString(), products: out });
  } catch (e) {
    res.status(502).json({ error: "No se pudo leer Tiendanube" });
  }
};
