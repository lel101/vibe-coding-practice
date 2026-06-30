export type UserRole = 'Admin';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

export interface Product {
  id: string;
  SKU: string;
  name: string;
  categoryId: string;
  costPrice: number;
  sellingPrice: number;
  currentStock: number;
  minimumStock: number;
  unit: string;
  status: 'Active' | 'Inactive';
  createdAt: string;
  archived: boolean;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  createdAt: string;
}

export interface PurchaseItem {
  id: string;
  purchaseId: string;
  productId: string;
  quantity: number;
  costPrice: number;
  // Included in API response for rich details:
  productName?: string;
}

export interface Purchase {
  id: string;
  purchaseDate: string;
  supplierId: string;
  notes?: string;
  totalAmount: number;
  createdAt: string;
  // Rich joins:
  supplierName?: string;
  items?: PurchaseItem[];
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  quantity: number;
  sellingPrice: number;
  costPrice: number; // For COGS calculations at the time of sale
  // Included in API response:
  productName?: string;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  date: string;
  customer?: string;
  paymentMethod: 'Cash' | 'Bank Transfer' | 'Credit Card' | 'Other';
  discount: number;
  totalAmount: number;
  cogs: number;
  grossProfit: number;
  notes?: string;
  createdAt: string;
  // Rich joins:
  items?: SaleItem[];
}

export type ExpenseCategory = 'Rent' | 'Electricity' | 'Salary' | 'Transportation' | 'Miscellaneous';

export interface Expense {
  id: string;
  date: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  createdAt: string;
}

export interface Investor {
  id: string;
  name: string;
  investmentAmount: number;
  profitSharePercentage: number; // e.g. 60 meaning 60%
  createdAt: string;
}

export interface ProfitDistributionItem {
  id: string;
  distributionId: string;
  investorId: string;
  sharePercentage: number;
  profitAmount: number;
  // Joins:
  investorName?: string;
}

export interface ProfitDistribution {
  id: string;
  month: string; // YYYY-MM
  grossProfit: number;
  expenses: number;
  netProfit: number;
  distributedAmount: number;
  createdAt: string;
  // Joins:
  items?: ProfitDistributionItem[];
}

// API Response Wrappers
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}
