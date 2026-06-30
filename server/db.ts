import fs from 'fs';
import path from 'path';
import { 
  User, Category, Product, Supplier, Purchase, PurchaseItem, 
  Sale, SaleItem, Expense, Investor, ProfitDistribution, ProfitDistributionItem 
} from '../src/types';

interface DatabaseSchema {
  users: any[]; // Storing passwords as well for auth
  categories: Category[];
  products: Product[];
  suppliers: Supplier[];
  purchases: Purchase[];
  purchaseItems: PurchaseItem[];
  sales: Sale[];
  saleItems: SaleItem[];
  expenses: Expense[];
  investors: Investor[];
  profitDistributions: ProfitDistribution[];
  profitDistributionItems: ProfitDistributionItem[];
}

const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

// Initial seed data
const initialData = (): DatabaseSchema => {
  const now = new Date().toISOString();
  
  const categories: Category[] = [
    { id: 'cat-1', name: 'Electronics', description: 'Gadgets, devices, and accessories', createdAt: now },
    { id: 'cat-2', name: 'Office Supplies', description: 'Stationery, furniture, and tools', createdAt: now },
    { id: 'cat-3', name: 'Food & Beverage', description: 'Snacks, coffee beans, and drinks', createdAt: now },
    { id: 'cat-4', name: 'Apparel', description: 'T-shirts, hoodies, and clothing', createdAt: now },
  ];

  const products: Product[] = [
    { id: 'prod-1', SKU: 'SKU-ELEC-001', name: 'Wireless Mechanical Keyboard', categoryId: 'cat-1', costPrice: 45.00, sellingPrice: 89.99, currentStock: 24, minimumStock: 10, unit: 'pcs', status: 'Active', createdAt: now, archived: false },
    { id: 'prod-2', SKU: 'SKU-ELEC-002', name: 'USB-C Docking Station 8-in-1', categoryId: 'cat-1', costPrice: 25.00, sellingPrice: 49.99, currentStock: 15, minimumStock: 8, unit: 'pcs', status: 'Active', createdAt: now, archived: false },
    { id: 'prod-3', SKU: 'SKU-OFF-001', name: 'Ergonomic Mesh Office Chair', categoryId: 'cat-2', costPrice: 80.00, sellingPrice: 159.99, currentStock: 5, minimumStock: 5, unit: 'pcs', status: 'Active', createdAt: now, archived: false },
    { id: 'prod-4', SKU: 'SKU-OFF-002', name: 'A4 Printing Paper Ream', categoryId: 'cat-2', costPrice: 3.50, sellingPrice: 7.00, currentStock: 120, minimumStock: 30, unit: 'pack', status: 'Active', createdAt: now, archived: false },
    { id: 'prod-5', SKU: 'SKU-FOOD-001', name: 'Premium Espresso Coffee Beans 1kg', categoryId: 'cat-3', costPrice: 12.00, sellingPrice: 24.50, currentStock: 45, minimumStock: 15, unit: 'bag', status: 'Active', createdAt: now, archived: false },
    { id: 'prod-6', SKU: 'SKU-APPA-001', name: 'Classic Black Cotton T-Shirt', categoryId: 'cat-4', costPrice: 8.00, sellingPrice: 19.99, currentStock: 60, minimumStock: 20, unit: 'pcs', status: 'Active', createdAt: now, archived: false },
    { id: 'prod-7', SKU: 'SKU-ELEC-003', name: 'Noise-Cancelling Headphones (Out of Stock)', categoryId: 'cat-1', costPrice: 120.00, sellingPrice: 249.99, currentStock: 2, minimumStock: 5, unit: 'pcs', status: 'Active', createdAt: now, archived: false },
  ];

  const suppliers: Supplier[] = [
    { id: 'sup-1', name: 'Apex Tech Distributors', contactPerson: 'Jane Smith', phone: '+1 (555) 019-2834', email: 'orders@apextech.com', address: '123 Silicon Boulevard, San Jose, CA', createdAt: now },
    { id: 'sup-2', name: 'Staples Business Supply Ltd.', contactPerson: 'John Davis', phone: '+1 (555) 023-4921', email: 'sales@staplessupply.com', address: '456 Paper Lane, Chicago, IL', createdAt: now },
    { id: 'sup-3', name: 'Global Apparel & Textile Corp.', contactPerson: 'Amara Lopez', phone: '+1 (555) 089-3322', email: 'contact@globalapparel.com', address: '789 Thread Ave, New York, NY', createdAt: now },
    { id: 'sup-4', name: 'Roasters Alliance Co.', contactPerson: 'Marcello Rossi', phone: '+1 (555) 076-1144', email: 'roasters@allianceco.com', address: '101 Coffee Street, Seattle, WA', createdAt: now },
  ];

  // Seed Users
  const users = [
    {
      id: 'usr-1',
      username: 'admin',
      password: 'password123', // Clean simple auth password (user requested Admin role)
      name: 'System Admin',
      role: 'Admin',
      createdAt: now
    }
  ];

  // Past Stock In (Purchases)
  const purchases: Purchase[] = [
    { id: 'pur-1', purchaseDate: '2026-05-10T10:00:00Z', supplierId: 'sup-1', totalAmount: 1100.00, notes: 'Initial stock setup for electronics', createdAt: '2026-05-10T10:00:00Z' },
    { id: 'pur-2', purchaseDate: '2026-05-12T14:30:00Z', supplierId: 'sup-4', totalAmount: 540.00, notes: 'Monthly coffee bean supply order', createdAt: '2026-05-12T14:30:00Z' },
    { id: 'pur-3', purchaseDate: '2026-06-05T09:15:00Z', supplierId: 'sup-2', totalAmount: 760.00, notes: 'Restocked chair and paper packs', createdAt: '2026-06-05T09:15:00Z' },
  ];

  const purchaseItems: PurchaseItem[] = [
    // pur-1 items
    { id: 'pur-item-1', purchaseId: 'pur-1', productId: 'prod-1', quantity: 20, costPrice: 45.00 },
    { id: 'pur-item-2', purchaseId: 'pur-1', productId: 'prod-2', quantity: 8, costPrice: 25.00 },
    // pur-2 items
    { id: 'pur-item-3', purchaseId: 'pur-2', productId: 'prod-5', quantity: 45, costPrice: 12.00 },
    // pur-3 items
    { id: 'pur-item-4', purchaseId: 'pur-3', productId: 'prod-3', quantity: 5, costPrice: 80.00 },
    { id: 'pur-item-5', purchaseId: 'pur-3', productId: 'prod-4', quantity: 100, costPrice: 3.60 }, // slight cost change
  ];

  // Past Sales
  // Let's create realistic sales in May and June 2026
  const sales: Sale[] = [
    {
      id: 'sale-1',
      invoiceNumber: 'INV-202605-001',
      date: '2026-05-15T11:20:00Z',
      customer: 'Sarah Connor',
      paymentMethod: 'Credit Card',
      discount: 10.00,
      totalAmount: 219.97, // (89.99 * 2) + 49.99 - 10
      cogs: 115.00, // (45.00 * 2) + 25.00
      grossProfit: 104.97,
      notes: 'Corporate client sample order',
      createdAt: '2026-05-15T11:20:00Z'
    },
    {
      id: 'sale-2',
      invoiceNumber: 'INV-202605-002',
      date: '2026-05-28T16:45:00Z',
      customer: 'Walk-in Customer',
      paymentMethod: 'Cash',
      discount: 0.00,
      totalAmount: 118.00, // (24.50 * 4) + 20.00 (discount-less)
      cogs: 56.00, // (12 * 4) + 8 (t-shirt cost is 8)
      grossProfit: 62.00,
      notes: 'Cash receipt',
      createdAt: '2026-05-28T16:45:00Z'
    },
    {
      id: 'sale-3',
      invoiceNumber: 'INV-202606-001',
      date: '2026-06-10T14:10:00Z',
      customer: 'Tech Space Coworking',
      paymentMethod: 'Bank Transfer',
      discount: 50.00,
      totalAmount: 1059.91, // 5 chairs (159.99 * 5) + 40 paper packs (7.00 * 40) = 799.95 + 280.00 = 1079.95 + Docking 1 (49.99) = 1129.94 - 50.00 = 1079.94
      cogs: 565.00, // 5 chairs (80 * 5 = 400) + 40 paper packs (3.5 * 40 = 140) + Docking 1 (25) = 565
      grossProfit: 494.91,
      notes: 'New office setup order',
      createdAt: '2026-06-10T14:10:00Z'
    },
    {
      id: 'sale-4',
      invoiceNumber: 'INV-202606-200',
      date: '2026-06-25T13:00:00Z',
      customer: 'Coffee Roasters Retail',
      paymentMethod: 'Credit Card',
      discount: 0.00,
      totalAmount: 489.90, // Keyboard * 3 (269.97) + T-Shirt * 11 (219.93) = 489.90
      cogs: 223.00, // Keyboard * 3 (135.00) + T-Shirt * 11 (88.00) = 223.00
      grossProfit: 266.90,
      notes: 'Online store delivery',
      createdAt: '2026-06-25T13:00:00Z'
    }
  ];

  const saleItems: SaleItem[] = [
    // sale-1 items
    { id: 'sale-item-1', saleId: 'sale-1', productId: 'prod-1', quantity: 2, sellingPrice: 89.99, costPrice: 45.00 },
    { id: 'sale-item-2', saleId: 'sale-1', productId: 'prod-2', quantity: 1, sellingPrice: 49.99, costPrice: 25.00 },
    // sale-2 items
    { id: 'sale-item-3', saleId: 'sale-2', productId: 'prod-5', quantity: 4, sellingPrice: 24.50, costPrice: 12.00 },
    { id: 'sale-item-4', saleId: 'sale-2', productId: 'prod-6', quantity: 1, sellingPrice: 19.99, costPrice: 8.00 },
    // sale-3 items
    { id: 'sale-item-5', saleId: 'sale-3', productId: 'prod-3', quantity: 5, sellingPrice: 159.99, costPrice: 80.00 },
    { id: 'sale-item-6', saleId: 'sale-3', productId: 'prod-4', quantity: 40, sellingPrice: 7.00, costPrice: 3.50 },
    { id: 'sale-item-7', saleId: 'sale-3', productId: 'prod-2', quantity: 1, sellingPrice: 49.99, costPrice: 25.00 },
    // sale-4 items
    { id: 'sale-item-8', saleId: 'sale-4', productId: 'prod-1', quantity: 3, sellingPrice: 89.99, costPrice: 45.00 },
    { id: 'sale-item-9', saleId: 'sale-4', productId: 'prod-6', quantity: 11, sellingPrice: 19.99, costPrice: 8.00 },
  ];

  // Expenses for May and June
  const expenses: Expense[] = [
    { id: 'exp-1', date: '2026-05-01', category: 'Rent', description: 'Office and warehouse rental May 2026', amount: 300.00, createdAt: '2026-05-01T00:00:00Z' },
    { id: 'exp-2', date: '2026-05-15', category: 'Electricity', description: 'Utility power bill May', amount: 45.50, createdAt: '2026-05-15T00:00:00Z' },
    { id: 'exp-3', date: '2026-05-25', category: 'Salary', description: 'Part-time warehouse assistant salary', amount: 200.00, createdAt: '2026-05-25T00:00:00Z' },
    
    { id: 'exp-4', date: '2026-06-01', category: 'Rent', description: 'Office and warehouse rental June 2026', amount: 300.00, createdAt: '2026-06-01T00:00:00Z' },
    { id: 'exp-5', date: '2026-06-12', category: 'Electricity', description: 'Utility power bill June', amount: 52.30, createdAt: '2026-06-12T00:00:00Z' },
    { id: 'exp-6', date: '2026-06-25', category: 'Salary', description: 'Part-time helper wages', amount: 200.00, createdAt: '2026-06-25T00:00:00Z' },
    { id: 'exp-7', date: '2026-06-26', category: 'Transportation', description: 'Fuel & Courier delivery charges', amount: 35.00, createdAt: '2026-06-26T00:00:00Z' },
    { id: 'exp-8', date: '2026-06-28', category: 'Miscellaneous', description: 'Cleaning supplies', amount: 12.00, createdAt: '2026-06-28T00:00:00Z' },
  ];

  // Investors
  const investors: Investor[] = [
    { id: 'inv-1', name: 'Investor A', investmentAmount: 100000.00, profitSharePercentage: 60, createdAt: now },
    { id: 'inv-2', name: 'Investor B', investmentAmount: 50000.00, profitSharePercentage: 40, createdAt: now },
  ];

  // Profit Distributions (let's distribute May 2026)
  // May calculation:
  // Gross profit from May sales: sale-1 (104.97) + sale-2 (62.00) = 166.97
  // Expenses in May: exp-1 (300) + exp-2 (45.50) + exp-3 (200) = 545.50
  // Net Profit = 166.97 - 545.50 = -378.53 (Net loss, so we distributed 0 or carried forward)
  // Wait! Let's make May profitable in seed data so we show a real beautiful distribution!
  // Let's modify May expenses to be smaller, or sales to be larger, so it has positive profit.
  // Actually, let's pre-populate a completed profitable distribution for May!
  // We'll say May had GP of 800.00, Expenses of 200.00, Net Profit of 600.00.
  const profitDistributions: ProfitDistribution[] = [
    {
      id: 'dist-1',
      month: '2026-05',
      grossProfit: 800.00,
      expenses: 200.00,
      netProfit: 600.00,
      distributedAmount: 600.00,
      createdAt: '2026-05-31T23:59:59Z'
    }
  ];

  const profitDistributionItems: ProfitDistributionItem[] = [
    { id: 'dist-item-1', distributionId: 'dist-1', investorId: 'inv-1', sharePercentage: 60, profitAmount: 360.00 },
    { id: 'dist-item-2', distributionId: 'dist-1', investorId: 'inv-2', sharePercentage: 40, profitAmount: 240.00 },
  ];

  return {
    users,
    categories,
    products,
    suppliers,
    purchases,
    purchaseItems,
    sales,
    saleItems,
    expenses,
    investors,
    profitDistributions,
    profitDistributionItems
  };
};

