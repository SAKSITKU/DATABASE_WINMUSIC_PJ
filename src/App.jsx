// App.jsx
import { useEffect, useState } from "react";
import "./App.css";
import { useAuth } from "./AuthContext.jsx";
import PurchaseHistory from "./PurchaseHistory.jsx";
import AddProduct from "./AddProduct.jsx";
import ProductDetail from "./ProductDetail.jsx";
import EditProduct from "./EditProduct.jsx";
import Login from "./Login.jsx";
import Register from "./Register.jsx";
import Cart from "./Cart.jsx";
import OrderSummary from "./OrderSummary.jsx";




const API = import.meta.env.VITE_API_BASE ;
// ⬆️ วางไว้บนสุดของ App.jsx หลังประกาศ API
const getImageUrl = (u) => {
  if (!u) return "https://placehold.co/600x400?text=No+Image";
  return u.startsWith("http") ? u : `${API}${u}`;
};

export default function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("home"); // home | add | detail | edit | cart
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [page, setPage] = useState(1);
  const PER_PAGE = 20;
  const { user, logout, authFetch } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const loadProducts = async () => {
    try {
      const res = await fetch(`${API}/api/products`);
      const data = await res.json();
      setProducts(data);
    } catch (e) {
      console.error("Load products failed:", e);
      alert("โหลดสินค้าไม่สำเร็จ");
    }
  };

  let filtered = products.filter(p =>
    (p.name || "").toLowerCase().includes(query.toLowerCase())
  );

  // ✅ เรียงข้อมูลตามค่าที่เลือก
  if (sortBy === "name-asc") {
    filtered = [...filtered].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  } else if (sortBy === "price-asc") {
    filtered = [...filtered].sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
  } else if (sortBy === "price-desc") {
    filtered = [...filtered].sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
  }

  const paged = filtered.slice(0, page * PER_PAGE);


  useEffect(() => {
    (async () => {
      await loadProducts();
      setLoading(false);
    })();
  }, []);

  const handleShowAll = () => {
    const list = products.map((x) => `• ${x.name} — ฿${x.price ?? 0}`).join("\n");
    alert(list || "No products.");
  };

  // ลบอันล่าสุด (ตามเดิม)
  const handleDelete = async () => {
    if (!products.length) return;
    const last = products[0];
    try {
      const res = await fetch(`${API}/api/products/${last.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      await loadProducts();
      alert("Deleted last product");
    } catch (e) {
      console.error(e);
      alert("ลบสินค้าไม่สำเร็จ");
    }
  };
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cart') || '[]'); } catch { return []; }
  });
  useEffect(() => { localStorage.setItem('cart', JSON.stringify(cart)); }, [cart]);

  const addToCart = (p) => {
    setCart(prev => {
      const exist = prev.find(x => x.id === p.id);
      if (exist) {
        return prev.map(x => x.id === p.id ? { ...x, qty: x.qty + 1 } : x);
      }
      return [...prev, {
        id: p.id,
        name: p.name,
        price: p.price,
        qty: 1,
        discount: 0,
        img: p.image_url || p.img || null
      }];
    });
  };


  const changeQty = (id, qty, discount) => {
    setCart(prev => prev.map(x => x.id === id ? { ...x, qty: Math.max(1, qty), discount: (discount ?? x.discount) || 0 } : x));
  };
  const removeItem = (id) => setCart(prev => prev.filter(x => x.id !== id));
  const clearCart = () => setCart([]);

  function Top5ProductsSection() {
    const [top5, setTop5] = useState([]);
    const [loading, setLoading] = useState(true);
    const API = import.meta.env.VITE_API_BASE || "http://localhost:3040";

    useEffect(() => {
      fetch(`${API}/api/products/top5`)
        .then(res => res.json())
        .then(data => setTop5(data))
        .catch(err => console.error("❌ โหลด Top5 ไม่สำเร็จ:", err))
        .finally(() => setLoading(false));
    }, []);

    if (loading) return <p>กำลังโหลดสินค้า...</p>;
    if (!top5.length) return <p className="muted">ไม่มีข้อมูลสินค้า</p>;

    return (
      <div className="top5-grid">
        {top5.map((p, idx) => (
          <article key={p.ProductID} className="card small">
            <div className="thumb small">
              <img
                src={
                  p.ImageURL
                    ? (p.ImageURL.startsWith("http")
                      ? p.ImageURL
                      : `${API}${p.ImageURL}`)
                    : "https://placehold.co/200x200?text=No+Image"
                }
                alt={p.ProductName}
              />
            </div>
            <div className="card-body">
              <h4>{idx + 1}. {p.ProductName}</h4>
              <p className="muted">{p.CategoryName || "No Category"}</p>
              <p><b>Stock:</b> {p.UnitsInStock}</p>
            </div>
          </article>
        ))}
      </div>
    );
  }

  if (loading) return <div className="sc-page">Loading…</div>;
  if (view === "login") return <Login onBack={() => setView("home")} />;
  if (view === "register") return <Register onBack={() => setView("home")} />;
  if (view === "summary") return <OrderSummary orderId={selected.orderId} />;
  if (view === "all") {
    return (
      <div className="sc-page">
        <header className="sc-nav">
          <div className="brand">WIN MUSIC</div>

          <div className="nav-center">
            <button className="btn-outline" onClick={() => setView("home")}>← Back</button>
            <button className="btn-outline" disabled>ALL PRODUCTS</button>
          </div>


          <div className="icons" style={{ gap: 8 }}>
            {user ? (
              <>

                <span title={user.username}>👤 {user.username} ({user.role})</span>
                <button className="btn-outline" onClick={logout}>Logout</button>
              </>
            ) : (
              <>
                <button className="btn-outline" onClick={() => setView("login")}>Login</button>
                <button className="btn-outline" onClick={() => setView("register")}>Register</button>
              </>
            )}
            <span onClick={() => setView("cart")} title="Cart" style={{ cursor: 'pointer' }}>
              🛒 {cart.length || ""}
            </span>
            <span
              onClick={() => setView("history")}
              title="Purchase History"
              style={{ cursor: "pointer" }}
            >⚙️</span>

          </div>
        </header>

        <section className="sc-section">
          <div className="section-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2>ALL PRODUCTS</h2>
              <span className="muted">{filtered.length} items</span>
            </div>

            {/* 🔹 ปุ่มเลือกการเรียง */}
            <div>
              <select
                value={sortBy}
                onChange={async (e) => {
                  const val = e.target.value;
                  setSortBy(val);

                  try {
                    const res = await fetch(`${API}/api/products/sorted?sort=${val}`);
                    const data = await res.json();
                    setProducts(data);
                  } catch (err) {
                    console.error("❌ Sort fetch failed:", err);
                    alert("โหลดสินค้าตามลำดับไม่สำเร็จ");
                  }
                }}
                className="btn-light"
                style={{ padding: "6px 10px" }}
              >
                <option value="">🔀 Sort by</option>
                <option value="name-asc">A → Z</option>
                <option value="price-asc">Price: Low → High</option>
                <option value="price-desc">Price: High → Low</option>
              </select>
            </div>
          </div>

          {/* 🧱 Grid แสดงสินค้า */}
          <div className="grid">
            {paged.map((p) => (
              <article
                className="card"
                key={p.id}
                onClick={() => { setSelected(p); setView("detail"); }}
                style={{ cursor: "pointer" }}
              >
                <div className="thumb">
                  <img src={getImageUrl(p.image_url || p.img)} alt={p.name} />
                </div>
                <h3>{p.name}</h3>
                <div className="price" style={{ justifyContent: "space-between", display: "flex", alignItems: "center" }}>
                  <b>฿{p.price ?? 0}</b>
                  <button
                    className="btn-outline"
                    onClick={(e) => { e.stopPropagation(); addToCart(p); }}
                    title="Add to cart"
                  >
                    Add
                  </button>
                </div>
              </article>
            ))}
          </div>

        </section>

        <footer className="sc-foot">© 2025 WIN MUSIC  — All rights reserved.</footer>
      </div>
    );
  }
  // === VIEW: ADD ===
  if (view === "add") {
    return (
      <AddProduct
        onBack={() => setView("home")}
        onCreated={async () => {
          await loadProducts();
          setView("home");
          alert("เพิ่มสินค้าเรียบร้อย");
        }}
      />
    );
  }

  // === VIEW: DETAIL ===
  if (view === "detail" && selected) {
    return (
      <ProductDetail
        product={selected}
        onBack={() => { setView("home"); setSelected(null); }}
        onEdit={(p) => { setSelected(p); setView("edit"); }}
      />
    );
  }

  // === VIEW: EDIT ===
  if (view === "edit" && selected) {
    return (
      <EditProduct
        product={selected}
        onBack={() => { setView("detail"); }}
        onSaved={async () => {
          await loadProducts();
          // sync selected ใหม่จากรายการล่าสุด
          const refreshed = await fetch(`${API}/api/products`).then(r => r.json());
          const updated = refreshed.find(x => x.id === selected.id) || null;
          setSelected(updated);
          setView("detail");
          alert("บันทึกการแก้ไขเรียบร้อย");
        }}
      />
    );
  }
  if (view === "cart") {
    return (
      <Cart
        items={cart}
        onChangeQty={changeQty}
        onRemove={removeItem}
        onBack={() => setView("home")}
        onCheckoutDone={(orderId) => {
          // ✅ เคลียร์ตะกร้า
          clearCart();

          // ✅ ถ้า server ไม่ส่ง orderId กลับมา
          if (!orderId) {
            alert("ไม่พบหมายเลขออเดอร์จากเซิร์ฟเวอร์");
            setView("home");
            return;
          }

          // ✅ เก็บ orderId ไว้ใน state เพื่อส่งต่อให้หน้าใบสรุป
          setSelected({ orderId });

          // ✅ เปลี่ยนหน้าไปแสดงใบสรุป
          setView("summary");
        }}
      />
    );
  }

  // === VIEW: HISTORY ===
  if (view === "history") {
    return <PurchaseHistory onBack={() => setView("home")} />;
  }


  {/* ✅ เมื่อ view เป็น summary และมี orderId จริง → แสดง OrderSummary */ }
  {
    view === "summary" && selected?.orderId && (
      <OrderSummary orderId={selected.orderId} />
    )
  }


  // === VIEW: HOME ===
  return (
    <div className="sc-page">
      <header className="sc-nav">
        <div className="brand">WIN MUSIC</div>

        <div className="nav-center">
          {isAdmin && (
            <>
              <button className="btn-outline" onClick={() => setView("add")}> ADD PRODUCT</button>
            </>
          )}
        </div>

        <div className="icons" style={{ gap: 8 }}>
          {user ? (
            <>
              <span title={user.username}>👤 {user.username} ({user.role})</span>
              <button className="btn-outline" onClick={logout}>Logout</button>
            </>
          ) : (
            <>
              <button className="btn-outline" onClick={() => setView("login")}>Login</button>
              <button className="btn-outline" onClick={() => setView("register")}>Register</button>
            </>
          )}
          <span onClick={() => setView("cart")} title="Cart" style={{ cursor: 'pointer' }}>🛒 {cart.length || ""}</span>
          <span
            onClick={() => setView("history")}
            title="Purchase History"
            style={{ cursor: "pointer" }}
          >⚙️</span>

        </div>
      </header>

      {/* Hero */}
      <section className="sc-hero">
        <div className="left">
          <h1>FIND YOUR SOUND<br />AT WIN MUSIC</h1>
          <p>Explore premium guitars, drums, keyboards, and studio gear for all musicians.</p>
          <div className="row">
            <button className="btn-dark">Shop Instruments</button>
          </div>
          <div className="stats">
            <div><b>100+</b><span>Top Music Brands</span></div>
            <div><b>1,500+</b><span>Quality Instruments</span></div>
            <div><b>20,000+</b><span>Happy Musicians</span></div>
          </div>
        </div>
        <div className="right">
          <img src="https://aimm.edu/wp-content/uploads/2025/08/rock-guitar-genre.jpg" alt="Guitars" />
        </div>
      </section>

      {/* NEW ARRIVALS + Categories */}
      <section className="sc-section">
        <div className="section-head"><h2>NEW ARRIVALS</h2></div>
        <nav className="nav-categories">
          <div className="category">
            <img src="https://media.istockphoto.com/id/1127365308/th/%E0%B9%80%E0%B8%A7%E0%B8%84%E0%B9%80%E0%B8%95%E0%B8%AD%E0%B8%A3%E0%B9%8C/%E0%B8%81%E0%B8%B5%E0%B8%95%E0%B9%89%E0%B8%B2%E0%B8%A3%E0%B9%8C%E0%B9%84%E0%B8%9F%E0%B8%9F%E0%B9%89%E0%B8%B2.jpg?s=612x612&w=0&k=20&c=4r1eL8S5GtKN7lpV0-p_coOhzYtNd0wuSzSac2_Hcyc=" alt="Guitar" />
            <div><span>Guitar</span></div>
          </div>
          <div className="category">
            <img src="https://img.freepik.com/premium-vector/hand-drawn-synthesizer-keyboard-vector-illustration-music-design-projects_1292377-28065.jpg" alt="Keyboard" />
            <div><span>Keyboard</span></div>
          </div>
          <div className="category">
            <img src="https://png.pngtree.com/png-vector/20220720/ourlarge/pngtree-drum-set-drums-kit-music-png-image_5403214.png" alt="Drums" />
            <div><span>Drum</span></div>
          </div>
          <div className="category">
            <img src="https://static4.depositphotos.com/1013237/295/i/950/depositphotos_2955445-stock-illustration-electric-bass-guitar-line-art.jpg" alt="Bass" />
            <div><span>Bass</span></div>
          </div>
        </nav>

        {/* Grid สินค้า — คลิกเพื่อดูรายละเอียด */}
        <div className="grid">
          {products.slice(0, 8).map((p) => (
            <article
              className="card"
              key={p.id}
              onClick={() => { setSelected(p); setView("detail"); }}
              style={{ cursor: "pointer" }}
            >
              <div className="thumb">
                <img src={getImageUrl(p.image_url || p.img)} alt={p.name} />
              </div>
              <h3>{p.name}</h3>
              <div className="price" style={{ justifyContent: "space-between", display: "flex", alignItems: "center" }}>
                <b>฿{p.price ?? 0}</b>
                <button
                  className="btn-outline"
                  onClick={(e) => { e.stopPropagation(); addToCart(p); }}
                  title="Add to cart"
                >
                  Add
                </button>
              </div>
            </article>
          ))}
        </div>

        <div className="center" style={{ gap: 10 }}>
          <button className="btn-light" onClick={() => window.location.reload()}>
            — Refresh —
          </button>
          <button className="btn-light" onClick={() => setView("all")}>
            — View All —
          </button>
        </div>
      </section>

      {/* ✅ Top 5 Products Section */}
      <section className="sc-section">
        <div className="section-head">
          <h2>🏆 TOP 5 PRODUCTS</h2>
          <span className="muted">สินค้าสต็อกสูงสุด 5 อันดับ</span>
        </div>
        <Top5ProductsSection />
      </section>

      <footer className="sc-foot">© 2025 WIN MUSIC  — All rights reserved.</footer>
    </div>
  );
}
