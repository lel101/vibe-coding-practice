import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { DbManager } from './server/db';
import {
  User, Category, Product, Supplier, Purchase, PurchaseItem,
  Sale, SaleItem, Expense, Investor, ProfitDistribution, ProfitDistributionItem
} from './src/types';

const app = express();
const PORT = 4000;

app.use(express.json());

// Token helpers (JWT analogue using base64 + SHA-like simple signature for zero-dependency portability)
const SECRET_KEY = process.env.JWT_SECRET || 'inventory_profit_secret_key_2026';

function generateToken(user: any): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24 hours
  })).toString('base64url');

  // Custom simple signature signature (base64url of payload + secret)
  const signature = Buffer.from(`${payload}.${SECRET_KEY}`).toString('base64url').substring(0, 32);
  return `${header}.${payload}.${signature}`;
}

function verifyToken(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, payload, signature] = parts;

    const expectedSig = Buffer.from(`${payload}.${SECRET_KEY}`).toString('base64url').substring(0, 32);
    if (signature !== expectedSig) return null;

    const decodedPayload = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
    if (decodedPayload.exp < Date.now() / 1000) {
      return null; // Expired
    }
    return decodedPayload;
  } catch (e) {
    return null;
  }
}

// Authentication middleware
function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Authorization token required' });
    return;
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded) {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
    return;
  }

  (req as any).user = decoded;
  next();
}

// Ensure Admin access
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (!user || user.role !== 'Admin') {
    res.status(403).json({ success: false, message: 'Access forbidden: Admin role required' });
    return;
  }
  next();
}

// ==========================================
// AUTHENTICATION ENDPOINTS
// ==========================================

app.post('/api/auth/login', (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ success: false, message: 'Username and password are required' });
    return;
  }

  const users = DbManager.get('users');
  const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());

  if (!user || user.password !== password) {
    res.status(401).json({ success: false, message: 'Invalid username or password' });
    return;
  }

  const token = generateToken(user);
  const { password: _, ...userWithoutPassword } = user;

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      token,
      user: userWithoutPassword
    }
  });
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

app.get('/api/auth/me', authenticate, (req: Request, res: Response) => {
  const user = (req as any).user;
  res.json({
    success: true,
    message: 'Profile retrieved successfully',
    data: { user }
  });
});

app.post('/api/auth/reset-db', authenticate, requireAdmin, (req: Request, res: Response) => {
  DbManager.reset();
  res.json({
    success: true,
    message: 'Database reset successfully to seed values.'
  });
});

// ==========================================
// CATEGORY MANAGEMENT
// ==========================================

app.get('/api/categories', authenticate, (req: Request, res: Response) => {
  const search = req.query.search as string;
  let categories = DbManager.get('categories');

  if (search) {
    const q = search.toLowerCase();
    categories = categories.filter(c => c.name.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q));
  }

  res.json({ success: true, message: 'Categories retrieved successfully', data: categories });
});

app.post('/api/categories', authenticate, requireAdmin, (req: Request, res: Response) => {
  const { name, description } = req.body;

  if (!name || name.trim() === '') {
    res.status(400).json({ success: false, message: 'Category name is required' });
    return;
  }

  const categories = DbManager.get('categories');
  const exists = categories.find(c => c.name.toLowerCase() === name.trim().toLowerCase());
  if (exists) {
    res.status(400).json({ success: false, message: 'Category name already exists' });
    return;
  }

  const newCat: Category = {
    id: `cat-${Date.now()}`,
    name: name.trim(),
    description: description?.trim() || '',
    createdAt: new Date().toISOString()
  };

  DbManager.insert('categories', newCat);
  res.status(201).json({ success: true, message: 'Category created successfully', data: newCat });
});

app.put('/api/categories/:id', authenticate, requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description } = req.body;

  if (!name || name.trim() === '') {
    res.status(400).json({ success: false, message: 'Category name is required' });
    return;
  }

  const categories = DbManager.get('categories');
  const otherExists = categories.find(c => c.id !== id && c.name.toLowerCase() === name.trim().toLowerCase());
  if (otherExists) {
    res.status(400).json({ success: false, message: 'Another category has this name already' });
    return;
  }

  const updated = DbManager.update('categories', id, (cat) => ({
    ...cat,
    name: name.trim(),
    description: description?.trim() || ''
  }));

  if (!updated) {
    res.status(404).json({ success: false, message: 'Category not found' });
    return;
  }

  res.json({ success: true, message: 'Category updated successfully', data: updated });
});

