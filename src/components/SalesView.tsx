import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { Sale, Product } from '../types';
import { 
  Plus, Calendar, Trash2, ShieldCheck, AlertTriangle, 
  History, PlusCircle, CheckCircle2, Eye, Receipt, ShoppingBag, 
  CreditCard, DollarSign 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SaleBasketItem {
  productId: string;
  name: string;
  SKU: string;
  quantity: number;
  sellingPrice: number;
  costPrice: number; // For calculations
  unit: string;
  maxAvailableStock: number;
}

export default function SalesView() {
  const [activeTab, setActiveTab] = useState<'history' | 'new'>('history');
  
  // Data sets
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New Sale Invoice Form States
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [customer, setCustomer] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank Transfer' | 'Credit Card' | 'Other'>('Cash');
  const [discount, setDiscount] = useState('0.00');
  const [notes, setNotes] = useState('');
  const [basket, setBasket] = useState<SaleBasketItem[]>([]);

  // Product Selection Helper States
  const [selectedProductId, setSelectedProductId] = useState('');
  const [inputQuantity, setInputQuantity] = useState('1');
  const [inputSellPrice, setInputSellPrice] = useState('0.00');

  // Modal receipt detail state
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [salesRes, prodRes] = await Promise.all([
        api.get<{ success: boolean; data: Sale[] }>('/sales'),
        api.get<{ success: boolean; data: Product[] }>('/products')
      ]);

      if (salesRes.success && salesRes.data) setSales(salesRes.data);
      if (prodRes.success && prodRes.data) {
        // filter out archived or Inactive products
        const activeAndValid = prodRes.data.filter(p => !p.archived && p.status === 'Active');
        setProducts(activeAndValid);
        if (activeAndValid.length > 0) {
          setSelectedProductId(activeAndValid[0].id);
          setInputSellPrice(activeAndValid[0].sellingPrice.toString());
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error compiling sales database');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update selling price input and check stock bounds when selecting product in dropdown selector
  useEffect(() => {
    const p = products.find(prod => prod.id === selectedProductId);
    if (p) {
      setInputSellPrice(p.sellingPrice.toString());
    }
  }, [selectedProductId, products]);

  const handleAddToInvoiceBasket = () => {
    if (!selectedProductId) return;

    const prod = products.find(p => p.id === selectedProductId);
    if (!prod) return;

    const qty = Number(inputQuantity);
    const price = Number(inputSellPrice);

    if (isNaN(qty) || qty <= 0) {
      alert('Quantity must be a positive integer');
      return;
    }
    if (isNaN(price) || price < 0) {
      alert('Selling price must be a valid positive amount');
      return;
    }

    // Check available stock limits
    if (prod.currentStock < qty) {
      alert(`Insufficient stock level. Product "${prod.name}" has only ${prod.currentStock} ${prod.unit}s available.`);
      return;
    }

    // Check if item is already added to basket
    const exists = basket.find(item => item.productId === selectedProductId);
    const addedQty = exists ? exists.quantity + qty : qty;
    
    if (prod.currentStock < addedQty) {
      alert(`Insufficient stock. Total quantity in basket (${addedQty}) exceeds available inventory (${prod.currentStock} ${prod.unit}s).`);
      return;
    }

    if (exists) {
      setBasket(basket.map(item => item.productId === selectedProductId 
        ? { ...item, quantity: addedQty, sellingPrice: price } 
        : item
      ));
    } else {
      setBasket([...basket, {
        productId: selectedProductId,
        name: prod.name,
        SKU: prod.SKU,
        quantity: qty,
        sellingPrice: price,
        costPrice: prod.costPrice,
        unit: prod.unit,
        maxAvailableStock: prod.currentStock
      }]);
    }
  };

  const handleRemoveFromInvoiceBasket = (productId: string) => {
    setBasket(basket.filter(item => item.productId !== productId));
  };

  const handleCheckoutInvoice = async () => {
    if (basket.length === 0) {
      alert('Invoice basket is empty.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        date: new Date(saleDate).toISOString(),
        customer: customer.trim() || 'Walk-in Customer',
        paymentMethod,
        discount: Number(discount) || 0,
        notes: notes.trim(),
        items: basket.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          sellingPrice: item.sellingPrice
        }))
      };

      const response = await api.post<{ success: boolean; data: Sale }>('/sales', payload);
      if (response.success && response.data) {
        // Clear
        setBasket([]);
        setCustomer('');
        setDiscount('0.00');
        setNotes('');
        setPaymentMethod('Cash');
        setActiveTab('history');
        // Sync
        await fetchData();
      }
    } catch (err: any) {
      alert(err.message || 'Error finalizing transaction');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewReceipt = (sale: Sale) => {
    setSelectedSale(sale);
    setDetailModalOpen(true);
  };

  // Calculations
  const subtotal = basket.reduce((acc, item) => acc + (item.sellingPrice * item.quantity), 0);
  const totalCogs = basket.reduce((acc, item) => acc + (item.costPrice * item.quantity), 0);
  const discountAmt = Number(discount) || 0;
  const totalInvoiceAmount = subtotal - discountAmt;
  const grossProfit = totalInvoiceAmount - totalCogs;

  const currencyFormatter = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Sales Invoice Desk</h2>
          <p className="text-xs text-slate-400 mt-1">Issue receipts, adjust retail discounts, track product sales and monitor gross profit margins</p>
        </div>

        {/* Tab Switch */}
        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition ${
              activeTab === 'history' 
                ? 'bg-slate-800 text-emerald-400 border border-slate-700/40 shadow-sm' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Sales History</span>
          </button>
          <button
            onClick={() => setActiveTab('new')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition ${
              activeTab === 'new' 
                ? 'bg-slate-800 text-emerald-400 border border-slate-700/40 shadow-sm' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Issue New Invoice</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/25 text-red-400 rounded-xl text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Tab Panels */}
      {activeTab === 'history' ? (
        /* TAB 1: HISTORICAL SALES */
        <div className="bg-slate-800 border border-slate-700/50 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-24 text-center">
                <span className="inline-block w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></span>
                <p className="text-slate-400 text-xs mt-3">Syncing invoice transaction logs...</p>
              </div>
            ) : sales.length === 0 ? (
              <div className="py-24 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
                <ShoppingBag className="w-8 h-8 opacity-40 mb-1" />
                <p className="text-sm font-semibold">No sales transactions found</p>
                <p className="text-xs">Click "Issue New Invoice" to initiate a checkout transaction.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-700/50 text-[10px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-900/30">
                    <th className="py-3.5 px-5">Invoice No</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Customer</th>
                    <th className="py-3.5 px-4">Payment Method</th>
                    <th className="py-3.5 px-4 text-right">Discount</th>
                    <th className="py-3.5 px-4 text-right">Gross Profit</th>
                    <th className="py-3.5 px-4 text-right">Invoice Amount</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/30 text-xs">
                  {sales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-slate-700/10 transition-colors">
                      <td className="py-3.5 px-5 font-mono text-slate-300 font-bold">{sale.invoiceNumber}</td>
                      <td className="py-3.5 px-4 text-slate-300">{new Date(sale.date).toLocaleDateString()}</td>
                      <td className="py-3.5 px-4 font-semibold text-white">{sale.customer}</td>
                      <td className="py-3.5 px-4 text-slate-400">
                        <span className="inline-flex items-center gap-1.5 py-0.5 px-2 bg-slate-900/40 border border-slate-700/40 rounded-lg text-[10px] font-medium font-sans">
                          {sale.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-400 font-mono">-{currencyFormatter(sale.discount)}</td>
                      <td className="py-3.5 px-4 text-right text-emerald-400 font-mono font-medium">+{currencyFormatter(sale.grossProfit)}</td>
                      <td className="py-3.5 px-4 text-right font-mono font-extrabold text-white text-sm">
                        {currencyFormatter(sale.totalAmount)}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <button
                          onClick={() => handleViewReceipt(sale)}
                          className="p-1.5 bg-slate-900 border border-slate-700/60 text-emerald-400 hover:text-white rounded-lg transition hover:bg-slate-700 cursor-pointer inline-flex items-center gap-1 text-[11px] font-bold"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Receipt</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : (
        /* TAB 2: REGISTER INVOICE OUT (CHECKOUT POINT OF SALES TERMINAL) */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left panel: Form parameters */}
          <div className="lg:col-span-1 bg-slate-800 border border-slate-700/50 rounded-2xl p-6 space-y-6">
            <h3 className="font-bold text-white text-sm uppercase tracking-wide border-b border-slate-700/40 pb-3 flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-emerald-400" />
              <span>1. Invoice Header</span>
            </h3>

            <div className="space-y-4">
              {/* Customer */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Customer Name (Optional)</label>
                <input
                  type="text"
                  value={customer}
                  onChange={(e) => setCustomer(e.target.value)}
                  placeholder="e.g. Sarah Connor / Walk-in"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                />
              </div>

              {/* Invoice Date & Payment Method */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Date</label>
                  <input
                    type="date"
                    value={saleDate}
                    onChange={(e) => setSaleDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Payment</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition cursor-pointer appearance-none"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            <h3 className="font-bold text-white text-sm uppercase tracking-wide border-b border-slate-700/40 pt-2 pb-3 flex items-center gap-1.5">
              <ShoppingBag className="w-4 h-4 text-emerald-400" />
              <span>2. Product Selector</span>
            </h3>

            <div className="space-y-4">
              {/* Product */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Select Active Product</label>
                {products.length === 0 ? (
                  <p className="text-xs text-amber-400 font-semibold italic">No active products are stocked in the database.</p>
                ) : (
                  <div className="relative">
                    <select
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition appearance-none cursor-pointer"
                    >
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.SKU}) — {p.currentStock} {p.unit} left</option>
                      ))}
                    </select>
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 text-xs">▼</span>
                  </div>
                )}
              </div>

              {/* Selling Price & Qty */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Unit Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={inputSellPrice}
                    onChange={(e) => setInputSellPrice(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Qty to Sell</label>
                  <input
                    type="number"
                    min="1"
                    value={inputQuantity}
                    onChange={(e) => setInputQuantity(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition font-mono"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddToInvoiceBasket}
                disabled={products.length === 0}
                className="w-full py-2 px-4 bg-slate-900 hover:bg-slate-950 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/40 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-30"
              >
                <Plus className="w-4 h-4" />
                <span>Add Item to Invoice</span>
              </button>
            </div>
          </div>

          {/* Right panel: Active Invoice lines and checkout calculations */}
          <div className="lg:col-span-2 bg-slate-800 border border-slate-700/50 rounded-2xl p-6 flex flex-col justify-between shadow-xl">
            <div className="space-y-5 flex-1">
              <h3 className="font-bold text-white text-sm uppercase tracking-wide border-b border-slate-700/40 pb-3 flex justify-between items-center">
                <span>3. Invoice Draft</span>
                <span className="font-mono text-emerald-400 font-bold text-sm bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-500/10">
                  {basket.length} products added
                </span>
              </h3>

              {basket.length === 0 ? (
                <div className="py-24 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
                  <ShoppingBag className="w-8 h-8 opacity-30" />
                  <p className="text-xs font-medium">Invoice basket is empty</p>
                  <p className="text-[11px] max-w-[220px]">Fill details on the left, select products, and click "Add Item to Invoice".</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-700/40 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="pb-2.5">Product Line</th>
                        <th className="pb-2.5 text-center">Qty</th>
                        <th className="pb-2.5 text-right">Retail Sell Price</th>
                        <th className="pb-2.5 text-right">Subtotal</th>
                        <th className="pb-2.5 text-right">Clear</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/20 text-xs">
                      {basket.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/10">
                          <td className="py-3 font-medium text-white max-w-[180px] truncate">
                            <p className="font-bold truncate">{item.name}</p>
                            <span className="text-[10px] text-slate-400 font-mono tracking-wider">{item.SKU}</span>
                          </td>
                          <td className="py-3 text-center font-mono font-bold text-slate-300">
                            {item.quantity} {item.unit}
                            <span className="block text-[8px] text-slate-500 tracking-wide font-normal">Available: {item.maxAvailableStock}</span>
                          </td>
                          <td className="py-3 text-right font-mono text-slate-400">{currencyFormatter(item.sellingPrice)}</td>
                          <td className="py-3 text-right font-mono font-bold text-slate-200">{currencyFormatter(item.sellingPrice * item.quantity)}</td>
                          <td className="py-3 text-right">
                            <button
                              onClick={() => handleRemoveFromInvoiceBasket(item.productId)}
                              className="text-red-400 hover:text-red-300 transition cursor-pointer p-1 rounded hover:bg-red-500/10"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Calculations & Checkout Form Footer */}
            {basket.length > 0 && (
              <div className="pt-6 border-t border-slate-700/50 mt-6 space-y-5">
                {/* Discount and Memo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Customer Coupon / Discount ($)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-3.5 h-3.5" />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={discount}
                        onChange={(e) => setDiscount(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 pl-8 pr-3 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Logistics Notes / Memo</label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Courier shipping info, cash receipt ID..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                    />
                  </div>
                </div>

                {/* Ledger Breakdown Card */}
                <div className="bg-slate-900/40 border border-slate-700/40 p-4 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-4 text-center items-center">
                  <div>
                    <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider block">Basket Subtotal</span>
                    <span className="text-sm font-bold text-slate-300 font-mono mt-1 block">{currencyFormatter(subtotal)}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider block">Discount Applied</span>
                    <span className="text-sm font-bold text-red-400 font-mono mt-1 block">-{currencyFormatter(discountAmt)}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider block">Est. Wholesale COGS</span>
                    <span className="text-sm font-bold text-slate-400 font-mono mt-1 block">{currencyFormatter(totalCogs)}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider block">Estimated Gross Profit</span>
                    <span className={`text-sm font-bold font-mono mt-1 block ${grossProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {currencyFormatter(grossProfit)}
                    </span>
                  </div>
                </div>

                {/* Grand Total Checkout */}
                <div className="flex justify-between items-center bg-slate-900/70 border border-slate-700/50 p-4 rounded-xl">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Grand Total Invoice Out Amount</p>
                    <span className="text-2xl font-extrabold text-white font-mono mt-1 block">
                      {currencyFormatter(totalInvoiceAmount)}
                    </span>
                  </div>
                  <button
                    onClick={handleCheckoutInvoice}
                    disabled={submitting}
                    className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-slate-950 font-extrabold text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-lg shadow-emerald-500/10 disabled:opacity-50 transition"
                  >
                    {submitting ? 'Processing...' : 'Finalize & Record Sale'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sales Receipt Modal */}
      <AnimatePresence>
        {detailModalOpen && selectedSale && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/20">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-sm font-mono font-bold text-white">Invoice: {selectedSale.invoiceNumber}</h3>
                </div>
                <button 
                  onClick={() => setDetailModalOpen(false)}
                  className="text-slate-400 hover:text-white text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4 border-b border-slate-700/40 pb-4 text-xs">
                  <div>
                    <span className="text-slate-500 block uppercase font-bold text-[9px] tracking-wider mb-1">Customer</span>
                    <span className="font-bold text-white text-sm">{selectedSale.customer}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block uppercase font-bold text-[9px] tracking-wider mb-1">Invoice Date</span>
                    <span className="font-medium text-slate-200">{new Date(selectedSale.date).toLocaleString()}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-b border-slate-700/40 pb-4 text-xs">
                  <div>
                    <span className="text-slate-500 block uppercase font-bold text-[9px] tracking-wider mb-1">Payment Method</span>
                    <span className="font-bold text-slate-200">{selectedSale.paymentMethod}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block uppercase font-bold text-[9px] tracking-wider mb-1">Record Created At</span>
                    <span className="font-medium text-slate-300">{new Date(selectedSale.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <span className="text-slate-500 block uppercase font-bold text-[9px] tracking-wider">Invoiced Items</span>
                  <div className="border border-slate-700/60 rounded-xl overflow-hidden max-h-[200px] overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-900/40 border-b border-slate-700/40 text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                          <th className="py-2 px-3">Product Name</th>
                          <th className="py-2 px-3 text-center">Qty</th>
                          <th className="py-2 px-3 text-right">Retail Price</th>
                          <th className="py-2 px-3 text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/30 font-mono">
                        {selectedSale.items?.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-700/10">
                            <td className="py-2 px-3 text-slate-200 font-sans max-w-[160px] truncate">{item.productName || 'Unknown'}</td>
                            <td className="py-2 px-3 text-center text-slate-400">{item.quantity}</td>
                            <td className="py-2 px-3 text-right text-slate-400">{currencyFormatter(item.sellingPrice)}</td>
                            <td className="py-2 px-3 text-right text-slate-200 font-bold">{currencyFormatter(item.sellingPrice * item.quantity)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {selectedSale.notes && (
                  <div className="p-3 bg-slate-900/40 border border-slate-700/40 rounded-xl text-xs text-slate-400 italic leading-relaxed">
                    <span className="text-slate-500 uppercase not-italic font-bold text-[8px] tracking-wider block mb-1">Memo / comments</span>
                    {selectedSale.notes}
                  </div>
                )}

                <div className="bg-slate-900/60 border border-slate-700/50 p-4 rounded-xl space-y-2.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 uppercase font-semibold text-[9px]">Discount Coupon Applied</span>
                    <span className="font-mono text-red-400">-{currencyFormatter(selectedSale.discount)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 uppercase font-semibold text-[9px]">Est. Cost of Goods Sold (COGS)</span>
                    <span className="font-mono text-slate-400">{currencyFormatter(selectedSale.cogs)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 uppercase font-semibold text-[9px]">Recorded Gross Profit Margin</span>
                    <span className="font-mono text-emerald-400">+{currencyFormatter(selectedSale.grossProfit)}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-slate-700/50 pt-2.5">
                    <span className="text-white uppercase font-bold text-[10px] tracking-wider">Grand Total Invoiced Amount</span>
                    <span className="text-lg font-extrabold text-emerald-400 font-mono">{currencyFormatter(selectedSale.totalAmount)}</span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-slate-700 flex justify-end bg-slate-900/10">
                <button
                  onClick={() => setDetailModalOpen(false)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-950 text-white rounded-xl text-xs font-bold cursor-pointer border border-slate-700 transition"
                >
                  Close Receipt
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
