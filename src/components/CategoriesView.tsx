import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { Category } from '../types';
import { Plus, Search, Edit2, Trash2, AlertTriangle, Tags } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function CategoriesView() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filters
  const [search, setSearch] = useState('');

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');

  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<{ success: boolean; data: Category[] }>('/categories');
      if (response.success && response.data) {
        setCategories(response.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sync categories catalog');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    (c.description && c.description.toLowerCase().includes(search.toLowerCase()))
  );

  const openAddModal = () => {
    setEditingCategory(null);
    setFormName('');
    setFormDescription('');
    setModalError(null);
    setModalOpen(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setFormName(cat.name);
    setFormDescription(cat.description || '');
    setModalError(null);
    setModalOpen(true);
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError(null);

    const payload = {
      name: formName.trim(),
      description: formDescription.trim()
    };

    try {
      if (editingCategory) {
        const response = await api.put<{ success: boolean; data: Category }>(`/categories/${editingCategory.id}`, payload);
        if (response.success && response.data) {
          setCategories(categories.map(c => c.id === editingCategory.id ? response.data : c));
        }
      } else {
        const response = await api.post<{ success: boolean; data: Category }>('/categories', payload);
        if (response.success && response.data) {
          setCategories([...categories, response.data]);
        }
      }
      setModalOpen(false);
    } catch (err: any) {
      setModalError(err.message || 'Error saving category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete category "${name}"? This action is permanent.`)) {
      return;
    }

    try {
      const response = await api.delete<{ success: boolean }>(`/categories/${id}`);
      if (response.success) {
        setCategories(categories.filter(c => c.id !== id));
      }
    } catch (err: any) {
      alert(err.message || 'Error deleting category');
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Product Categories</h2>
          <p className="text-xs text-slate-400 mt-1">Organize products into logical groups for catalogs and search filters</p>
        </div>
        <button
          onClick={openAddModal}
          className="bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-slate-950 font-bold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2 text-sm cursor-pointer shadow-lg shadow-emerald-500/10"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Category</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/25 text-red-400 rounded-xl text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Search Bar Card */}
      <div className="bg-slate-800 border border-slate-700/50 rounded-2xl p-5">
        <div className="relative max-w-sm">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search categories..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 pl-9 pr-4 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
          />
        </div>
      </div>

      {/* Categories Grid */}
      {loading ? (
        <div className="py-24 text-center">
          <span className="inline-block w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></span>
          <p className="text-slate-400 text-xs mt-3">Syncing categories database...</p>
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="py-24 text-center text-slate-500 flex flex-col items-center justify-center gap-2 bg-slate-800 border border-slate-700/50 rounded-2xl shadow-xl">
          <Tags className="w-8 h-8 opacity-40 mb-1" />
          <p className="text-sm font-semibold">No categories found</p>
          <p className="text-xs">Create a category to get started organizing your product lineup.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCategories.map((c) => (
            <div 
              key={c.id} 
              className="bg-slate-800 border border-slate-700/50 rounded-2xl p-5 hover:border-slate-700 transition flex flex-col justify-between group"
            >
              <div>
                <div className="flex justify-between items-start">
                  <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
                    <Tags className="w-4 h-4" />
                  </div>
                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition duration-150">
                    <button
                      onClick={() => openEditModal(c)}
                      className="p-1.5 bg-slate-900 border border-slate-700/60 text-slate-400 hover:text-white rounded-lg transition hover:bg-slate-700 cursor-pointer"
                      title="Edit Category"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(c.id, c.name)}
                      className="p-1.5 bg-slate-900 border border-slate-700/60 text-red-400 hover:text-red-300 rounded-lg transition hover:bg-red-500/10 cursor-pointer"
                      title="Delete Category"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="text-sm font-bold text-white tracking-tight mt-4">{c.name}</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed font-normal min-h-[40px]">
                  {c.description || <span className="text-slate-500 italic">No description provided</span>}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-700/40 text-[10px] text-slate-500 font-semibold font-mono tracking-wider uppercase">
                ID: {c.id}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/20">
                <h3 className="text-base font-bold text-white">
                  {editingCategory ? `Edit ${editingCategory.name}` : 'Create Category'}
                </h3>
                <button 
                  onClick={() => setModalOpen(false)}
                  className="text-slate-400 hover:text-white text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {modalError && (
                <div className="m-5 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <form onSubmit={handleModalSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Category Name</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Office Stationery"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Description (Optional)</label>
                  <textarea
                    rows={3}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Provide a brief summary of catalog items..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition resize-none"
                  />
                </div>

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
                    {submitting ? 'Saving...' : 'Save Category'}
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