app.delete('/api/categories/:id', authenticate, requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;

  // Check if products exist in this category
  const products = DbManager.get('products');
  const hasProducts = products.some(p => p.categoryId === id && !p.archived);
  if (hasProducts) {
    res.status(400).json({
      success: false,
      message: 'Cannot delete category: active products belong to this category. Archive or relocate products first.'
    });
    return;
  }

  const deleted = DbManager.delete('categories', id);
  if (!deleted) {
    res.status(404).json({ success: false, message: 'Category not found' });
    return;
  }

  res.json({ success: true, message: 'Category deleted successfully' });
});

// ==========================================
// PRODUCT MANAGEMENT
// ==========================================

app.get('/api/products', authenticate, (req: Request, res: Response) => {
  const search = req.query.search as string;
  const categoryId = req.query.categoryId as string;
  const status = req.query.status as string;
  const lowStock = req.query.lowStock === 'true';
  const includeArchived = req.query.includeArchived === 'true';

  let products = DbManager.get('products');
  const categories = DbManager.get('categories');

  // Join Category Name
  let list = products.map(p => {
    const cat = categories.find(c => c.id === p.categoryId);
    return {
      ...p,
      categoryName: cat ? cat.name : 'Unknown'
    };
  });

  // Filters
  if (!includeArchived) {
    list = list.filter(p => !p.archived);
  }
  if (categoryId) {
    list = list.filter(p => p.categoryId === categoryId);
  }
  if (status) {
    list = list.filter(p => p.status === status);
  }
  if (lowStock) {
    list = list.filter(p => p.currentStock <= p.minimumStock);
  }
  if (search) {
    const q = search.toLowerCase();
    list = list.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.SKU.toLowerCase().includes(q)
    );
  }

  res.json({ success: true, message: 'Products retrieved successfully', data: list });
});

app.post('/api/products', authenticate, requireAdmin, (req: Request, res: Response) => {
  const { SKU, name, categoryId, costPrice, sellingPrice, currentStock, minimumStock, unit, status } = req.body;

  if (!SKU || !name || !categoryId || costPrice === undefined || sellingPrice === undefined || currentStock === undefined || minimumStock === undefined || !unit) {
    res.status(400).json({ success: false, message: 'All product fields are required' });
    return;
  }

  const products = DbManager.get('products');
  const skuExists = products.find(p => p.SKU.toLowerCase() === SKU.trim().toLowerCase() && !p.archived);
  if (skuExists) {
    res.status(400).json({ success: false, message: `Product with SKU ${SKU} already exists` });
    return;
  }

  const newProduct: Product = {
    id: `prod-${Date.now()}`,
    SKU: SKU.trim().toUpperCase(),
    name: name.trim(),
    categoryId,
    costPrice: Number(costPrice),
    sellingPrice: Number(sellingPrice),
    currentStock: Number(currentStock),
    minimumStock: Number(minimumStock),
    unit: unit.trim(),
    status: status === 'Inactive' ? 'Inactive' : 'Active',
    createdAt: new Date().toISOString(),
    archived: false
  };

  DbManager.insert('products', newProduct);
  res.status(201).json({ success: true, message: 'Product created successfully', data: newProduct });
});

