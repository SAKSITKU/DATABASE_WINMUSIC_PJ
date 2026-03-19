// AddProduct.jsx
import { useEffect, useState } from "react";
import { useAuth } from "./AuthContext.jsx";
const API = import.meta.env.VITE_API_BASE;
const safeJson = async (res) => {
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { _raw: text }; }
};

export default function AddProduct({ onBack, onCreated }) {
  const [form, setForm] = useState({
    name: "", price: "", stock: "", image_url: "",
    category_id: "",                   // <-- ใช้ id แทน name
    supplier_company: "", supplier_contact: "",
    supplier_addr: "", supplier_postal: "", supplier_country: "",
    description: "",
  });
  const [categories, setCategories] = useState([]);
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API}/api/categories`);
        const j = await r.json();
        setCategories(Array.isArray(j) ? j : []);
      } catch (e) {
        console.error(e);
        alert("โหลดหมวดหมู่ไม่สำเร็จ");
      }
    })();
  }, []);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const { authFetch } = useAuth();
  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };
  const onPickFile = (e) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : "");
  };

  // สร้าง Supplier ถ้ากรอกชื่อบริษัทมา แล้วคืนค่า id
  const createSupplierIfNeeded = async () => {
    const hasSup =
      (form.supplier_company && form.supplier_company.trim().length > 0) ||
      (form.supplier_contact && form.supplier_contact.trim().length > 0) ||
      (form.supplier_addr && form.supplier_addr.trim().length > 0) ||
      (form.supplier_postal && form.supplier_postal.trim().length > 0) ||
      (form.supplier_country && form.supplier_country.trim().length > 0);
    if (!hasSup) return null;
    const res = await fetch(`${API}/api/suppliers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        CompanyName: form.supplier_company?.trim() || "(Unnamed)",
        ContactName: form.supplier_contact?.trim() || null,
        Address: form.supplier_addr?.trim() || null,
        PostalCode: form.supplier_postal?.trim() || null,
        Country: form.supplier_country?.trim() || null,
      }),
    });
    const j = await safeJson(res);
    if (!res.ok) throw new Error(j?.error || j?.detail || res.statusText);
    if (!j || typeof j.id !== "number") {
      throw new Error("Create supplier failed");
    }
    return j.id;

  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (!form.category_id) throw new Error("กรุณาเลือก Category");
      const supplierId = await createSupplierIfNeeded();

      // 2) สร้าง Product โดยอ้างอิง category_id จาก dropdown + supplierId (ถ้ามี)
      // ...ภายใน onSubmit(e) { ... }
      let res;

      if (file) {
        // ✅ ใช้ตัวแปร body ให้ตลอด
        const body = new FormData();
        body.append("name", form.name);
        body.append("price", String(Number(form.price) || 0));
        body.append("stock", String(Number(form.stock) || 0));
        body.append("category_id", String(form.category_id));
        if (form.supplier_id) body.append("supplier_id", String(form.supplier_id));
        else {
          if (form.supplier_company) body.append("supplier_company", form.supplier_company);
          if (form.supplier_contact) body.append("supplier_contact", form.supplier_contact);
          if (form.supplier_addr) body.append("supplier_addr", form.supplier_addr);
          if (form.supplier_postal) body.append("supplier_postal", form.supplier_postal);
          if (form.supplier_country) body.append("supplier_country", form.supplier_country);
        }
        if (form.description?.trim()) body.append("description", form.description.trim()); // ✅
        if (file) body.append("image", file);
        res = await authFetch(`${API}/api/products`, { method: "POST", body });
      } else {
        res = await authFetch(`${API}/api/products`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name.trim(),
            price: Number(form.price) || 0,
            stock: Number(form.stock) || 0,
            category_id: Number(form.category_id),
            description: form.description?.trim() || null,      // ✅
            // supplier_id ...
          }),
        });
      }

      const j = await safeJson(res);
      if (!res.ok) throw new Error(j?.error || j?.detail || res.statusText || "Create product failed");
      onCreated?.();
      setForm({
        name: "", price: "", stock: "", image_url: "",
        category_id: "",
        supplier_company: "", supplier_contact: "",
        supplier_addr: "", supplier_postal: "", supplier_country: "",
      });
      setFile(null);
      setPreview("");
    } catch (err) {
      alert("เพิ่มสินค้าไม่สำเร็จ: " + err.message);
    } finally {
      setSaving(false);
    }
  };


  return (
    <div className="sc-page">
      <header className="sc-nav">
        <div className="brand">WIN MUSIC</div>
        <div className="nav-center">
          <button className="btn-outline" onClick={onBack}>← Back</button>
          <button className="btn-outline" disabled>ADD PRODUCT</button>
        </div>
        <div className="search"><input placeholder="Search for products..." disabled /></div>
        <div className="icons"><span>👤</span><span>🛒</span><span>⚙️</span></div>
      </header>

      <section className="sc-section">
        <div className="section-head"><h2>Add New Product</h2></div>

        <form className="card form-grid" onSubmit={onSubmit}>
          {/* ซ้าย */}
          <div className="col">
            <div className="field">
              <label className="label required">Product Name</label>
              <input className="input" name="name" value={form.name} onChange={onChange} required />
            </div>

            <div className="grid-2">
              <div className="field">
                <label className="label">Price (฿)</label>
                <input className='input' type="number" step="0.01" name="price" value={form.price} onChange={onChange} placeholder="19999" />
              </div>
              <div className="field">
                <label className="label">Stock</label>
                <input className="input" type="number" name="stock" value={form.stock} onChange={onChange} placeholder="10" />
              </div>
            </div>

            <div className="field">
              <label className="label required">Category</label>
              <select
                className="select"
                name="category_id"
                value={form.category_id}
                onChange={onChange}
                required
              >
                <option value="">-- Select Category --</option>
                {categories.map(c => (
                  <option key={c.CategoryID} value={c.CategoryID}>{c.CategoryName}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label className="label">Description</label>
              <textarea
                className="textarea"
                name="description"
                rows={3}
                placeholder="รายละเอียดสินค้า (ไม่บังคับ)"
                value={form.description || ""}
                onChange={onChange}
              />
            </div>

            <div className="grid-2">
              <div className="field">
                <label className="label">Company Name</label>
                <input className="input" name="supplier_company" value={form.supplier_company} onChange={onChange} />
              </div>
              <div className="field">
                <label className="label">Contact Name</label>
                <input className="input" name="supplier_contact" value={form.supplier_contact} onChange={onChange} />
              </div>
            </div>

            <div className="grid-2">
              <div className="field">
                <label className="label">Country</label>
                <input className="input" name="supplier_country" value={form.supplier_country} onChange={onChange} />
              </div>
              <div className="field">
                <label className="label">Postal Code</label>
                <input className="input" name="supplier_postal" value={form.supplier_postal} onChange={onChange} />
              </div>
            </div>

            <div className="field">
              <label className="label">Address</label>
              <input className="input" name="supplier_addr" value={form.supplier_addr} onChange={onChange} />
            </div>
          </div>

          {/* ขวา: อัปโหลดภาพ + พรีวิว */}
          <div className="col">
            <div className="field">
              <label className="label">Upload Image</label>
              <div className="file-row">
                <label className="btn-secondary">
                  เลือกไฟล์
                  <input type="file" accept="image/*" onChange={onPickFile} hidden />
                </label>
                <span className="file-name">{file?.name || "ไม่ได้เลือกไฟล์ใด"}</span>
              </div>
              <div className="image-box">
                {preview ? <img src={preview} alt="preview" /> : <span>No image selected</span>}
              </div>
            </div>

            <div className="actions">
              <button className="btn-primary" disabled={saving}>
                {saving ? "Saving..." : "Save Product"}
              </button>
              <button type="button" className="btn-ghost" onClick={onBack}>Back</button>
            </div>
          </div>
        </form>
      </section>

      <footer className="sc-foot">© 2025 WIN MUSIC — All rights reserved.</footer>
    </div>
  );
}
