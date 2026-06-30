import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { Supplier } from '../types';
import { Plus, Search, Edit2, Trash2, AlertTriangle, User, Mail, Phone, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function SuppliersView() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search filter
  const [search, setSearch] = useState('');

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formContactPerson, setFormContactPerson] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');

  const fetchSuppliers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<{ success: boolean; data: Supplier[] }>('/suppliers');
      if (response.success && response.data) {
        setSuppliers(response.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sync suppliers database');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.contactPerson.toLowerCase().includes(search.toLowerCase()) || 
    s.email.toLowerCase().includes(search.toLowerCase()) || 
    s.phone.includes(search)
  );

  const openAddModal = () => {
    setEditingSupplier(null);
    setFormName('');
    setFormContactPerson('');
    setFormPhone('');
    setFormEmail('');
    setFormAddress('');
    setModalError(null);
    setModalOpen(true);
  };

  const openEditModal = (sup: Supplier) => {
    setEditingSupplier(sup);
    setFormName(sup.name);
    setFormContactPerson(sup.contactPerson);
    setFormPhone(sup.phone);
    setFormEmail(sup.email);
    setFormAddress(sup.address);
    setModalError(null);
    setModalOpen(true);
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError(null);

    const payload = {
      name: formName.trim(),
      contactPerson: formContactPerson.trim(),
      phone: formPhone.trim(),
      email: formEmail.trim(),
      address: formAddress.trim()
    };

    try {
      if (editingSupplier) {
        const response = await api.put<{ success: boolean; data: Supplier }>(`/suppliers/${editingSupplier.id}`, payload);
        if (response.success && response.data) {
          setSuppliers(suppliers.map(s => s.id === editingSupplier.id ? response.data : s));
        }
      } else {
        const response = await api.post<{ success: boolean; data: Supplier }>('/suppliers', payload);
        if (response.success && response.data) {
          setSuppliers([...suppliers, response.data]);
        }
      }
      setModalOpen(false);
    } catch (err: any) {
      setModalError(err.message || 'Error saving supplier record');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSupplier = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete supplier "${name}"? This record is permanent.`)) {
      return;
    }

    try {
      const response = await api.delete<{ success: boolean }>(`/suppliers/${id}`);
      if (response.success) {
        setSuppliers(suppliers.filter(s => s.id !== id));
      }
    } catch (err: any) {
      alert(err.message || 'Error deleting supplier');
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Suppliers Directory</h2>
          <p className="text-xs text-slate-400 mt-1">Manage vendor contact books and purchase directories</p>
        </div>
        <button
          onClick={openAddModal}
          className="bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-slate-950 font-bold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2 text-sm cursor-pointer shadow-lg shadow-emerald-500/10"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Supplier</span>
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
            placeholder="Search suppliers..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 pl-9 pr-4 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
          />
        </div>
      </div>

      {/* Suppliers Grid */}
      {loading ? (
        <div className="py-24 text-center">
          <span className="inline-block w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></span>
          <p className="text-slate-400 text-xs mt-3">Syncing suppliers contact log...</p>
        </div>
      ) : filteredSuppliers.length === 0 ? (
        <div className="py-24 text-center text-slate-500 flex flex-col items-center justify-center gap-2 bg-slate-800 border border-slate-700/50 rounded-2xl shadow-xl">
          <User className="w-8 h-8 opacity-40 mb-1" />
          <p className="text-sm font-semibold">No suppliers found</p>
          <p className="text-xs">Establish a supplier directory to record Stock In inventory acquisitions.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSuppliers.map((s) => (
            <div 
              key={s.id} 
              className="bg-slate-800 border border-slate-700/50 rounded-2xl p-6 hover:border-slate-700 transition flex flex-col justify-between group"
            >
              <div>
                <div className="flex justify-between items-start border-b border-slate-700/40 pb-4">
                  <div>
                    <h3 className="font-bold text-white text-base leading-tight">{s.name}</h3>
                    <span className="text-[10px] text-slate-400 font-mono tracking-wider font-semibold uppercase block mt-1.5">Supplier Profile</span>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition duration-150 shrink-0">
                    <button
                      onClick={() => openEditModal(s)}
                      className="p-1.5 bg-slate-900 border border-slate-700/60 text-slate-400 hover:text-white rounded-lg transition hover:bg-slate-700 cursor-pointer"
                      title="Edit Supplier"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteSupplier(s.id, s.name)}
                      className="p-1.5 bg-slate-900 border border-slate-700/60 text-red-400 hover:text-red-300 rounded-lg transition hover:bg-red-500/10 cursor-pointer"
                      title="Delete Supplier"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3.5 mt-5">
                  <div className="flex items-center gap-3 text-xs text-slate-300">
                    <User className="w-4 h-4 text-slate-500 shrink-0" />
                    <span className="truncate"><span className="text-slate-500 font-medium">Contact:</span> {s.contactPerson}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-300">
                    <Phone className="w-4 h-4 text-slate-500 shrink-0" />
                    <span className="font-mono">{s.phone || <span className="text-slate-500 italic">No phone record</span>}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-300">
                    <Mail className="w-4 h-4 text-slate-500 shrink-0" />
                    <span className="truncate font-mono">{s.email || <span className="text-slate-500 italic">No email record</span>}</span>
                  </div>
                  <div className="flex items-start gap-3 text-xs text-slate-300">
                    <MapPin className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                    <span className="leading-tight text-slate-400 text-xs">{s.address || <span className="text-slate-500 italic">No address record</span>}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-3 border-t border-slate-700/30 text-[10px] text-slate-500 font-semibold font-mono tracking-wider uppercase">
                ID: {s.id}
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
                  {editingSupplier ? `Edit ${editingSupplier.name}` : 'Add New Supplier'}
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
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Supplier / Company Name</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Apex Tech Ltd."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Contact Person</label>
                  <input
                    type="text"
                    required
                    value={formContactPerson}
                    onChange={(e) => setFormContactPerson(e.target.value)}
                    placeholder="e.g. Jane Smith"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Phone Number</label>
                    <input
                      type="text"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      placeholder="e.g. (555) 012-3456"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Email Address</label>
                    <input
                      type="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="e.g. orders@apex.com"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Postal Address</label>
                  <textarea
                    rows={2}
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    placeholder="Provide warehouse or dispatch address details..."
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
                    {submitting ? 'Saving...' : 'Save Supplier'}
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