app.put('/api/products/:id', authenticate, requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const { SKU, name, categoryId, costPrice, sellingPrice, currentStock, minimumStock, unit, status } = req.body;

  if (!SKU || !name || !categoryId || costPrice === undefined || sellingPrice === undefined || currentStock === undefined || minimumStock === undefined || !unit) {
    res.status(400).json({ success: false, message: 'All product fields are required' });
    return;
  }

  const products = DbManager.get('products');
  const skuConflict = products.find(p => p.id !== id && p.SKU.toLowerCase() === SKU.trim().toLowerCase() && !p.archived);
  if (skuConflict) {
    res.status(400).json({ success: false, message: `Another product with SKU ${SKU} already exists` });
    return;
  }

  const updated = DbManager.update('products', id, (prod) => ({
    ...prod,
    SKU: SKU.trim().toUpperCase(),
    name: name.trim(),
    categoryId,
    costPrice: Number(costPrice),
    sellingPrice: Number(sellingPrice),
    currentStock: Number(currentStock),
    minimumStock: Number(minimumStock),
    unit: unit.trim(),
    status: status === 'Inactive' ? 'Inactive' : 'Active'
  }));

  if (!updated) {
    res.status(404).json({ success: false, message: 'Product not found' });
    return;
  }

  res.json({ success: true, message: 'Product updated successfully', data: updated });
});

app.delete('/api/products/:id', authenticate, requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;

  // Soft delete / archive
  const updated = DbManager.update('products', id, (prod) => ({
    ...prod,
    archived: true,
    status: 'Inactive'
  }));

  if (!updated) {
    res.status(404).json({ success: false, message: 'Product not found' });
    return;
  }

  res.json({ success: true, message: 'Product archived successfully' });
});

// ==========================================
// SUPPLIER MANAGEMENT
// ==========================================

app.get('/api/suppliers', authenticate, (req: Request, res: Response) => {
  const search = req.query.search as string;
  let suppliers = DbManager.get('suppliers');

  if (search) {
    const q = search.toLowerCase();
    suppliers = suppliers.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.contactPerson.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.phone.includes(q)
    );
  }

  res.json({ success: true, message: 'Suppliers retrieved successfully', data: suppliers });
});

app.post('/api/suppliers', authenticate, requireAdmin, (req: Request, res: Response) => {
  const { name, contactPerson, phone, email, address } = req.body;

  if (!name || !contactPerson) {
    res.status(400).json({ success: false, message: 'Supplier name and contact person are required' });
    return;
  }

  const newSupplier: Supplier = {
    id: `sup-${Date.now()}`,
    name: name.trim(),
    contactPerson: contactPerson.trim(),
    phone: phone?.trim() || '',
    email: email?.trim() || '',
    address: address?.trim() || '',
    createdAt: new Date().toISOString()
  };

  DbManager.insert('suppliers', newSupplier);
  res.status(201).json({ success: true, message: 'Supplier added successfully', data: newSupplier });
});

app.put('/api/suppliers/:id', authenticate, requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, contactPerson, phone, email, address } = req.body;

  if (!name || !contactPerson) {
    res.status(400).json({ success: false, message: 'Supplier name and contact person are required' });
    return;
  }

  const updated = DbManager.update('suppliers', id, (sup) => ({
    ...sup,
    name: name.trim(),
    contactPerson: contactPerson.trim(),
    phone: phone?.trim() || '',
    email: email?.trim() || '',
    address: address?.trim() || ''
  }));

  if (!updated) {
    res.status(404).json({ success: false, message: 'Supplier not found' });
    return;
  }

  res.json({ success: true, message: 'Supplier updated successfully', data: updated });
});

app.delete('/api/suppliers/:id', authenticate, requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;

  const purchases = DbManager.get('purchases');
  const hasPurchases = purchases.some(p => p.supplierId === id);
  if (hasPurchases) {
    res.status(400).json({
      success: false,
      message: 'Cannot delete supplier: they have historic purchase records. Delete purchases first or leave active.'
    });
    return;
  }

  const deleted = DbManager.delete('suppliers', id);
  if (!deleted) {
    res.status(404).json({ success: false, message: 'Supplier not found' });
    return;
  }

  res.json({ success: true, message: 'Supplier deleted successfully' });
});

// ==========================================
// STOCK IN (PURCHASE TRANSACTIONS)
// ==========================================

app.get('/api/purchases', authenticate, (req: Request, res: Response) => {
  const purchases = DbManager.get('purchases');
  const suppliers = DbManager.get('suppliers');
  const purchaseItems = DbManager.get('purchaseItems');
  const products = DbManager.get('products');

  const list = purchases.map(p => {
    const supplier = suppliers.find(s => s.id === p.supplierId);
    const items = purchaseItems
      .filter(item => item.purchaseId === p.id)
      .map(item => {
        const prod = products.find(pr => pr.id === item.productId);
        return {
          ...item,
          productName: prod ? prod.name : 'Unknown Product'
        };
      });

    return {
      ...p,
      supplierName: supplier ? supplier.name : 'Unknown Supplier',
      items
    };
  }).sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());

  res.json({ success: true, message: 'Purchases retrieved successfully', data: list });
});

