import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { Purchase, Supplier, Product } from '../types';
import { 
  Plus, Calendar, Trash2, ShieldCheck, AlertTriangle, 
  History, PlusCircle, CheckCircle2, Eye, Receipt 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CartItem {
  productId: string;
  name: string;
  SKU: string;
  quantity: number;
  costPrice: number;
  unit: string;
}

export default function StockInView() {
  const [activeTab, setActiveTab] = useState<'history' | 'new'>('history');
  
  // Data sets
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New Stock In Form States
  const [supplierId, setSupplierId] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);

  // Item Selector helper States
  const [selectedProductId, setSelectedProductId] = useState('');
  const [inputQuantity, setInputQuantity] = useState('10');
  const [inputCostPrice, setInputCostPrice] = useState('0.00');

  // View Detail Modal State
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [purRes, supRes, prodRes] = await Promise.all([
        api.get<{ success: boolean; data: Purchase[] }>('/purchases'),
        api.get<{ success: boolean; data: Supplier[] }>('/suppliers'),
        api.get<{ success: boolean; data: Product[] }>('/products')
      ]);

      if (purRes.success && purRes.data) setPurchases(purRes.data);
      if (supRes.success && supRes.data) {
        setSuppliers(supRes.data);
        if (supRes.data.length > 0) setSupplierId(supRes.data[0].id);
      }
      if (prodRes.success && prodRes.data) {
        // filter out archived
        const activeProds = prodRes.data.filter(p => !p.archived);
        setProducts(activeProds);
        if (activeProds.length > 0) {
          setSelectedProductId(activeProds[0].id);
          setInputCostPrice(activeProds[0].costPrice.toString());
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error loading transaction logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update cost price input field automatically when selecting product in the selector
  useEffect(() => {
    const p = products.find(prod => prod.id === selectedProductId);
    if (p) {
      setInputCostPrice(p.costPrice.toString());
    }
  }, [selectedProductId, products]);

  const handleAddToBasket = () => {
    if (!selectedProductId) return;
    
    const prod = products.find(p => p.id === selectedProductId);
    if (!prod) return;

    const qty = Number(inputQuantity);
    const cost = Number(inputCostPrice);

    if (isNaN(qty) || qty <= 0) {
      alert('Quantity must be a positive integer');
      return;
    }
    if (isNaN(cost) || cost <= 0) {
      alert('Cost price must be a valid positive amount');
      return;
    }

    // Check if already in cart
    const exists = cart.find(item => item.productId === selectedProductId);
    if (exists) {
      setCart(cart.map(item => item.productId === selectedProductId 
        ? { ...item, quantity: item.quantity + qty, costPrice: cost } 
        : item
      ));
    } else {
      setCart([...cart, {
        productId: selectedProductId,
        name: prod.name,
        SKU: prod.SKU,
        quantity: qty,
        costPrice: cost,
        unit: prod.unit
      }]);
    }
  };

  const handleRemoveFromBasket = (productId: string) => {
    setCart(cart.filter(item => item.productId !== productId));
  };

  const handleCheckoutStockIn = async () => {
    if (cart.length === 0) {
      alert('Basket is empty. Add products to stock in.');
      return;
    }
    if (!supplierId) {
      alert('Please define/select a valid Supplier');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        purchaseDate: new Date(purchaseDate).toISOString(),
        supplierId,
        notes: notes.trim(),
        items: cart.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          costPrice: item.costPrice
        }))
      };

      const response = await api.post<{ success: boolean; data: Purchase }>('/purchases', payload);
      if (response.success && response.data) {
        // clear states
        setCart([]);
        setNotes('');
        setActiveTab('history');
        // Refresh
        await fetchData();
      }
    } catch (err: any) {
      alert(err.message || 'Error processing purchase transaction');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewDetails = (pur: Purchase) => {
    setSelectedPurchase(pur);
    setDetailModalOpen(true);
  };

  const totalBasketAmount = cart.reduce((acc, item) => acc + (item.costPrice * item.quantity), 0);

  const currencyFormatter = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Stock In (Purchasing Ledger)</h2>
          <p className="text-xs text-slate-400 mt-1">Purchase inventory, increase stock counts, and record wholesale cash flows</p>
        </div>

        {/* Tab switch */}
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
            <span>Purchase History</span>
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
            <span>New Stock In</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/25 text-red-400 rounded-xl text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Tab Views */}
      {activeTab === 'history' ? (
        /* TAB 1: HISTORY */
        <div className="bg-slate-800 border border-slate-700/50 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-24 text-center">
                <span className="inline-block w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></span>
                <p className="text-slate-400 text-xs mt-3">Syncing purchasing transaction logs...</p>
              </div>
            ) : purchases.length === 0 ? (
              <div className="py-24 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
                <Receipt className="w-8 h-8 opacity-40 mb-1" />
                <p className="text-sm font-semibold">No purchases recorded yet</p>
                <p className="text-xs">Click "New Stock In" to initiate an inventory purchase contract.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-700/50 text-[10px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-900/30">
                    <th className="py-3.5 px-5">Purchase ID</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Supplier</th>
                    <th className="py-3.5 px-4">Items count</th>
                    <th className="py-3.5 px-4 text-right">Wholesale Amount</th>
                    <th className="py-3.5 px-5 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/30 text-xs">
                  {purchases.map((pur) => (
                    <tr key={pur.id} className="hover:bg-slate-700/10 transition-colors">
                      <td className="py-3.5 px-5 font-mono text-slate-300 font-semibold">{pur.id}</td>
                      <td className="py-3.5 px-4 text-slate-300">{new Date(pur.purchaseDate).toLocaleDateString()}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-100">{pur.supplierName}</td>
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-400">
                        {pur.items?.reduce((acc, i) => acc + i.quantity, 0) || 0} units ({pur.items?.length || 0} lines)
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400 text-sm">
                        {currencyFormatter(pur.totalAmount)}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <button
                          onClick={() => handleViewDetails(pur)}
                          className="p-1.5 bg-slate-900 border border-slate-700/60 text-emerald-400 hover:text-white rounded-lg transition hover:bg-slate-700 cursor-pointer inline-flex items-center gap-1 text-[11px] font-bold"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Invoice</span>
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
        /* TAB 2: NEW PURCHASE CONTRACT (STOCK IN) */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left panel: Cart Picker Configurator */}
          <div className="lg:col-span-1 bg-slate-800 border border-slate-700/50 rounded-2xl p-6 space-y-6">
            <h3 className="font-bold text-white text-sm uppercase tracking-wide border-b border-slate-700/40 pb-3">1. Contract Header</h3>
            
            <div className="space-y-4">
              {/* Supplier Selection */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Supplier / Vendor</label>
                {suppliers.length === 0 ? (
                  <p className="text-xs text-amber-400 font-semibold italic">No active suppliers found. Please register one first in the Suppliers tab.</p>
                ) : (
                  <div className="relative">
                    <select
                      value={supplierId}
                      onChange={(e) => setSupplierId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition appearance-none cursor-pointer"
                    >
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 text-xs">▼</span>
                  </div>
                )}
              </div>

              {/* Purchase Date */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Date of Purchase</label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4 pointer-events-none" />
                  <input
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 pl-10 pr-4 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition font-mono"
                  />
                </div>
              </div>
            </div>

            <h3 className="font-bold text-white text-sm uppercase tracking-wide border-b border-slate-700/40 pt-2 pb-3">2. Add Line Item</h3>
            
            <div className="space-y-4">
              {/* Product Select */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Select Product</label>
                {products.length === 0 ? (
                  <p className="text-xs text-amber-400 font-semibold italic">No active products found. Please add products first in Catalog.</p>
                ) : (
                  <div className="relative">
                    <select
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition appearance-none cursor-pointer"
                    >
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.SKU})</option>
                      ))}
                    </select>
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 text-xs">▼</span>
                  </div>
                )}
              </div>

              {/* Cost Price & Quantity */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Unit Cost Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={inputCostPrice}
                    onChange={(e) => setInputCostPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Quantity</label>
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
                onClick={handleAddToBasket}
                disabled={products.length === 0}
                className="w-full py-2 px-4 bg-slate-900 hover:bg-slate-950 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/40 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-30"
              >
                <Plus className="w-4 h-4" />
                <span>Add Item Line</span>
              </button>
            </div>
          </div>

          {/* Right panel: Active Shopping Basket List */}
          <div className="lg:col-span-2 bg-slate-800 border border-slate-700/50 rounded-2xl p-6 flex flex-col justify-between shadow-xl">
            <div className="space-y-5 flex-1">
              <h3 className="font-bold text-white text-sm uppercase tracking-wide border-b border-slate-700/40 pb-3 flex justify-between items-center">
                <span>3. Basket Contents</span>
                <span className="font-mono text-emerald-400 font-bold text-sm bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-500/10">
                  {cart.length} active item lines
                </span>
              </h3>

              {cart.length === 0 ? (
                <div className="py-24 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
                  <Receipt className="w-8 h-8 opacity-30" />
                  <p className="text-xs font-medium">Wholesale basket is empty</p>
                  <p className="text-[11px] max-w-[220px]">Choose supplier header and draft product lines on the left panel.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-700/40 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="pb-2.5">Product Details</th>
                        <th className="pb-2.5 text-center">Qty</th>
                        <th className="pb-2.5 text-right">Unit Wholesale Cost</th>
                        <th className="pb-2.5 text-right">Subtotal</th>
                        <th className="pb-2.5 text-right">Clear</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/20 text-xs">
                      {cart.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/10">
                          <td className="py-3 font-medium text-white max-w-[180px] truncate">
                            <p className="font-bold truncate">{item.name}</p>
                            <span className="text-[10px] text-slate-400 font-mono tracking-wider">{item.SKU}</span>
                          </td>
                          <td className="py-3 text-center font-mono font-bold text-slate-300">{item.quantity} {item.unit}</td>
                          <td className="py-3 text-right font-mono text-slate-400">{currencyFormatter(item.costPrice)}</td>
                          <td className="py-3 text-right font-mono font-bold text-slate-200">{currencyFormatter(item.costPrice * item.quantity)}</td>
                          <td className="py-3 text-right">
                            <button
                              onClick={() => handleRemoveFromBasket(item.productId)}
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

            {/* Total checkout section */}
            {cart.length > 0 && (
              <div className="pt-6 border-t border-slate-700/50 mt-6 space-y-4">
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Wholesale Transaction Memo / Notes</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Enter delivery batch numbers, logistics note..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                  />
                </div>

                <div className="flex justify-between items-center bg-slate-900/40 border border-slate-700/40 p-4 rounded-xl">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estimated Total Wholsale Contract Value</p>
                    <span className="text-2xl font-extrabold text-emerald-400 font-mono mt-1 block">
                      {currencyFormatter(totalBasketAmount)}
                    </span>
                  </div>
                  <button
                    onClick={handleCheckoutStockIn}
                    disabled={submitting}
                    className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-slate-950 font-extrabold text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-lg shadow-emerald-500/10 disabled:opacity-50 transition"
                  >
                    {submitting ? 'Acquiring...' : 'Submit Stock In'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* View Details Invoice Modal */}
      <AnimatePresence>
        {detailModalOpen && selectedPurchase && (
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
                  <h3 className="text-sm font-mono font-bold text-white">Invoice Details: {selectedPurchase.id}</h3>
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
                    <span className="text-slate-500 block uppercase font-bold text-[9px] tracking-wider mb-1">Supplier</span>
                    <span className="font-bold text-white text-sm">{selectedPurchase.supplierName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block uppercase font-bold text-[9px] tracking-wider mb-1">Wholesale Date</span>
                    <span className="font-medium text-slate-200">{new Date(selectedPurchase.purchaseDate).toLocaleString()}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <span className="text-slate-500 block uppercase font-bold text-[9px] tracking-wider">Item lines</span>
                  <div className="border border-slate-700/60 rounded-xl overflow-hidden max-h-[200px] overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-900/40 border-b border-slate-700/40 text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                          <th className="py-2 px-3">Product Name</th>
                          <th className="py-2 px-3 text-center">Qty</th>
                          <th className="py-2 px-3 text-right">Cost Price</th>
                          <th className="py-2 px-3 text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/30 font-mono">
                        {selectedPurchase.items?.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-700/10">
                            <td className="py-2 px-3 text-slate-200 font-sans max-w-[160px] truncate">{item.productName || 'Unknown'}</td>
                            <td className="py-2 px-3 text-center text-slate-400">{item.quantity}</td>
                            <td className="py-2 px-3 text-right text-slate-400">{currencyFormatter(item.costPrice)}</td>
                            <td className="py-2 px-3 text-right text-slate-200 font-bold">{currencyFormatter(item.costPrice * item.quantity)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {selectedPurchase.notes && (
                  <div className="p-3 bg-slate-900/40 border border-slate-700/40 rounded-xl text-xs text-slate-400 italic leading-relaxed">
                    <span className="text-slate-500 uppercase not-italic font-bold text-[8px] tracking-wider block mb-1">Memo / notes</span>
                    {selectedPurchase.notes}
                  </div>
                )}

                <div className="flex justify-between items-center bg-slate-900/60 border border-slate-700/50 p-4 rounded-xl">
                  <span className="text-slate-400 uppercase font-bold text-[10px] tracking-wider">Grand Total Wholesale Amount</span>
                  <span className="text-lg font-extrabold text-emerald-400 font-mono">{currencyFormatter(selectedPurchase.totalAmount)}</span>
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
