import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { Product, Category } from '../types';
import { 
  Plus, Search, Edit2, Archive, AlertTriangle, CheckCircle2, 
  XCircle, Filter, RotateCcw, ChevronLeft, ChevronRight, Tags
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function ProductsView() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form Fields
  const [formSKU, setFormSKU] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formCostPrice, setFormCostPrice] = useState('');
  const [formSellingPrice, setFormSellingPrice] = useState('');
  const [formCurrentStock, setFormCurrentStock] = useState('');
  const [formMinimumStock, setFormMinimumStock] = useState('');
  const [formUnit, setFormUnit] = useState('pcs');
  const [formStatus, setFormStatus] = useState<'Active' | 'Inactive'>('Active');

  const fetchInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [pRes, cRes] = await Promise.all([
        api.get<{ success: boolean; data: Product[] }>('/products'),
        api.get<{ success: boolean; data: Category[] }>('/categories')
      ]);
      
      if (pRes.success && pRes.data) setProducts(pRes.data);
      if (cRes.success && cRes.data) setCategories(cRes.data);
    } catch (err: any) {
      setError(err.message || 'Failed to sync inventory catalogs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Filter products on frontend
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                          p.SKU.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory ? p.categoryId === selectedCategory : true;
    const matchesStatus = selectedStatus ? p.status === selectedStatus : true;
    
    let matchesStock = true;
    if (stockFilter === 'low') {
      matchesStock = p.currentStock <= p.minimumStock;
    } else if (stockFilter === 'out') {
      matchesStock = p.currentStock === 0;
    }

    return matchesSearch && matchesCategory && matchesStatus && matchesStock;
  });

  // Paginated lists
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedCategory, selectedStatus, stockFilter]);

  const openAddModal = () => {
    setEditingProduct(null);
    setFormSKU('');
    setFormName('');
    setFormCategory(categories[0]?.id || '');
    setFormCostPrice('');
    setFormSellingPrice('');
    setFormCurrentStock('0');
    setFormMinimumStock('5');
    setFormUnit('pcs');
    setFormStatus('Active');
    setModalError(null);
    setModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormSKU(product.SKU);
    setFormName(product.name);
    setFormCategory(product.categoryId);
    setFormCostPrice(product.costPrice.toString());
    setFormSellingPrice(product.sellingPrice.toString());
    setFormCurrentStock(product.currentStock.toString());
    setFormMinimumStock(product.minimumStock.toString());
    setFormUnit(product.unit);
    setFormStatus(product.status);
    setModalError(null);
    setModalOpen(true);
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError(null);

    const payload = {
      SKU: formSKU.trim(),
      name: formName.trim(),
      categoryId: formCategory,
      costPrice: Number(formCostPrice),
      sellingPrice: Number(formSellingPrice),
      currentStock: Number(formCurrentStock),
      minimumStock: Number(formMinimumStock),
      unit: formUnit.trim(),
      status: formStatus
    };

    try {
      if (editingProduct) {
        // Edit Product
        const response = await api.put<{ success: boolean; data: Product }>(`/products/${editingProduct.id}`, payload);
        if (response.success && response.data) {
          setProducts(products.map(p => p.id === editingProduct.id ? response.data : p));
        }
      } else {
        // Create Product
        const response = await api.post<{ success: boolean; data: Product }>('/products', payload);
        if (response.success && response.data) {
          setProducts([response.data, ...products]);
        }
      }
      setModalOpen(false);
    } catch (err: any) {
      setModalError(err.message || 'Error saving product records');
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchiveProduct = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to archive product "${name}"? This will set status to Inactive and hide it from catalogs.`)) {
      return;
    }

    try {
      const response = await api.delete<{ success: boolean }>(`/products/${id}`);
      if (response.success) {
        setProducts(products.filter(p => p.id !== id));
      }
    } catch (err: any) {
      alert(err.message || 'Error archiving product');
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setSelectedCategory('');
    setSelectedStatus('');
    setStockFilter('all');
  };

  const currencyFormatter = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Active Product Catalog</h2>
          <p className="text-xs text-slate-400 mt-1">Add, edit, adjust, or archive products inside the inventory system</p>
        </div>
        <button
          onClick={openAddModal}
          className="bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-slate-950 font-bold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2 text-sm cursor-pointer shadow-lg shadow-emerald-500/10"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Product</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/25 text-red-400 rounded-xl text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Search Bar Card */}
      <div className="bg-slate-800 border border-slate-700/50 rounded-2xl p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search SKU or Name */}
          <div className="relative md:col-span-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search SKU, name..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 pl-9 pr-4 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
            />
          </div>

          {/* Category Filter */}
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition appearance-none cursor-pointer"
            >
              <option value="">All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 text-xs">▼</span>
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition appearance-none cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 text-xs">▼</span>
          </div>

          {/* Stock Level Filter Button Group */}
          <div className="flex gap-2">
            <button
              onClick={() => setStockFilter('all')}
              className={`flex-1 py-2 text-[11px] font-semibold rounded-xl border transition cursor-pointer ${
                stockFilter === 'all'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              All Levels
            </button>
            <button
              onClick={() => setStockFilter('low')}
              className={`flex-1 py-2 text-[11px] font-semibold rounded-xl border transition cursor-pointer ${
                stockFilter === 'low'
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/25'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              Low Stock
            </button>
            <button
              onClick={handleResetFilters}
              className="px-3 bg-slate-900 border border-slate-700 rounded-xl hover:text-white text-slate-400 transition cursor-pointer flex items-center justify-center"
              title="Reset Filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Products Table Card */}
      <div className="bg-slate-800 border border-slate-700/50 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-24 text-center">
              <span className="inline-block w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></span>
              <p className="text-slate-400 text-xs mt-3">Syncing active inventory database...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-24 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
              <Tags className="w-8 h-8 opacity-40 mb-1" />
              <p className="text-sm font-semibold">No products found</p>
              <p className="text-xs max-w-[280px]">Try adjusting filters or searching a different term to locate the records</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-700/50 text-[10px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-900/30">
                  <th className="py-3.5 px-5">SKU / Name</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4 text-right">Cost Price</th>
                  <th className="py-3.5 px-4 text-right">Selling Price</th>
                  <th className="py-3.5 px-4 text-center">Stock Balance</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30 text-xs">
                {paginatedProducts.map((p) => {
                  const isLowStock = p.currentStock <= p.minimumStock;
                  return (
                    <tr key={p.id} className="hover:bg-slate-700/10 transition-colors group">
                      <td className="py-3.5 px-5 font-medium text-white max-w-[220px]">
                        <div>
                          <p className="font-bold text-sm text-slate-100 group-hover:text-white transition-colors">{p.name}</p>
                          <span className="text-[10px] text-slate-400 font-mono tracking-wider font-semibold uppercase">{p.SKU}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        <span className="inline-flex px-2 py-1 rounded-lg bg-slate-900/40 text-slate-400 border border-slate-700/30">
                          {(p as any).categoryName || 'Unknown'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-400 font-mono">{currencyFormatter(p.costPrice)}</td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-200">{currencyFormatter(p.sellingPrice)}</td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className={`font-mono font-bold text-sm ${isLowStock ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {p.currentStock}
                          </span>
                          <span className="text-[9px] text-slate-500 font-medium uppercase mt-0.5">{p.unit} ({p.minimumStock} min)</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-semibold tracking-wider border ${
                          p.status === 'Active' 
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/10' 
                            : 'bg-red-500/15 text-red-400 border-red-500/10'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-all">
                          <button
                            onClick={() => openEditModal(p)}
                            className="p-1.5 bg-slate-900 border border-slate-700/60 text-slate-400 hover:text-white rounded-lg transition hover:bg-slate-700 cursor-pointer"
                            title="Edit Product"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleArchiveProduct(p.id, p.name)}
                            className="p-1.5 bg-slate-900 border border-slate-700/60 text-red-400 hover:text-red-300 rounded-lg transition hover:bg-red-500/10 cursor-pointer"
                            title="Archive Product"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Panel */}
        {!loading && totalPages > 1 && (
          <div className="px-5 py-3 bg-slate-900/30 border-t border-slate-700/50 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-medium font-mono">
              Showing {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredProducts.length)} of {filteredProducts.length} Products
            </span>
            <div className="flex gap-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
                className="p-1.5 bg-slate-800 border border-slate-700/60 text-slate-400 hover:text-white rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
                className="p-1.5 bg-slate-800 border border-slate-700/60 text-slate-400 hover:text-white rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/20">
                <h3 className="text-base font-bold text-white">
                  {editingProduct ? `Edit ${editingProduct.name}` : 'Add New Product'}
                </h3>
                <button 
                  onClick={() => setModalOpen(false)}
                  className="text-slate-400 hover:text-white text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {modalError && (
                <div className="m-5 p-3.5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Form Content */}
              <form onSubmit={handleModalSubmit} className="p-6 space-y-4 flex-1 overflow-y-auto max-h-[70vh]">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">SKU Code</label>
                    <input
                      type="text"
                      required
                      value={formSKU}
                      onChange={(e) => setFormSKU(e.target.value)}
                      placeholder="e.g. SKU-ELEC-001"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Product Name</label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. Wireless Mouse"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Category</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Measurement Unit</label>
                    <input
                      type="text"
                      required
                      value={formUnit}
                      onChange={(e) => setFormUnit(e.target.value)}
                      placeholder="e.g. pcs, bags, box, kg"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Cost Price ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      min="0.01"
                      value={formCostPrice}
                      onChange={(e) => setFormCostPrice(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Selling Price ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      min="0.01"
                      value={formSellingPrice}
                      onChange={(e) => setFormSellingPrice(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Current Stock</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={formCurrentStock}
                      onChange={(e) => setFormCurrentStock(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Minimum Stock</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={formMinimumStock}
                      onChange={(e) => setFormMinimumStock(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Status</label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                {/* Footer buttons */}
                <div className="pt-4 border-t border-slate-700 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-950 text-slate-400 hover:text-white rounded-xl text-xs font-semibold cursor-pointer border border-slate-700 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-slate-950 rounded-xl text-xs font-extrabold cursor-pointer transition disabled:opacity-50"
                  >
                    {submitting ? 'Saving...' : 'Save Record'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