app.post('/api/purchases', authenticate, requireAdmin, (req: Request, res: Response) => {
  const { purchaseDate, supplierId, notes, items } = req.body;

  if (!purchaseDate || !supplierId || !items || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ success: false, message: 'Purchase date, supplier, and items are required' });
    return;
  }

  // Validate items
  for (const item of items) {
    if (!item.productId || !item.quantity || item.quantity <= 0 || !item.costPrice || item.costPrice <= 0) {
      res.status(400).json({ success: false, message: 'Invalid items. Product, valid positive quantity, and cost price are required.' });
      return;
    }
  }

  const purchaseId = `pur-${Date.now()}`;
  let totalAmount = 0;

  const newItems: PurchaseItem[] = items.map((item, index) => {
    const itemCost = Number(item.costPrice) * Number(item.quantity);
    totalAmount += itemCost;

    // Auto-increase product inventory
    DbManager.update('products', item.productId, (prod) => ({
      ...prod,
      currentStock: prod.currentStock + Number(item.quantity),
      // Automatically keep product costPrice synced with latest purchase price if desired (bonus of excellent systems!)
      costPrice: Number(item.costPrice)
    }));

    return {
      id: `pur-item-${Date.now()}-${index}`,
      purchaseId,
      productId: item.productId,
      quantity: Number(item.quantity),
      costPrice: Number(item.costPrice)
    };
  });

  const newPurchase: Purchase = {
    id: purchaseId,
    purchaseDate,
    supplierId,
    notes: notes?.trim() || '',
    totalAmount,
    createdAt: new Date().toISOString()
  };

  // Save purchase
  DbManager.insert('purchases', newPurchase);

  // Save purchase items
  for (const item of newItems) {
    DbManager.insert('purchaseItems', item);
  }

  res.status(201).json({
    success: true,
    message: 'Stock-in transaction completed successfully',
    data: {
      ...newPurchase,
      items: newItems
    }
  });
});

// ==========================================
// SALES TRANSACTIONS
// ==========================================

