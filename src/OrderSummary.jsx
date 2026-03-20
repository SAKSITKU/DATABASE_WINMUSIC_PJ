import { useEffect, useState } from "react";
import { useAuth } from "./AuthContext.jsx";

const API = import.meta.env.VITE_API_BASE ;

const fmtTHB = (n) =>
  (n ?? 0).toLocaleString("th-TH", { style: "currency", currency: "THB" });

export default function OrderSummary({ orderId }) {   // ✅ รับจาก props
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [sum, setSum] = useState({ subtotal: 0, discount_total: 0, grand_total: 0 });
  const { authFetch } = useAuth();

  useEffect(() => {
    if (!orderId) return; // ✅ ใช้ orderId จาก props
    (async () => {
      try {
        const res = await authFetch(`${API}/api/orders/${orderId}/preview`);
        if (!res.ok) throw new Error(`โหลดสรุปออเดอร์ไม่สำเร็จ (${res.status})`);
        const data = await res.json();
        setItems(data.items || []);
        setSum(data.summary || {});
      } catch (err) {
        alert(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [orderId]);

  if (loading)
    return (
      <div className="os-wrap">
        <div className="os-card">กำลังโหลด...</div>
      </div>
    );

  return (
    <div className="os-wrap">
      <div className="os-card">
        <header className="os-header">
          <div>
            <h1>ใบสรุปราคา</h1>
            <div className="os-sub">Order #{orderId}</div>
          </div>
          <div className="os-actions">
            <button className="os-btn" onClick={() => window.print()}>
              พิมพ์
            </button>
            <button onClick={() => window.location.href = "/"} className="os-btn os-btn-secondary">
              กลับหน้าแรก
            </button>
          </div>
        </header>

        <div className="os-info">
          <div>
            <strong>วันที่:</strong> {new Date().toLocaleString("th-TH")}
          </div>
        </div>

        <div className="os-table">
          <div className="os-tr os-th">
            <div>สินค้า</div>
            <div className="os-right">ราคา/หน่วย</div>
            <div className="os-right">จำนวน</div>
            <div className="os-right">ส่วนลด</div>
            <div className="os-right">ยอดสุทธิ</div>
          </div>
          {items.map((it) => (
            <div className="os-tr" key={`${it.product_id}`}>
              <div className="os-name">
                <div className="os-name-title">{it.name}</div>
                <div className="os-mute">รหัสสินค้า: {it.product_id}</div>
              </div>
              <div className="os-right">{fmtTHB(it.unit_price)}</div>
              <div className="os-right">x{it.qty}</div>
              <div className="os-right">
                {(it.rate * 100).toFixed(0)}% ({fmtTHB(it.discount_amount)})
              </div>
              <div className="os-right os-strong">{fmtTHB(it.line_total)}</div>
            </div>
          ))}
        </div>

        <div className="os-total">
          <div className="os-row">
            <div>ยอดก่อนลด</div>
            <div>{fmtTHB(sum.subtotal)}</div>
          </div>
          <div className="os-row">
            <div>ส่วนลดรวม</div>
            <div className="os-danger">- {fmtTHB(sum.discount_total)}</div>
          </div>
          <div className="os-row os-grand">
            <div>ยอดชำระทั้งหมด</div>
            <div>{fmtTHB(sum.grand_total)}</div>
          </div>
        </div>

        <footer className="os-footer">
          ขอบคุณที่อุดหนุน 🙏 สามารถกด “พิมพ์” เพื่อเซฟเป็น PDF ได้
        </footer>
      </div>
    </div>
  );
}