// EditProduct.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext.jsx";
const API = import.meta.env.VITE_API_BASE || "http://localhost:3040";

const getImageUrl = (u) => (!u ? "https://placehold.co/600x400?text=No+Image" : (u.startsWith("http") ? u : `${API}${u}`));

export default function EditProduct({ product, onBack, onSaved }) {
  const [form, setForm] = useState({
    name: "", price: 0, stock: 0, image_url: "",
    category_id: "", supplier_id: "", quantity: "",
    description: "",
  });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const { authFetch } = useAuth();
  const { user } = useAuth();                  // ⬅️ เพิ่ม
  const isAdmin = user?.role === "Admin";      // ⬅️ เพิ่ม
  // state แสดงรายละเอียดจากตาราง
  const [category, setCategory] = useState(null);
  const [supplier, setSupplier] = useState(null);
  const [catLoading, setCatLoading] = useState(false);
  const [supLoading, setSupLoading] = useState(false);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API}/api/categories`);
        const j = await r.json();
        if (Array.isArray(j)) setCategories(j);
      } catch (e) {
        console.error("Load categories failed:", e);
      }
    })();
  }, []);

  // เปิด/ปิดแก้ไขตารางที่เกี่ยวข้อง
  const [editCat, setEditCat] = useState(false);
  const [editSup, setEditSup] = useState(false);
  const [catErr, setCatErr] = useState("");   // <= อันนี้หายไปเลยทำให้ error
  const [supErr, setSupErr] = useState("");

  // ฟอร์มแก้ Category/Supplier
  const [catForm, setCatForm] = useState({ CategoryName: "", Description: "" });
  const [supForm, setSupForm] = useState({ CompanyName: "", ContactName: "" });

  const previewSrc = useMemo(() => (file ? URL.createObjectURL(file) : getImageUrl(form.image_url || "")), [file, form.image_url]);

  // sync product -> form
  useEffect(() => {
    if (!product) return;
    setForm({
      name: product.name ?? "",
      price: product.price ?? 0,
      stock: product.stock ?? 0,
      image_url: product.image_url ?? "",
      category_id: product.category_id ?? "",
      supplier_id: product.supplier_id ?? "",
      quantity: product.quantity ?? "",
      description: product.description ?? "",   // ✅
    });
    setFile(null);
    setEditCat(false); setEditSup(false);
  }, [product]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: ["price", "stock", "quantity"].includes(name) ? (value === "" ? "" : Number(value)) : value }));
  };
  const onFileChange = (e) => setFile(e.target.files?.[0] || null);

  const loadJson = async (url) => {
    const r = await fetch(url);
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.statusText);
    return r.json();
  };

  // โหลดรายละเอียด Category เมื่อพิมพ์ id
  useEffect(() => {
    let alive = true;
    const id = String(form.category_id || "").trim();
    if (id === "") { setCategory(null); setCatErr(""); return; }
    setCatLoading(true); setCatErr("");
    const t = setTimeout(async () => {
      try {
        const data = await loadJson(`${API}/api/categories/${id}`);
        if (alive) {
          setCategory(data);
          setCatForm({ CategoryName: data.CategoryName ?? "", Description: data.Description ?? "" });
        }
      } catch {
        if (alive) { setCategory(null); setCatErr("ไม่พบ Category ตามรหัสนี้"); setCatForm({ CategoryName: "", Description: "" }); }
      } finally { if (alive) setCatLoading(false); }
    }, 300);
    return () => { alive = false; clearTimeout(t); };
  }, [form.category_id]);

  // โหลดรายละเอียด Supplier เมื่อพิมพ์ id
  useEffect(() => {
    let alive = true;
    const id = String(form.supplier_id || "").trim();
    if (id === "") { setSupplier(null); setSupErr(""); return; }
    setSupLoading(true); setSupErr("");
    const t = setTimeout(async () => {
      try {
        const data = await loadJson(`${API}/api/suppliers/${id}`);
        if (alive) {
          setSupplier(data);
          setSupForm({ CompanyName: data.CompanyName ?? "", ContactName: data.ContactName ?? "" });
        }
      } catch {
        if (alive) { setSupplier(null); setSupErr("ไม่พบ Supplier ตามรหัสนี้"); setSupForm({ CompanyName: "", ContactName: "" }); }
      } finally { if (alive) setSupLoading(false); }
    }, 300);
    return () => { alive = false; clearTimeout(t); };
  }, [form.supplier_id]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!product?.id) return;
    setSaving(true);
    try {
      // 1) อัปเดตสินค้า
      if (file) {
        const fd = new FormData();
        fd.append("name", (form.name || "").trim());
        fd.append("price", String(form.price ?? 0));
        fd.append("stock", String(form.stock ?? 0));
        if (form.category_id !== "") fd.append("category_id", String(form.category_id));
        if (form.supplier_id !== "") fd.append("supplier_id", String(form.supplier_id));
        if (form.quantity !== "" && form.quantity != null) fd.append("quantity", String(form.quantity));
        fd.append("description", form.description?.trim() || "");
        fd.append("image", file);
        const r = await authFetch(`${API}/api/products/${product.id}`, { method: "PUT", body: fd });
        const j = await r.json(); if (!r.ok) throw new Error(j?.error || "Update product failed");
      } else {
        const body = {
          name: (form.name || "").trim(),
          price: Number(form.price) || 0,
          stock: Number(form.stock) || 0,
          image_url: form.image_url?.trim() || null,
          category_id: form.category_id === "" ? null : Number(form.category_id),
          supplier_id: form.supplier_id === "" ? null : Number(form.supplier_id),
          quantity: form.quantity === "" ? null : Number(form.quantity ?? 0),
          description: form.description?.trim() || null,
        };
        const r = await authFetch(`${API}/api/products/${product.id}`, {
          method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
        });
        const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j?.error || "Update product failed");
      }

      // 2) อัปเดต Category ถ้ามี id และมีการกรอกฟอร์ม
      if (form.category_id && (catForm.CategoryName.trim() !== "" || catForm.Description.trim() !== "")) {
        const r = await fetch(`${API}/api/categories/${form.category_id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            CategoryName: (catForm.CategoryName || "").trim(),
            Description: (catForm.Description || "").trim(),
          }),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j?.error || "Update category failed");
      }

      // 3) อัปเดต Supplier ถ้ามี id และมีการกรอกฟอร์ม
      if (form.supplier_id && (supForm.CompanyName.trim() !== "" || supForm.ContactName.trim() !== "")) {
        const r = await fetch(`${API}/api/suppliers/${form.supplier_id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            CompanyName: (supForm.CompanyName || "").trim(),
            ContactName: (supForm.ContactName || "").trim(),
          }),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j?.error || "Update supplier failed");
      }


      onSaved?.();
    } catch (err) {
      alert("บันทึกไม่สำเร็จ: " + err.message);
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!product?.id) return;
    const ok = confirm(`ยืนยันลบสินค้า: ${product.name || `#${product.id}`} ?`);
    if (!ok) return;

    setSaving(true);
    try {
      const r = await authFetch(`${API}/api/products/${product.id}`, { method: "DELETE" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || "Delete product failed");
      alert("ลบสินค้าเรียบร้อย");
      onSaved?.();     // รีโหลดหน้าหลัก หรือจะ onBack?.() ก็ได้
    } catch (err) {
      alert("ลบไม่สำเร็จ: " + err.message);
    } finally {
      setSaving(false);
    }
  };
  if (!isAdmin) {
    return (
      <div className="sc-page">
        <header className="sc-nav">
          <div className="brand">WIN MUSIC</div>
          <div className="nav-center">
            <button className="btn-outline" onClick={onBack}>← Back</button>
          </div>
        </header>
        <section className="sc-section">
          <div className="section-head"><h2>Forbidden</h2></div>
          <div className="form-card">
            <p>เฉพาะผู้ดูแลระบบ (admin) เท่านั้นที่สามารถแก้ไขสินค้าได้</p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="sc-page">
      <header className="sc-nav">
        <div className="brand">WIN MUSIC</div>
        <div className="nav-center">
          <button className="btn-outline" onClick={onBack}>← Back</button>
          <button className="btn-outline" disabled>EDIT PRODUCT</button>
        </div>
        <div className="search"><input placeholder="Search for products..." disabled /></div>
        <div className="icons"><span>👤</span><span>🛒</span><span>⚙️</span></div>
      </header>

      <section className="sc-section">
        <div className="section-head"><h2>Edit: {product?.name}</h2></div>

        <form className="form-card" onSubmit={onSubmit}>
          <div className="form-grid">
            {/* LEFT */}
            <div className="form-col">
              <label>Product Name *</label>
              <input name="name" value={form.name} onChange={onChange} required />

              <div className="row-2">
                <div>
                  <label>Price (฿)</label>
                  <input type="number" step="0.01" name="price" value={form.price} onChange={onChange} />
                </div>
                <div>
                  <label>Stock</label>
                  <input type="number" name="stock" value={form.stock} onChange={onChange} />
                </div>
              </div>

              {/* กรอก ID เอง + แสดงผล/สวิตช์แก้ตาราง */}
              <div className="row-2">
                {/* Category */}
                <div>

                  {catLoading && <small className="muted">กำลังโหลดข้อมูลหมวดหมู่…</small>}
                  {catErr && <small style={{ color: "#d00" }}>{catErr}</small>}

                  {/* ช่องแก้ไข Category แสดงตลอด */}
                  <div style={{ marginTop: 8 }}>
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
                      <label className="label">Product Description</label>
                      <textarea
                        className="textarea"
                        name="description"
                        rows={3}
                        placeholder="รายละเอียดสินค้า (ไม่บังคับ)"
                        value={form.description || ""}
                        onChange={onChange}     // ✅ ผูก onChange หลัก
                      />
                    </div>

                  </div>
                </div>

                {/* Supplier */}
                <div>

                  {supLoading && <small className="muted">กำลังโหลดข้อมูลผู้ขาย…</small>}
                  {supErr && <small style={{ color: "#d00" }}>{supErr}</small>}

                  {/* ช่องแก้ไข Supplier แสดงตลอด */}
                  <div style={{ marginTop: 8 }}>
                    <label className="label">CompanyName</label>
                    <input
                      value={supForm.CompanyName}
                      onChange={e => setSupForm(s => ({ ...s, CompanyName: e.target.value }))}
                      placeholder="CompanyName"
                      style={{ display: 'block', width: '100%', marginBottom: 6 }}
                      disabled={!form.supplier_id}
                    />
                    <label className="label">ContactName</label>
                    <input
                      value={supForm.ContactName}
                      onChange={e => setSupForm(s => ({ ...s, ContactName: e.target.value }))}
                      placeholder="ContactName"
                      style={{ display: 'block', width: '100%', marginTop: 6 }}
                      disabled={!form.supplier_id}
                    />

                  </div>
                </div>
              </div>

              <label style={{ marginTop: 10 }}>Upload new image</label>
              <input type="file" accept="image/*" onChange={onFileChange} />
              <small className="muted">รองรับ JPG/PNG/GIF สูงสุด 5MB</small>
            </div>

            {/* RIGHT */}
            <div className="form-col">
              <label>Preview</label>
              <div className="preview">
                {previewSrc ? <img src={previewSrc} alt="preview" /> : <div className="ph">No image</div>}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" className="btn-dark" disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </button>
                <button type="button" className="btn-dark" onClick={handleDelete} disabled={saving}>
                  {saving ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </form>
      </section>

      <footer className="sc-foot">© 2025 WIN MUSIC — All rights reserved.</footer>
    </div>
  );
}