app.get('/api/sales', authenticate, (req: Request, res: Response) => {
  const sales = DbManager.get('sales');
  const saleItems = DbManager.get('saleItems');
  const products = DbManager.get('products');

  const list = sales.map(s => {
    const items = saleItems
      .filter(item => item.saleId === s.id)
      .map(item => {
        const prod = products.find(pr => pr.id === item.productId);
        return {
          ...item,
          productName: prod ? prod.name : 'Unknown Product'
        };
      });

    return {
      ...s,
      items
    };
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  res.json({ success: true, message: 'Sales transactions retrieved successfully', data: list });
});

app.post('/api/sales', authenticate, requireAdmin, (req: Request, res: Response) => {
  const { date, customer, paymentMethod, discount, notes, items } = req.body;

  if (!date || !paymentMethod || !items || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ success: false, message: 'Sales date, payment method, and items are required' });
    return;
  }

  // Validate stock level & active status first
  const products = DbManager.get('products');
  for (const item of items) {
    const product = products.find(p => p.id === item.productId);
    if (!product || product.archived) {
      res.status(400).json({ success: false, message: `Product not found or is unavailable` });
      return;
    }
    if (product.status === 'Inactive') {
      res.status(400).json({ success: false, message: `Product "${product.name}" is marked as inactive` });
      return;
    }
    if (product.currentStock < Number(item.quantity)) {
      res.status(400).json({
        success: false,
        message: `Insufficient stock for "${product.name}". Available: ${product.currentStock} ${product.unit}, Requested: ${item.quantity}`
      });
      return;
    }
  }

  const saleId = `sale-${Date.now()}`;

  // Generate invoice number: INV-YYYYMM-XXXX
  const dateObj = new Date(date);
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const prefix = `INV-${year}${month}-`;

  const sales = DbManager.get('sales');
  const monthSales = sales.filter(s => s.invoiceNumber.startsWith(prefix));
  const nextNum = String(monthSales.length + 1).padStart(3, '0');
  const invoiceNumber = `${prefix}${nextNum}`;

  let subtotal = 0;
  let cogs = 0;

  const newItems: SaleItem[] = items.map((item, index) => {
    const product = products.find(p => p.id === item.productId)!;
    const itemRevenue = Number(item.sellingPrice) * Number(item.quantity);
    const itemCost = product.costPrice * Number(item.quantity);

    subtotal += itemRevenue;
    cogs += itemCost;

    // Auto-reduce product inventory
    DbManager.update('products', product.id, (prod) => ({
      ...prod,
      currentStock: prod.currentStock - Number(item.quantity)
    }));

    return {
      id: `sale-item-${Date.now()}-${index}`,
      saleId,
      productId: item.productId,
      quantity: Number(item.quantity),
      sellingPrice: Number(item.sellingPrice),
      costPrice: product.costPrice // caching the cost price at time of sale
    };
  });

  const discAmount = Number(discount) || 0;
  const totalAmount = subtotal - discAmount;
  // Net Gross Profit = total revenue (including discounts applied to whole sale) - COGS
  const grossProfit = totalAmount - cogs;

  const newSale: Sale = {
    id: saleId,
    invoiceNumber,
    date,
    customer: customer?.trim() || 'Walk-in Customer',
    paymentMethod,
    discount: discAmount,
    totalAmount,
    cogs,
    grossProfit,
    notes: notes?.trim() || '',
    createdAt: new Date().toISOString()
  };

  // Save sale
  DbManager.insert('sales', newSale);

  // Save sale items
  for (const item of newItems) {
    DbManager.insert('saleItems', item);
  }

  res.status(201).json({
    success: true,
    message: 'Sales transaction recorded successfully',
    data: {
      ...newSale,
      items: newItems
    }
  });
});

// ==========================================
// EXPENSE MANAGEMENT
// ==========================================

app.get('/api/expenses', authenticate, (req: Request, res: Response) => {
  const search = req.query.search as string;
  const category = req.query.category as string;

  let expenses = DbManager.get('expenses');

  if (category) {
    expenses = expenses.filter(e => e.category === category);
  }
  if (search) {
    const q = search.toLowerCase();
    expenses = expenses.filter(e => e.description.toLowerCase().includes(q));
  }

  expenses = expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  res.json({ success: true, message: 'Expenses retrieved successfully', data: expenses });
});

app.post('/api/expenses', authenticate, requireAdmin, (req: Request, res: Response) => {
  const { date, category, description, amount } = req.body;

  if (!date || !category || !description || amount === undefined || amount <= 0) {
    res.status(400).json({ success: false, message: 'All expense fields with valid positive amount are required' });
    return;
  }

  const newExpense: Expense = {
    id: `exp-${Date.now()}`,
    date,
    category,
    description: description.trim(),
    amount: Number(amount),
    createdAt: new Date().toISOString()
  };

  DbManager.insert('expenses', newExpense);
  res.status(201).json({ success: true, message: 'Expense recorded successfully', data: newExpense });
});

app.put('/api/expenses/:id', authenticate, requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const { date, category, description, amount } = req.body;

  if (!date || !category || !description || amount === undefined || amount <= 0) {
    res.status(400).json({ success: false, message: 'All expense fields with valid positive amount are required' });
    return;
  }

  const updated = DbManager.update('expenses', id, (exp) => ({
    ...exp,
    date,
    category,
    description: description.trim(),
    amount: Number(amount)
  }));

  if (!updated) {
    res.status(404).json({ success: false, message: 'Expense not found' });
    return;
  }

  res.json({ success: true, message: 'Expense updated successfully', data: updated });
});

app.delete('/api/expenses/:id', authenticate, requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const deleted = DbManager.delete('expenses', id);
  if (!deleted) {
    res.status(404).json({ success: false, message: 'Expense not found' });
    return;
  }
  res.json({ success: true, message: 'Expense deleted successfully' });
});

