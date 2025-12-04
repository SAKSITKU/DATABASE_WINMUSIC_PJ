import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_BASE || "http://localhost:3040";

export default function PurchaseHistory({ onBack }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch(`${API}/api/orders/history`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("โหลดข้อมูลไม่สำเร็จ");
        return res.json();
      })
      .then((data) => setRecords(data))
      .catch((err) => console.error("❌ โหลดประวัติไม่สำเร็จ:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="center">กำลังโหลด...</p>;

  return (
    <div className="sc-page">
      {/* ===== PROMO BAR ===== */}
      <div className="sc-promo">
        
      </div>

      {/* ===== NAVBAR ===== */}
      <nav className="sc-nav">
        <div className="brand">WIN MUSIC</div>
        <div className="nav-center">
          <div className="search">
            <input type="text" placeholder="Search for products..." />
          </div>
        </div>
        <div className="icons">
          <button className="btn-outline" onClick={onBack}>← Back</button>
        </div>
      </nav>

      {/* ===== SECTION TITLE ===== */}
      <section className="sc-section">
        <div className="section-head">
          <h2>📦 ประวัติการซื้อสินค้า</h2>
          <span className="muted">ดูประวัติคำสั่งซื้อทั้งหมดของคุณ</span>
        </div>

        {/* ===== TABLE ===== */}
        {records.length === 0 ? (
          <p className="muted" style={{ textAlign: "center", marginTop: "30px" }}>
            ยังไม่มีรายการสั่งซื้อ
          </p>
        ) : (
          <div
            style={{
              overflowX: "auto",
              background: "#fff",
              borderRadius: "14px",
              boxShadow: "0 6px 20px rgba(0,0,0,0.06)",
              marginTop: "18px",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "15px",
              }}
            >
              <thead style={{ background: "#1b1b1b", color: "#fff" }}>
                <tr>
                  <th style={{ padding: "12px 14px", textAlign: "left" }}>วันที่ซื้อ</th>
                  <th style={{ padding: "12px 14px", textAlign: "left" }}>ชื่อผู้ใช้</th>
                  <th style={{ padding: "12px 14px", textAlign: "left" }}>สินค้า</th>
                  <th style={{ padding: "12px 14px", textAlign: "left" }}>จำนวน</th>
                  <th style={{ padding: "12px 14px", textAlign: "left" }}>ราคา/ชิ้น</th>
                  <th style={{ padding: "12px 14px", textAlign: "left" }}>ราคารวม</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r, i) => (
                  <tr
                    key={i}
                    style={{
                      borderBottom: "1px solid #e5e7eb",
                      background: i % 2 === 0 ? "#fff" : "#fff9f1",
                    }}
                  >
                    <td style={{ padding: "10px 14px" }}>
                      {new Date(r.PurchaseDate).toLocaleDateString()}
                    </td>
                    <td style={{ padding: "10px 14px" }}>{r.UserName}</td>
                    <td
                      style={{
                        padding: "10px 14px",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      {r.ImageURL && (
                        <img
                          src={
                            r.ImageURL.startsWith("http")
                              ? r.ImageURL
                              : `${API}${r.ImageURL}`
                          }
                          alt={r.ProductName}
                          style={{
                            width: "46px",
                            height: "46px",
                            objectFit: "cover",
                            borderRadius: "8px",
                            border: "1px solid #ddd",
                          }}
                        />
                      )}
                      {r.ProductName}
                    </td>
                    <td style={{ padding: "10px 14px" }}>{r.Quantity}</td>
                    <td style={{ padding: "10px 14px", color: "#1b1b1b", fontWeight: 600 }}>
                      ฿{Number(r.UnitPrice).toFixed(2)}
                    </td>
                    <td style={{ padding: "10px 14px", color: "#c7914a", fontWeight: 700 }}>
                      ฿{Number(r.TotalPrice).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="sc-foot">
        © {new Date().getFullYear()} WIN MUSIC | Designed for music lovers 🎶
      </footer>
    </div>
  );
}
