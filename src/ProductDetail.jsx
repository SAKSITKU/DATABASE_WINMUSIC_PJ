// ProductDetail.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext.jsx";

const API = import.meta.env.VITE_API_BASE;

const getImageUrl = (u) =>
  !u ? "https://placehold.co/600x400?text=No+Image" : (u.startsWith("http") ? u : `${API}${u}`);

// 🧰 รวมค่าให้รองรับทั้ง camelCase/PascalCase
const pick = (obj, keys) => {
  for (const k of keys) {
    if (obj?.[k] !== undefined && obj?.[k] !== null) return obj[k];
  }
  return undefined;
};

// ทำให้ product เป็นรูปแบบเดียว
const normalize = (p = {}) => ({
  id: pick(p, ["id", "ProductID"]),
  name: pick(p, ["name", "ProductName"]),
  price: pick(p, ["price", "UnitPrice"]),
  stock: pick(p, ["stock", "UnitsInStock"]),
  image_url: pick(p, ["image_url", "ImageURL"]),
  category_id: pick(p, ["category_id", "CategoryID"]),
  supplier_id: pick(p, ["supplier_id", "SupplierID"]),
  description: pick(p, ["description", "Description"]),
  date_added: pick(p, ["date_added", "DateAdded"]),
  last_updated: pick(p, ["last_updated", "LastUpdated"]),

  // เก็บต้นฉบับไว้เผื่อที่อื่นอ้างอิง
  _raw: p,
});

export default function ProductDetail({ product, onBack, onEdit }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin";

  // เก็บ product ที่ normalize แล้วไว้ใช้จริง
  const [prod, setProd] = useState(() => normalize(product || {}));

  // โหลดรายละเอียดเต็มหากข้อมูลที่ได้มา “ยังไม่ครบ”
  // ✅ ไม่รีเซ็ตซ้ำถ้าเคยโหลดแล้ว
useEffect(() => {
  if (!product) return;
  const now = normalize(product);
  // ถ้ายังไม่มีข้อมูลเลย (ตอนเปิดครั้งแรก) → เซ็ต
  setProd((prev) => (prev?.id ? prev : now));

  // โหลดเพิ่มเฉพาะตอนยังไม่มีข้อมูลสำคัญ
  const needsFetch =
    now &&
    (!now.category_name && !now.category_id) ||
    (!now.supplier_name && !now.supplier_id) ||
    !now.description;

  if (!now.id || !needsFetch) return;

  (async () => {
    try {
      const r = await fetch(`${API}/api/products/${now.id}`);
      if (!r.ok) throw new Error("load detail failed");
      const full = await r.json();
      setProd(normalize({ ...now._raw, ...full }));
    } catch (e) {
      console.error("❌ load product detail:", e);
    }
  })();
}, [product]);


  const [category, setCategory] = useState(null);
  const [supplier, setSupplier] = useState(null);

  // โหลดชื่อ Category / Supplier เมื่อมี id
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (prod.category_id) {
          const r = await fetch(`${API}/api/categories/${prod.category_id}`);
          const d = r.ok ? await r.json() : null;
          if (alive) setCategory(d);
        } else setCategory(null);

        if (prod.supplier_id) {
          const r = await fetch(`${API}/api/suppliers/${prod.supplier_id}`);
          const d = r.ok ? await r.json() : null;
          if (alive) setSupplier(d);
        } else setSupplier(null);
      } catch {/* ignore */}
    })();
    return () => { alive = false; };
  }, [prod.category_id, prod.supplier_id]);

  const fields = useMemo(() => ([
    ["Price (฿)", prod.price ?? 0],
    ["Stock", prod.stock ?? 0],
    ["Category", category?.CategoryName ?? (prod.category_id ?? "-")],
    ["Supplier", supplier?.CompanyName ?? (prod.supplier_id ?? "-")],
    ["Date Added", prod.date_added ? new Date(prod.date_added).toLocaleString() : "-"],
    ["Last Updated", prod.last_updated ? new Date(prod.last_updated).toLocaleString() : "-"],
  ]), [prod, category, supplier]);

  if (!prod.id) return null;

  return (
    <div className="sc-page">
      <header className="sc-nav">
        <div className="brand">WIN MUSIC</div>
        <div className="actions" style={{ display: "flex", gap: 8 }}>
          <button className="btn-outline" onClick={onBack}>← Back</button>
        </div>
        <div className="search"><input placeholder="Search for products..." disabled /></div>
        <div className="icons"><span>👤</span><span>🛒</span><span>⚙️</span></div>
      </header>

      <section className="sc-section">
        <div className="section-head"><h2>PRODUCT DETAIL</h2></div>

        <div className="form-card" style={{ display: "grid", gridTemplateColumns: "0.9fr 1.1fr", gap: 18 }}>
          <div>
            <div className="preview" style={{ minHeight: 260 }}>
              {prod.image_url
                ? <img src={getImageUrl(prod.image_url)} alt={prod.name || `#${prod.id}`} />
                : <div className="ph">No image</div>}
            </div>
          </div>

          <div className="form-col">
            <h2 style={{ margin: "6px 0 12px" }}>{prod.name || `#${prod.id}`}</h2>

            <div className="row-2">
              {fields.map(([label, val]) => (
                <div key={label} style={{ marginBottom: 8 }}>
                  <label style={{ display: "block", color: "#6b7280", fontSize: 13 }}>{label}</label>
                  <div style={{ padding: "10px 12px", border: "1px solid var(--line)", borderRadius: 10, background: "#f8fafc" }}>
                    {String(val)}
                  </div>
                </div>
              ))}
            </div>

            <div className="row-2" style={{ marginTop: 8 }}>
              <div>
                <label style={{ display: "block", color: "#6b7280", fontSize: 13 }}>Product Description</label>
                <div style={{ padding: "10px 12px", border: "1px solid var(--line)", borderRadius: 10, background: "#f8fafc" }}>
                  {prod.description?.toString().trim() || "-"}
                </div>
              </div>
              <div>
                <label style={{ display: "block", color: "#6b7280", fontSize: 13 }}>Supplier Contact</label>
                <div style={{ padding: "10px 12px", border: "1px solid var(--line)", borderRadius: 10, background: "#f8fafc" }}>
                  {supplier?.ContactName ?? "-"}
                </div>
              </div>
            </div>

            <div className="actions" style={{ display: "flex", gap: 10 , marginTop: 12 }}>
              {isAdmin && (
                <button className="btn-dark" onClick={() => onEdit?.(prod)}>
                  EDIT
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <footer className="sc-foot">© 2025 WIN MUSIC — All rights reserved.</footer>
    </div>
  );
}