// ==========================================
// INVESTOR MANAGEMENT
// ==========================================

app.get('/api/investors', authenticate, (req: Request, res: Response) => {
  const investors = DbManager.get('investors');
  res.json({ success: true, message: 'Investors retrieved successfully', data: investors });
});

app.post('/api/investors', authenticate, requireAdmin, (req: Request, res: Response) => {
  const { name, investmentAmount, profitSharePercentage } = req.body;

  if (!name || investmentAmount === undefined || profitSharePercentage === undefined) {
    res.status(400).json({ success: false, message: 'Name, investment amount, and share percentage are required' });
    return;
  }

  // Total shares should not exceed 100
  const investors = DbManager.get('investors');
  const currentTotalShare = investors.reduce((acc, inv) => acc + inv.profitSharePercentage, 0);
  if (currentTotalShare + Number(profitSharePercentage) > 100) {
    res.status(400).json({
      success: false,
      message: `Total profit share percentage cannot exceed 100%. Currently allocated: ${currentTotalShare}%. Remaining: ${100 - currentTotalShare}%.`
    });
    return;
  }

  const newInvestor: Investor = {
    id: `inv-${Date.now()}`,
    name: name.trim(),
    investmentAmount: Number(investmentAmount),
    profitSharePercentage: Number(profitSharePercentage),
    createdAt: new Date().toISOString()
  };

  DbManager.insert('investors', newInvestor);
  res.status(201).json({ success: true, message: 'Investor added successfully', data: newInvestor });
});

app.put('/api/investors/:id', authenticate, requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, investmentAmount, profitSharePercentage } = req.body;

  if (!name || investmentAmount === undefined || profitSharePercentage === undefined) {
    res.status(400).json({ success: false, message: 'Name, investment amount, and share percentage are required' });
    return;
  }

  const investors = DbManager.get('investors');
  const otherInvestors = investors.filter(i => i.id !== id);
  const otherTotalShare = otherInvestors.reduce((acc, inv) => acc + inv.profitSharePercentage, 0);

  if (otherTotalShare + Number(profitSharePercentage) > 100) {
    res.status(400).json({
      success: false,
      message: `Total profit share percentage cannot exceed 100%. Other investors have: ${otherTotalShare}%. Remaining: ${100 - otherTotalShare}%.`
    });
    return;
  }

  const updated = DbManager.update('investors', id, (inv) => ({
    ...inv,
    name: name.trim(),
    investmentAmount: Number(investmentAmount),
    profitSharePercentage: Number(profitSharePercentage)
  }));

  if (!updated) {
    res.status(404).json({ success: false, message: 'Investor not found' });
    return;
  }

  res.json({ success: true, message: 'Investor updated successfully', data: updated });
});

app.delete('/api/investors/:id', authenticate, requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;

  const distributions = DbManager.get('profitDistributionItems');
  const hasHistory = distributions.some(d => d.investorId === id);
  if (hasHistory) {
    res.status(400).json({
      success: false,
      message: 'Cannot delete investor: they have historic profit distribution records. Clear profit distribution history first or keep active.'
    });
    return;
  }

  const deleted = DbManager.delete('investors', id);
  if (!deleted) {
    res.status(404).json({ success: false, message: 'Investor not found' });
    return;
  }
  res.json({ success: true, message: 'Investor deleted successfully' });
});

// ==========================================
// PROFIT DISTRIBUTION SYSTEM
// ==========================================

app.get('/api/distributions', authenticate, (req: Request, res: Response) => {
  const distributions = DbManager.get('profitDistributions');
  const distributionItems = DbManager.get('profitDistributionItems');
  const investors = DbManager.get('investors');

  const list = distributions.map(d => {
    const items = distributionItems
      .filter(item => item.distributionId === d.id)
      .map(item => {
        const inv = investors.find(i => i.id === item.investorId);
        return {
          ...item,
          investorName: inv ? inv.name : 'Unknown Investor'
        };
      });

    return {
      ...d,
      items
    };
  }).sort((a, b) => b.month.localeCompare(a.month));

  res.json({ success: true, message: 'Profit distributions retrieved successfully', data: list });
});