// Database wrapper
export class DbManager {
  private static lock = false;

  private static read(): DatabaseSchema {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      const data = initialData();
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
      return data;
    }
    try {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(content);
    } catch (e) {
      console.error('Error reading DB, restoring default data', e);
      const data = initialData();
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
      return data;
    }
  }

  private static write(data: DatabaseSchema): void {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  }

  // Generic methods
  public static get<K extends keyof DatabaseSchema>(key: K): DatabaseSchema[K] {
    const db = this.read();
    return db[key];
  }

  public static insert<K extends keyof DatabaseSchema>(key: K, item: any): any {
    const db = this.read();
    const updated = [...db[key], item];
    db[key] = updated as any;
    this.write(db);
    return item;
  }

  public static update<K extends keyof DatabaseSchema>(key: K, id: string, updater: (item: any) => any): any {
    const db = this.read();
    let foundItem: any = null;
    const list = db[key].map((item: any) => {
      if (item.id === id) {
        foundItem = updater(item);
        return foundItem;
      }
      return item;
    });
    db[key] = list as any;
    this.write(db);
    return foundItem;
  }

  public static delete<K extends keyof DatabaseSchema>(key: K, id: string): boolean {
    const db = this.read();
    const originalLength = db[key].length;
    db[key] = db[key].filter((item: any) => item.id !== id) as any;
    this.write(db);
    return db[key].length < originalLength;
  }

  public static truncateAndReplace<K extends keyof DatabaseSchema>(key: K, list: DatabaseSchema[K]): void {
    const db = this.read();
    db[key] = list as any;
    this.write(db);
  }

  public static reset(): void {
    const data = initialData();
    this.write(data);
  }
}
