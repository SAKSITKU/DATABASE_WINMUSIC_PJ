// Cart.jsx
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext.jsx';
const API = import.meta.env.VITE_API_BASE || "http://localhost:3040";

const getImageUrl = (u) => {
  if (!u) return "https://placehold.co/120x80?text=No+Image";
  return u.startsWith("http") ? u : `${API}${u}`;
};

export default function Cart({ items, onChangeQty, onRemove, onBack, onCheckoutDone }) {
  const { authFetch, user } = useAuth();
  const [addr, setAddr] = useState('');
  const [loading, setLoading] = useState(false);

  // ====== ราคาที่มาจากเซิร์ฟเวอร์ (คิดด้วย dbo.fn_GetDiscountRate) ======
  const [pricing, setPricing] = useState({ byId: {}, total: 0 });
  const [loadingPrice, setLoadingPrice] = useState(false);

  async function refreshCartPrices() {
    if (!items?.length) { setPricing({ byId: {}, total: 0 }); return; }
    try {
      setLoadingPrice(true);
      const payload = {
        items: items.map(x => ({
          product_id: x.id,
          quantity:   x.qty || 1
        }))
      };
      const res = await authFetch(`${API}/api/cart/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.detail || 'quote failed');

      const byId = {};
      for (const q of data.items || []) byId[q.id] = q; // q = {id, unit_price, qty, rate, net_unit_price, line_total}
      setPricing({ byId, total: Number(data.total || 0) });
    } catch (e) {
      console.error(e);
      alert(`คำนวณส่วนลดไม่สำเร็จ: ${e.message}`);
    } finally {
      setLoadingPrice(false);
    }
  }

  useEffect(() => { refreshCartPrices(); }, [items]); // เรียกใหม่เมื่อ qty/รายการเปลี่ยน

  // ====== สรุปยอดโดยอิงราคาจากเซิร์ฟเวอร์ ======
  const subtotal = useMemo(() => {
    return (items || []).reduce((s, it) => {
      const unit = pricing.byId[it.id]?.unit_price ?? (Number(it.price) || 0);
      return s + unit * (it.qty || 1);
    }, 0);
  }, [items, pricing]);

 const total = useMemo(() => {
  return (items || []).reduce((s, it) => {
    const unit = Number(it.price) || 0;
    const rate = it.qty >= 2 ? 0.15 : 0;
    const qty = it.qty || 1;

    return s + (unit * (1 - rate) * qty);
  }, 0);
}, [items]);

 const discountTotal = subtotal - total;

  // เปลี่ยนจำนวน
  const step = (id, delta) => {
    const it = items.find(x => x.id === id);
    if (!it) return;
    const nextQty = Math.max(1, (it.qty || 1) + delta);
    onChangeQty(id, nextQty); // ไม่ต้องส่ง discount แล้ว
  };
  

  // ชำระเงิน: ส่งเฉพาะ product_id, quantity (ให้ฝั่งเซิร์ฟเวอร์คิดส่วนลด/ราคาเอง)
  const checkout = async () => {
  if (!user) { alert('กรุณาเข้าสู่ระบบก่อนทำการสั่งซื้อ'); return; }
  if (!items.length) { alert('ตะกร้าว่าง'); return; }

  setLoading(true);
  try {
    const payload = {
      items: items.map(it => ({
        product_id: it.id,
        quantity: it.qty
      }))
    };

    const r = await authFetch(`${API}/api/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j?.error || j?.detail || 'Checkout failed');

    // ✅ ใช้ j.orderId แทน orderId
    if (!j.orderId) throw new Error('Server did not return orderId');

    alert(`สั่งซื้อสำเร็จ! Order #${j.orderId}`);
    onCheckoutDone?.(j.orderId);   // ✅ ส่งกลับ App.jsx
  } catch (e) {
    alert(e.message);
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="sc-page cart-page">
      <header className="sc-nav">
        <div className="brand">WIN MUSIC</div>
        <div className="nav-center">
          <button className="btn-outline" onClick={onBack}>← Back</button>
          <button className="btn-outline" disabled>CART</button>
        </div>
        <div className="search"><input placeholder="Search for products..." disabled /></div>
        <div className="icons"><span>👤</span><span>🛒</span><span>⚙️</span></div>
      </header>

      <section className="sc-section cart-section">
        <h2 className="cart-title">Shopping Cart</h2>

        <div className="cart-wrap">
          {/* รายการสินค้า */}
          <div className={`cart-list ${items.length === 1 ? 'single' : ''}`}>
            {items.length === 0 ? (
              <div className="empty-box">ตะกร้าว่าง • เลือกสินค้าจากหน้าแรกแล้วกด Add</div>
            ) : items.map(it => {
              const q = pricing.byId[it.id];
              const unit = q?.unit_price ?? (Number(it.price) || 0);
              const rate = it.qty >= 2 ? 0.15 : 0;
              const netU = q?.net_unit_price ?? unit;
              const line = q?.line_total ?? (unit * (it.qty || 1));
              return (
                <div className="cart-item" key={it.id} style={{ gridTemplateColumns: 'minmax(280px,1.2fr) 220px 200px' }}>
                  <div className="cart-left">
  <img className="thumb" src={getImageUrl(it.img || it.image_url)} alt={it.name} />

  <div className="meta">
    <div className="name">{it.name}</div>

    <div className="unit">
      ฿{Number(unit).toLocaleString()}
      {rate > 0 && (
        <span style={{ marginLeft: 8, fontSize: 12, color: '#16a34a' }}>
          −{(rate * 100).toFixed(0)}%
        </span>
      )}
    </div>

    {rate > 0 && (
      <>
        <div className="unit">
          ลดต่อหน่วย: ฿{Number(unit - netU).toLocaleString()}
        </div>
        <div className="unit">
          สุทธิ/หน่วย: ฿{Number(netU).toLocaleString()}
        </div>
      </>
    )}
  </div>
</div> {/* ✅ ปิด cart-left ต้องมี */}

<div className="qty-col">
                    <div className="label">Qty</div>
                    <div className="qty-stepper">
                      <button onClick={() => step(it.id, -1)} aria-label="decrease">−</button>
                      <input
                        type="number"
                        min={1}
                        value={it.qty}
                        onChange={e => onChangeQty(it.id, Math.max(1, Number(e.target.value) || 1))}
                      />
                      <button onClick={() => step(it.id, +1)} aria-label="increase">+</button>
                    </div>
                    {loadingPrice && <div style={{ fontSize: 12, opacity: .7 }}>กำลังคำนวณ…</div>}
                  </div>

                  <div className="line-total">
                    <div className="label">รวม</div>
                    <div className="line-amount">฿{Number(line).toLocaleString()}</div>
                    <button className="link-danger" onClick={() => onRemove(it.id)}>Remove</button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* สรุปชำระเงิน */}
          <aside className="cart-summary">
            <div className="summary-card">
              <div className="summary-row">
                <span>ยอดก่อนลด</span>
                <b>฿{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b>
              </div>
              <div className="summary-row">
                <span>ส่วนลดรวม</span>
                <b className="text-danger">– ฿{discountTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b>
              </div>
              <div className="summary-divider" />
              <div className="summary-row grand">
                <span>รวมทั้งสิ้น</span>
                <b>฿{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b>
              </div>

              <label className="addr-label">ที่อยู่จัดส่ง (ถ้ามี)</label>
              <textarea
                className="addr"
                rows={3}
                placeholder="ที่อยู่จัดส่ง…"
                value={addr}
                onChange={(e) => setAddr(e.target.value)}
              />

              <button
                className="btn-checkout"
                disabled={loading || loadingPrice || items.length === 0 || !user}
                onClick={checkout}
              >
                {loading ? 'Processing…' : (loadingPrice ? 'กำลังคำนวณ…' : 'Checkout')}
              </button>
            </div>
          </aside>
        </div>
      </section>

      <footer className="sc-foot">© 2025 WIN MUSIC — All rights reserved.</footer>
    </div>
  );
}