// Perform draft calculations for a month
app.get('/api/distributions/calculate', authenticate, (req: Request, res: Response) => {
  const month = req.query.month as string; // YYYY-MM

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    res.status(400).json({ success: false, message: 'Valid month in format YYYY-MM is required' });
    return;
  }

  // Calculate Gross Profit in that month
  const sales = DbManager.get('sales');
  const monthSales = sales.filter(s => s.date.startsWith(month));

  const grossProfit = monthSales.reduce((acc, s) => acc + s.grossProfit, 0);
  const totalSalesRevenue = monthSales.reduce((acc, s) => acc + s.totalAmount, 0);
  const totalCogs = monthSales.reduce((acc, s) => acc + s.cogs, 0);

  // Calculate Expenses in that month
  const expenses = DbManager.get('expenses');
  const monthExpenses = expenses.filter(e => e.date.startsWith(month));
  const totalExpenses = monthExpenses.reduce((acc, e) => acc + e.amount, 0);

  // Calculate Net Profit
  const netProfit = grossProfit - totalExpenses;

  // Calculate Investor Shares
  const investors = DbManager.get('investors');

  // Only distribute if profit > 0, otherwise it's a loss (loss is cached but distributedAmount is 0 or negative)
  const distributionItems = investors.map(inv => {
    const shareAmt = netProfit > 0 ? (netProfit * inv.profitSharePercentage) / 100 : 0;
    return {
      investorId: inv.id,
      investorName: inv.name,
      sharePercentage: inv.profitSharePercentage,
      profitAmount: shareAmt
    };
  });

  res.json({
    success: true,
    message: `Calculated values for ${month}`,
    data: {
      month,
      totalSalesRevenue,
      totalCogs,
      grossProfit,
      expenses: totalExpenses,
      netProfit,
      distributedAmount: netProfit > 0 ? netProfit : 0,
      items: distributionItems
    }
  });
});

app.post('/api/distributions', authenticate, requireAdmin, (req: Request, res: Response) => {
  const { month } = req.body;

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    res.status(400).json({ success: false, message: 'Valid month in format YYYY-MM is required' });
    return;
  }

  const existing = DbManager.get('profitDistributions').find(d => d.month === month);
  if (existing) {
    res.status(400).json({ success: false, message: `Profit distribution for ${month} is already submitted and saved.` });
    return;
  }

  // Do calculations on current records
  const sales = DbManager.get('sales').filter(s => s.date.startsWith(month));
  const grossProfit = sales.reduce((acc, s) => acc + s.grossProfit, 0);

  const expenses = DbManager.get('expenses').filter(e => e.date.startsWith(month));
  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
  const netProfit = grossProfit - totalExpenses;

  const investors = DbManager.get('investors');
  if (investors.length === 0) {
    res.status(400).json({ success: false, message: 'Cannot save: no investors are defined in the system.' });
    return;
  }

  const distId = `dist-${Date.now()}`;
  const distributedAmount = netProfit > 0 ? netProfit : 0;

  const newDistribution: ProfitDistribution = {
    id: distId,
    month,
    grossProfit,
    expenses: totalExpenses,
    netProfit,
    distributedAmount,
    createdAt: new Date().toISOString()
  };

  const newItems: ProfitDistributionItem[] = investors.map((inv, index) => {
    const profitAmount = netProfit > 0 ? (netProfit * inv.profitSharePercentage) / 100 : 0;
    return {
      id: `dist-item-${Date.now()}-${index}`,
      distributionId: distId,
      investorId: inv.id,
      sharePercentage: inv.profitSharePercentage,
      profitAmount
    };
  });

  // Save
  DbManager.insert('profitDistributions', newDistribution);
  for (const item of newItems) {
    DbManager.insert('profitDistributionItems', item);
  }

  res.status(201).json({
    success: true,
    message: `Profit distribution for ${month} saved successfully!`,
    data: {
      ...newDistribution,
      items: newItems.map(item => ({
        ...item,
        investorName: investors.find(i => i.id === item.investorId)?.name
      }))
    }
  });
});

