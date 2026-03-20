// server.js

import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getPool} from "./db.js"; 
import { findUserByUsername, createUser } from './authModel.js';
import { requireAuth, requireRole } from './authMiddleware.js';
import { fileURLToPath } from 'url';
import { listProducts, createProduct, updateProduct, deleteProduct , getTop5Products} from './productsModel.js';
import { createCategory, getCategoryById, updateCategory, listCategories } from './categoriesModel.js';
import { createSupplier, getSupplierById, updateSupplier } from './suppliersModel.js';
import { checkoutNoHeader, getOrderItems } from './ordersNoHeaderModel.js';
import { getProductQuote } from './productsModel.js';
import { previewAfterDiscountByOrderId } from './ordersNoHeaderModel.js';


const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// === Static uploads ===
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, 'uploads', 'images');
fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// === Multer ===
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname || '.jpg');
    cb(null, `product_${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const ok = /image\/(jpeg|png|gif)/.test(file.mimetype);
    cb(ok ? null : new Error('Only JPG/PNG/GIF allowed'), ok);
  },
});

// === helpers ===
const toInt = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
};

// === PRODUCTS ===
app.get('/api/products', async (_, res) => {
  try {
    const rows = await listProducts();
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'List failed', detail: err.message });
  }
});

// create (รับได้ทั้ง JSON และ multipart)
app.post('/api/products',
  requireAuth,
  requireRole('Admin'),
  upload.single('image'),
  async (req, res) => {
    try {
      const b = req.body; // JSON หรือ fields ของ multipart จะอยู่ที่นี่
      const image_url = req.file ? `/uploads/images/${req.file.filename}` : (b.image_url ?? null);

      const category_id = toInt(b.category_id ?? b.CategoryID);
      if (category_id == null) return res.status(400).json({ message: 'category_id is required and must be a number' });
      let supplierId = toInt(b.supplier_id ?? b.SupplierID) || null;
      if (!supplierId && (b.supplier_company?.trim())) {
        const sup = await createSupplier({
          CompanyName: b.supplier_company.trim(),
          ContactName: b.supplier_contact ?? null,
          Address: b.supplier_addr ?? null,
          PostalCode: b.supplier_postal ?? null,
          Country: b.supplier_country ?? null,
        });
        supplierId = sup.id; // ใช้ id ที่เพิ่งสร้าง
      }
      const payload = {
        name: (b.name || '').trim(),
        price: Number(b.price) || 0,
        stock: Number(b.stock) || 0,
        image_url,
        category_id: toInt(b.category_id ?? b.CategoryID), // ต้องเป็นเลข
        supplier_id: supplierId,                            // ✅ ใส่ id ที่ได้
        description: (b.description ?? '').trim() || null,  // ✅ new
      };


      const id = await createProduct(payload);
      res.status(201).json({ product_id: id, image_url });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Create failed', detail: err.message });
    }
  }
);

// create (base64)
app.post('/api/products/base64', requireAuth, requireRole('Admin'), async (req, res) => {
  try {
    const { image_base64, ...b } = req.body;
    let image_url = b.image_url ?? null;
    if (image_base64?.startsWith('data:image/')) {
      const ext = image_base64.match(/^data:image\/(png|jpeg|jpg|gif)/i)?.[1] || 'jpg';
      const filename = `product_${Date.now()}.${ext === 'jpeg' ? 'jpg' : ext}`;
      const filePath = path.join(uploadDir, filename);
      const base64 = image_base64.split(',')[1];
      fs.writeFileSync(filePath, Buffer.from(base64, 'base64'));
      image_url = `/uploads/images/${filename}`;
    }

    const category_id = toInt(b.category_id ?? b.CategoryID);
    if (category_id == null) return res.status(400).json({ message: 'category_id is required and must be a number' });
    let supplierId = toInt(b.supplier_id ?? b.SupplierID) || null;

    if (!supplierId && (b.supplier_company?.trim())) {
      const sup = await createSupplier({
        CompanyName: b.supplier_company.trim(),
        ContactName: b.supplier_contact ?? null,
        Address: b.supplier_addr ?? null,
        PostalCode: b.supplier_postal ?? null,
        Country: b.supplier_country ?? null,
      });
      supplierId = sup.id; // ใช้ id ที่เพิ่งสร้าง
    }

    const payload = {
      name: (b.name || '').trim(),
      price: Number(b.price) || 0,
      stock: Number(b.stock) || 0,
      image_url,
      category_id: toInt(b.category_id ?? b.CategoryID), // ต้องเป็นเลข
      supplier_id: supplierId,                            // ✅ ใส่ id ที่ได้
      description: (b.description ?? '').trim() || null,  // ✅ new
    };

    const id = await createProduct(payload);
    res.status(201).json({ product_id: id, image_url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Create failed', detail: err.message });
  }
});

// update (multipart)
// server.js (เฉพาะส่วน PUT /api/products/:id)
app.put('/api/products/:id', requireAuth, requireRole('Admin'), upload.single('image'), async (req, res, next) => {
  const ct = req.headers['content-type'] || '';
  if (!ct.toLowerCase().includes('multipart/form-data')) return next();
  try {
    const id = Number(req.params.id);
    const b = req.body;
    const image_url = req.file ? `/uploads/images/${req.file.filename}` : (b.image_url ?? null);

    const payload = {
      name: (b.name || '').trim(),
      price: b.price !== undefined ? Number(b.price) : undefined,
      stock: b.stock !== undefined ? Number(b.stock) : undefined,
      category_id: b.category_id ? Number(b.category_id) : null,
      supplier_id: b.supplier_id ? Number(b.supplier_id) : null,
      quantity: b.quantity === '' ? null : (b.quantity !== undefined ? Number(b.quantity) : undefined),
      image_url,
      description: (b.description !== undefined) ? ((b.description || '').trim() || null) : undefined,
    };

    // ⭐ ส่ง currentUserId เข้าไป
    //Trigger 1,2
    await updateProduct(id, payload, req.user?.id || 0);
    res.json({ ok: true, image_url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Update (multipart) failed', detail: err.message });
  }
});

// JSON route
app.put('/api/products/:id', requireAuth, requireRole('Admin'), async (req, res) => {
  try {
    await updateProduct(Number(req.params.id), req.body, req.user?.id || 0);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Update failed', detail: err.message });
  }
});


app.delete('/api/products/:id', requireAuth, requireRole('Admin'), async (req, res) => {
  try {
    await deleteProduct(Number(req.params.id));
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Delete failed' });
  }
});

// === CATEGORIES ===
app.get('/api/categories', async (_req, res) => {
  try { res.json(await listCategories()); }
  catch (err) { console.error(err); res.status(500).json({ error: 'List categories failed' }); }
});

app.get('/api/categories/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const data = await getCategoryById(id);
    if (!data) return res.status(404).json({ error: 'Category not found' });
    res.json(data);
  } catch (err) {
    console.error('GET /api/categories/:id ->', err);
    res.status(500).json({ error: 'Fetch category failed' });
  }
});

app.put('/api/categories/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const { CategoryName = null } = req.body || {};
    await updateCategory(id, { CategoryName });
    res.json({ ok: true });
  } catch (err) {
    console.error('PUT /api/categories/:id ->', err);
    res.status(500).json({ error: 'Update category failed' });
  }
});

app.post('/api/categories', async (req, res) => {
  try {
    const { CategoryName } = req.body || {};
    if (!CategoryName?.trim()) return res.status(400).json({ error: 'CategoryName is required' });
    const row = await createCategory({ CategoryName: CategoryName.trim() });
    res.status(201).json(row);
  } catch (err) {
    console.error('POST /api/categories ->', err);
    res.status(500).json({ error: 'Create category failed', detail: err.message });
  }
});

// === SUPPLIERS (เฉพาะ get/update by id + create) ===
app.get('/api/suppliers/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const data = await getSupplierById(id);
    if (!data) return res.status(404).json({ error: 'Supplier not found' });
    res.json(data);
  } catch (err) {
    console.error('GET /api/suppliers/:id ->', err);
    res.status(500).json({ error: 'Fetch supplier failed' });
  }
});

app.put('/api/suppliers/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const { CompanyName = null, ContactName = null, Address = null, PostalCode = null, Country = null } = req.body || {};
    await updateSupplier(id, { CompanyName, ContactName, Address, PostalCode, Country });
    res.json({ ok: true });
  } catch (err) {
    console.error('PUT /api/suppliers/:id ->', err);
    res.status(500).json({ error: 'Update supplier failed' });
  }
});

app.post('/api/suppliers', async (req, res) => {
  try {
    const { CompanyName, ContactName = null, Address = null, PostalCode = null, Country = null } = req.body || {};
    if (!CompanyName?.trim()) return res.status(400).json({ error: 'CompanyName is required' });
    const row = await createSupplier({ CompanyName: CompanyName.trim(), ContactName, Address, PostalCode, Country });
    res.status(201).json(row);
  } catch (err) {
    console.error('POST /api/suppliers ->', err);
    res.status(500).json({ error: 'Create supplier failed', detail: err.message });
  }
});

// === AUTH ===
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'username/password required' });
    const exists = await findUserByUsername(username);
    if (exists) return res.status(409).json({ error: 'Username already exists' });
    //Defualt
    const user = await createUser({ username, password, role: 'user' });
    res.status(201).json({ id: user.id, username: user.Username, role: user.Role });
  } catch (err) {
    console.error('REGISTER err:', err);
    res.status(500).json({ error: 'Register failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'username/password required' });

    const user = await findUserByUsername(username);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.PasswordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, username: user.Username, role: user.Role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES || '7d' }
    );
    res.json({ token, user: { id: user.id, username: user.Username, role: user.Role } });
  } catch (err) {
    console.error('LOGIN err:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: { id: req.user.id, username: req.user.username, role: req.user.role } });
});



// สร้างออเดอร์แบบไม่ใช้หัวตาราง (ยังคงแนะนำให้ requireAuth ถ้าต้องล็อกอินก่อนซื้อ)
// แนะนำให้ต้องล็อกอิน เพื่อจะได้รู้ว่าใครทำ (UserID ไปโผล่ใน Stock_Transactions)
app.post('/api/checkout', requireAuth, async (req, res) => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!items.length) return res.status(400).json({ error: 'items empty' });

    const currentUserId = req.user?.id;
    const result = await checkoutNoHeader({ items, currentUserId }); // { orderId }
    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: '❌ ไม่สามารถสั่งซื้อได้: สินค้าในสต็อกไม่เพียงพอ', detail: e.message });
  }
});



// ดูรายการในออเดอร์ (ปลอดภัยน้อยกว่าเพราะไม่มี User ผูก)
// อาจใส่ requireRole('Admin') ถ้าต้องการ
// ✅ ดึงประวัติของ "ฉัน" โดยไม่ใช้ SESSION_CONTEXT และไม่แตะสคีมา
// เอาไว้บนสุดกับ imports อื่น

  app.get("/api/orders/history", requireAuth, async (req, res) => {
  try {
    const pool = await getPool();
    const [rows] = await pool.execute(
      `
      SELECT 
        UserID,
        UserName,
        SupplierContactName,
        ProductName,
        UnitPrice,
        Quantity,
        TotalPrice,
        PurchaseDate,
        ImageURL
      FROM vw_UserPurchaseHistory
      WHERE UserID = ?
      ORDER BY PurchaseDate DESC
      `,
      [req.user.id]
    );

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load purchase history" });
  }
});


app.get('/api/products/:id/quote', requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const qty = Number(req.query.qty || 1);
    if (!id || qty <= 0) return res.status(400).json({ error: 'bad params' });

    const quote = await getProductQuote(id, qty);
    if (!quote) return res.status(404).json({ error: 'Product not found' });
    res.json(quote); // { id, name, unit_price, qty, rate, net_unit_price, line_total }
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'quote failed', detail: e.message });
  }
});

app.get('/api/orders/:id/items', requireAuth, async (req, res) => {
  try {
    const items = await getOrderItems(req.params.id);
    res.json(items);
  } catch (e) {
    res.status(500).json({ error: 'fetch items failed', detail: e.message });
  }
});

app.post('/api/cart/quote', requireAuth, async (req, res) => {
  try {
    const { items } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items empty' });
    }

    const out = [];
    let total = 0;

    for (const it of items) {
      const pid = Number(it.product_id);
      const qty = Number(it.quantity);
      if (!pid || qty <= 0) continue;

      const q = await getProductQuote(pid, qty);
      if (q) { out.push(q); total += Number(q.line_total); }
    }

    res.json({ items: out, total: Number(total.toFixed(2)) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'quote failed', detail: e.message });
  }
});
//Function
app.get('/api/orders/:id/preview', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const data = await previewAfterDiscountByOrderId(id);
    // ถ้าไม่มี item เลย แสดงว่า SP โยน THROW -> เราจะไม่มาถึงนี่
    return res.json(data);
  } catch (err) {
    // จัดการ error จาก THROW 51020 ของ SP -> 404 สวย ๆ
    const msg = (err && err.originalError && err.originalError.info && err.originalError.info.message) || err.message || '';
    if (msg.includes('OrderID not found')) {
      return res.status(404).json({ error: 'Order not found' });
    }
    console.error('preview error:', err);
    return res.status(500).json({ error: 'Preview failed', detail: msg });
  }
});


//Store Procedure
// -------------------------------------------------------
// ✅ GET /api/products/top5 — ดึงสินค้าสต็อกสูงสุด 5 อันดับ
// -------------------------------------------------------
app.get("/api/products/top5", async (req, res) => {
  try {
    const topProducts = await getTop5Products();
    res.json(topProducts);
  } catch (err) {
    console.error("❌ Error fetching top5 products:", err);
    res.status(500).json({ error: "Failed to fetch Top 5 Products", detail: err.message });
  }
});
// -------------------------------------------------------


// ✅ ดึงเฉพาะของผู้ใช้ที่ล็อกอินอยู่
// -------------------------------------------------------
// ✅ GET /api/products/sorted — ดึงสินค้าจาก VIEW (vw_SortProducts)
// -------------------------------------------------------
app.get("/api/products/sorted", async (req, res) => {
  try {
    const pool = await getPool();
    const { sort = "name-asc" } = req.query;

    let orderBy = "ProductName ASC";
    if (sort === "price-asc") orderBy = "UnitPrice ASC";
    else if (sort === "price-desc") orderBy = "UnitPrice DESC";

    const q = `
      SELECT ProductID, ProductName, UnitPrice, UnitsInStock, ImageURL, SupplierName
      FROM vw_SortProducts
      ORDER BY ${orderBy};
    `;
    const [rows] = await pool.execute(q);

    const mapped = rows.map(row => ({
  id: row.ProductID,
  name: row.ProductName,
  price: row.UnitPrice,
  stock: row.UnitsInStock,
  image_url: row.ImageURL,
  supplier: row.SupplierName
}));

res.json(mapped);

  } catch (err) {
    console.error("❌ Error fetching sorted products:", err);
    res.status(500).json({ error: "Failed to fetch sorted products", detail: err.message });
  }
});
// ✅ GET /api/products/:id — คืนข้อมูลสินค้าแบบครบทุกฟิลด์ (normalize ชื่อ)
// ✅ GET /api/products/:id
app.get("/api/products/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const pool = await getPool();
const [rows] = await pool.execute(
  `
  SELECT 
    p.ProductID,
    p.ProductName,
    p.UnitPrice,
    p.UnitsInStock,
    p.Description,
    p.ImageURL,
    p.date_added,
    p.last_updated,
    c.CategoryID,
    c.CategoryName,
    s.SupplierID,
    s.CompanyName,
    s.ContactName
  FROM Products p
  LEFT JOIN Categories c ON p.CategoryID = c.CategoryID
  LEFT JOIN Suppliers s ON p.SupplierID = s.SupplierID
  WHERE p.ProductID = ?
  `,
  [id]
);

if (rows.length === 0) {
  return res.status(404).json({ error: "Product not found" });
}

res.json(rows[0]);
  } catch (err) {
    console.error("❌ GET /api/products/:id failed:", err.message);
    res.status(500).json({ error: "load detail failed", detail: err.message });
  }
});





const PORT = process.env.PORT || 3040;
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
