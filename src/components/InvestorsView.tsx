import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { Investor } from '../types';
import { Plus, Search, Edit2, Trash2, AlertTriangle, Users, Landmark, Percent } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function InvestorsView() {
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search filter
  const [search, setSearch] = useState('');

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingInvestor, setEditingInvestor] = useState<Investor | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formInvestment, setFormInvestment] = useState('');
  const [formPercentage, setFormPercentage] = useState('');

  const fetchInvestors = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<{ success: boolean; data: Investor[] }>('/investors');
      if (response.success && response.data) {
        setInvestors(response.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sync investors list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvestors();
  }, []);

  const filteredInvestors = investors.filter(i => 
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  const openAddModal = () => {
    setEditingInvestor(null);
    setFormName('');
    setFormInvestment('');
    setFormPercentage('');
    setModalError(null);
    setModalOpen(true);
  };

  const openEditModal = (inv: Investor) => {
    setEditingInvestor(inv);
    setFormName(inv.name);
    setFormInvestment(inv.investmentAmount.toString());
    setFormPercentage(inv.profitSharePercentage.toString());
    setModalError(null);
    setModalOpen(true);
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError(null);

    const payload = {
      name: formName.trim(),
      investmentAmount: Number(formInvestment),
      profitSharePercentage: Number(formPercentage)
    };

    try {
      if (editingInvestor) {
        const response = await api.put<{ success: boolean; data: Investor }>(`/investors/${editingInvestor.id}`, payload);
        if (response.success && response.data) {
          setInvestors(investors.map(inv => inv.id === editingInvestor.id ? response.data : inv));
        }
      } else {
        const response = await api.post<{ success: boolean; data: Investor }>('/investors', payload);
        if (response.success && response.data) {
          setInvestors([...investors, response.data]);
        }
      }
      setModalOpen(false);
    } catch (err: any) {
      setModalError(err.message || 'Error saving investor record');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteInvestor = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete investor "${name}"?`)) {
      return;
    }

    try {
      const response = await api.delete<{ success: boolean }>(`/investors/${id}`);
      if (response.success) {
        setInvestors(investors.filter(inv => inv.id !== id));
      }
    } catch (err: any) {
      alert(err.message || 'Error deleting investor');
    }
  };

  const currencyFormatter = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  const totalCapitalInvestment = investors.reduce((acc, i) => acc + i.investmentAmount, 0);
  const totalAllocatedShares = investors.reduce((acc, i) => acc + i.profitSharePercentage, 0);

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Investors & Shareholders</h2>
          <p className="text-xs text-slate-400 mt-1">Manage investment capitals and assign monthly net profit sharing percentage allocations</p>
        </div>
        <button
          onClick={openAddModal}
          className="bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-slate-950 font-bold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2 text-sm cursor-pointer shadow-lg shadow-emerald-500/10"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Investor</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/25 text-red-400 rounded-xl text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Overview Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-slate-800 border border-slate-700/40 p-5 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Total Funding Capital</span>
            <p className="text-2xl font-black text-white font-mono">{currencyFormatter(totalCapitalInvestment)}</p>
          </div>
          <div className="p-3 bg-blue-500/10 text-blue-400 border border-blue-500/15 rounded-xl">
            <Landmark className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700/40 p-5 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Allocated Profit Shares</span>
            <p className={`text-2xl font-black font-mono ${totalAllocatedShares > 100 ? 'text-red-400' : 'text-emerald-400'}`}>
              {totalAllocatedShares}% <span className="text-xs text-slate-500 font-normal">of 100% max</span>
            </p>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 rounded-xl">
            <Percent className="w-5 h-5" />
          </div>
        </div>
      </div>

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
            placeholder="Search investors..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 pl-9 pr-4 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
          />
        </div>
      </div>

      {/* Investors list */}
      {loading ? (
        <div className="py-24 text-center">
          <span className="inline-block w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></span>
          <p className="text-slate-400 text-xs mt-3">Syncing shareholders record...</p>
        </div>
      ) : filteredInvestors.length === 0 ? (
        <div className="py-24 text-center text-slate-500 flex flex-col items-center justify-center gap-2 bg-slate-800 border border-slate-700/50 rounded-2xl shadow-xl">
          <Users className="w-8 h-8 opacity-40 mb-1" />
          <p className="text-sm font-semibold">No investors recorded yet</p>
          <p className="text-xs">Add an investor to start distributing monthly Net Profits automatically.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredInvestors.map((i) => (
            <div 
              key={i.id} 
              className="bg-slate-800 border border-slate-700/50 rounded-2xl p-6 hover:border-slate-700 transition flex flex-col justify-between group"
            >
              <div>
                <div className="flex justify-between items-start border-b border-slate-700/40 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-900 border border-slate-700 rounded-xl flex items-center justify-center text-emerald-400 font-bold font-mono">
                      {i.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base leading-tight">{i.name}</h3>
                      <span className="text-[10px] text-slate-500 font-mono font-semibold tracking-wider block mt-1">SHAREHOLDER CARD</span>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition duration-150 shrink-0">
                    <button
                      onClick={() => openEditModal(i)}
                      className="p-1.5 bg-slate-900 border border-slate-700/60 text-slate-400 hover:text-white rounded-lg transition hover:bg-slate-700 cursor-pointer"
                      title="Edit Profile"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteInvestor(i.id, i.name)}
                      className="p-1.5 bg-slate-900 border border-slate-700/60 text-red-400 hover:text-red-300 rounded-lg transition hover:bg-red-500/10 cursor-pointer"
                      title="Delete Profile"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-5">
                  <div className="p-3 bg-slate-900/40 border border-slate-700/30 rounded-xl">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Fund Contribution</span>
                    <span className="font-mono text-sm font-bold text-slate-200">{currencyFormatter(i.investmentAmount)}</span>
                  </div>
                  <div className="p-3 bg-slate-900/40 border border-slate-700/30 rounded-xl">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Profit Share Rate</span>
                    <span className="font-mono text-sm font-bold text-emerald-400">{i.profitSharePercentage}%</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-3 border-t border-slate-700/30 text-[9px] text-slate-500 font-semibold font-mono tracking-wider uppercase">
                MEMBER ID: {i.id}
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
                  {editingInvestor ? `Edit Investor: ${editingInvestor.name}` : 'Add New Shareholder'}
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
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Investor Name</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Warren Buffett"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Investment Amount ($)</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={formInvestment}
                      onChange={(e) => setFormInvestment(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Profit Share Rate (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      required
                      value={formPercentage}
                      onChange={(e) => setFormPercentage(e.target.value)}
                      placeholder="e.g. 40"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition font-mono"
                    />
                  </div>
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
                    {submitting ? 'Saving...' : 'Save Investor'}
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
