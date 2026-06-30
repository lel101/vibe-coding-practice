import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { Expense, ExpenseCategory } from '../types';
import { Plus, Search, Edit2, Trash2, AlertTriangle, Receipt, Filter, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function ExpensesView() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form Fields
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formCategory, setFormCategory] = useState<ExpenseCategory>('Rent');
  const [formDescription, setFormDescription] = useState('');
  const [formAmount, setFormAmount] = useState('');

  const fetchExpenses = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<{ success: boolean; data: Expense[] }>('/expenses');
      if (response.success && response.data) {
        setExpenses(response.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sync expense ledger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const filteredExpenses = expenses.filter(e => {
    const matchesSearch = e.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory ? e.category === selectedCategory : true;
    return matchesSearch && matchesCategory;
  });

  const openAddModal = () => {
    setEditingExpense(null);
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormCategory('Rent');
    setFormDescription('');
    setFormAmount('');
    setModalError(null);
    setModalOpen(true);
  };

  const openEditModal = (exp: Expense) => {
    setEditingExpense(exp);
    setFormDate(exp.date);
    setFormCategory(exp.category);
    setFormDescription(exp.description);
    setFormAmount(exp.amount.toString());
    setModalError(null);
    setModalOpen(true);
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError(null);

    const payload = {
      date: formDate,
      category: formCategory,
      description: formDescription.trim(),
      amount: Number(formAmount)
    };

    try {
      if (editingExpense) {
        const response = await api.put<{ success: boolean; data: Expense }>(`/expenses/${editingExpense.id}`, payload);
        if (response.success && response.data) {
          setExpenses(expenses.map(exp => exp.id === editingExpense.id ? response.data : exp));
        }
      } else {
        const response = await api.post<{ success: boolean; data: Expense }>('/expenses', payload);
        if (response.success && response.data) {
          setExpenses([response.data, ...expenses]);
        }
      }
      setModalOpen(false);
    } catch (err: any) {
      setModalError(err.message || 'Error recording expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id: string, description: string) => {
    if (!window.confirm(`Are you sure you want to delete expense record "${description}"?`)) {
      return;
    }

    try {
      const response = await api.delete<{ success: boolean }>(`/expenses/${id}`);
      if (response.success) {
        setExpenses(expenses.filter(e => e.id !== id));
      }
    } catch (err: any) {
      alert(err.message || 'Error deleting expense');
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setSelectedCategory('');
  };

  const currencyFormatter = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  const totalExpenseFiltered = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Operation Expenses</h2>
          <p className="text-xs text-slate-400 mt-1">Audit rentals, utility power bills, payroll wages, transportation and logistics costs</p>
        </div>
        <button
          onClick={openAddModal}
          className="bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-slate-950 font-bold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2 text-sm cursor-pointer shadow-lg shadow-emerald-500/10"
        >
          <Plus className="w-4 h-4" />
          <span>Record New Expense</span>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search SKU or Name */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search descriptions..."
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
              <option value="Rent">Rent</option>
              <option value="Electricity">Electricity</option>
              <option value="Salary">Salary</option>
              <option value="Transportation">Transportation</option>
              <option value="Miscellaneous">Miscellaneous</option>
            </select>
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 text-xs">▼</span>
          </div>

          <div className="flex gap-2">
            {/* Show Total on filter */}
            <div className="flex-1 bg-slate-900 border border-slate-700 rounded-xl py-2 px-4 text-white text-xs font-mono font-semibold flex items-center justify-between">
              <span className="text-slate-500 uppercase text-[9px] tracking-wide font-sans">Total:</span>
              <span className="text-red-400">{currencyFormatter(totalExpenseFiltered)}</span>
            </div>
            
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

      {/* Expenses Table Card */}
      <div className="bg-slate-800 border border-slate-700/50 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-24 text-center">
              <span className="inline-block w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></span>
              <p className="text-slate-400 text-xs mt-3">Syncing operation expenses...</p>
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="py-24 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
              <Receipt className="w-8 h-8 opacity-40 mb-1" />
              <p className="text-sm font-semibold">No expense records found</p>
              <p className="text-xs">Record monthly bills or purchases to calculate net distributions properly.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-700/50 text-[10px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-900/30">
                  <th className="py-3.5 px-5">Date</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Description</th>
                  <th className="py-3.5 px-4 text-right">Debit Amount</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30 text-xs">
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-700/10 transition-colors group">
                    <td className="py-3.5 px-5 font-mono text-slate-300 font-semibold">{new Date(exp.date).toLocaleDateString()}</td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex px-2 py-0.5 rounded-lg bg-slate-900/40 text-slate-400 border border-slate-700/30 font-semibold text-[10px]">
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-200 font-medium max-w-[280px] truncate">{exp.description}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-red-400 text-sm">
                      {currencyFormatter(exp.amount)}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-all">
                        <button
                          onClick={() => openEditModal(exp)}
                          className="p-1.5 bg-slate-900 border border-slate-700/60 text-slate-400 hover:text-white rounded-lg transition hover:bg-slate-700 cursor-pointer"
                          title="Edit Record"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteExpense(exp.id, exp.description)}
                          className="p-1.5 bg-slate-900 border border-slate-700/60 text-red-400 hover:text-red-300 rounded-lg transition hover:bg-red-500/10 cursor-pointer"
                          title="Delete Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

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
                  {editingExpense ? `Edit Expense Record` : 'Record Expense'}
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Expense Date</label>
                    <input
                      type="date"
                      required
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Category</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as ExpenseCategory)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition cursor-pointer"
                    >
                      <option value="Rent">Rent</option>
                      <option value="Electricity">Electricity</option>
                      <option value="Salary">Salary</option>
                      <option value="Transportation">Transportation</option>
                      <option value="Miscellaneous">Miscellaneous</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Expense Debit Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Description / Invoice memo</label>
                  <textarea
                    rows={3}
                    required
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="e.g. Warehouse monthly rental or office electricity bill..."
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
                    {submitting ? 'Recording...' : 'Record Expense'}
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