// Delete a distribution history to allow recalculation
app.delete('/api/distributions/:id', authenticate, requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;

  // Delete matching items first
  const items = DbManager.get('profitDistributionItems').filter(item => item.distributionId !== id);
  DbManager.truncateAndReplace('profitDistributionItems', items);

  const deleted = DbManager.delete('profitDistributions', id);
  if (!deleted) {
    res.status(404).json({ success: false, message: 'Distribution record not found' });
    return;
  }

  res.json({ success: true, message: 'Distribution record cleared. You can recalculate and submit again.' });
});

// ==========================================
// DASHBOARD & SUMMARY METRICS
// ==========================================

app.get('/api/dashboard/summary', authenticate, (req: Request, res: Response) => {
  const products = DbManager.get('products').filter(p => !p.archived);
  const categories = DbManager.get('categories');
  const sales = DbManager.get('sales');
  const expenses = DbManager.get('expenses');
  const saleItems = DbManager.get('saleItems');

  // Total metrics
  const totalProducts = products.length;
  const totalStockValue = products.reduce((acc, p) => acc + (p.costPrice * p.currentStock), 0);

  // Today's Sales
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySalesList = sales.filter(s => s.date.startsWith(todayStr));
  const todaySales = todaySalesList.reduce((acc, s) => acc + s.totalAmount, 0);

  // Monthly Sales (current month)
  const currentMonthStr = new Date().toISOString().substring(0, 7); // YYYY-MM
  const currentMonthSalesList = sales.filter(s => s.date.startsWith(currentMonthStr));
  const monthlySales = currentMonthSalesList.reduce((acc, s) => acc + s.totalAmount, 0);

  // Profits (overall)
  const grossProfit = sales.reduce((acc, s) => acc + s.grossProfit, 0);
  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
  const netProfit = grossProfit - totalExpenses;

  // Low Stock products
  const lowStockProducts = products
    .filter(p => p.currentStock <= p.minimumStock)
    .map(p => {
      const cat = categories.find(c => c.id === p.categoryId);
      return {
        ...p,
        categoryName: cat ? cat.name : 'Unknown'
      };
    });

  // Top Selling Products
  // Aggregate sales by product
  const productSalesMap: Record<string, { quantity: number; revenue: number; name: string; SKU: string }> = {};
  for (const item of saleItems) {
    const prod = products.find(p => p.id === item.productId);
    if (!prod) continue;

    if (!productSalesMap[item.productId]) {
      productSalesMap[item.productId] = {
        quantity: 0,
        revenue: 0,
        name: prod.name,
        SKU: prod.SKU
      };
    }

    productSalesMap[item.productId].quantity += item.quantity;
    productSalesMap[item.productId].revenue += item.sellingPrice * item.quantity;
  }

  const topSellingProducts = Object.values(productSalesMap)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  // Charts: Daily Sales (last 14 days) and Monthly Sales (last 6 months)
  const dailySalesChart: { date: string; amount: number; profit: number }[] = [];
  const monthlySalesChart: { month: string; amount: number; profit: number }[] = [];

  // Last 14 days
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];

    const daySales = sales.filter(s => s.date.startsWith(dateStr));
    const amt = daySales.reduce((acc, s) => acc + s.totalAmount, 0);
    const prof = daySales.reduce((acc, s) => acc + s.grossProfit, 0);

    // Label as 'Jun 29' or similar
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    dailySalesChart.push({ date: label, amount: amt, profit: prof });
  }

  // Last 6 months
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const monthStr = `${year}-${month}`;

    const mSales = sales.filter(s => s.date.startsWith(monthStr));
    const amt = mSales.reduce((acc, s) => acc + s.totalAmount, 0);
    const prof = mSales.reduce((acc, s) => acc + s.grossProfit, 0);

    const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    monthlySalesChart.push({ month: label, amount: amt, profit: prof });
  }

  res.json({
    success: true,
    message: 'Dashboard stats compiled successfully',
    data: {
      totalProducts,
      totalStockValue,
      todaySales,
      monthlySales,
      grossProfit,
      netProfit,
      lowStockProducts,
      topSellingProducts,
      dailySalesChart,
      monthlySalesChart
    }
  });
});

// ==========================================
// VITE OR STATIC SERVING IN PRODUCTION
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

if (process.env.VERCEL !== '1') {
  startServer();
}

export default app;
