import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { ProfitDistribution, Investor } from '../types';
import { 
  Calculator, Calendar, FileCheck, AlertTriangle, 
  Trash2, TrendingUp, TrendingDown, Users, Sparkles, CheckCircle2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CalculationMetrics {
  month: string;
  totalSalesRevenue: number;
  totalCogs: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
  distributedAmount: number;
  items: {
    investorId: string;
    investorName: string;
    sharePercentage: number;
    profitAmount: number;
  }[];
}

export default function ProfitDistributionView() {
  const [history, setHistory] = useState<ProfitDistribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selector for drafting
  const [selectedMonth, setSelectedMonth] = useState('');
  const [draft, setDraft] = useState<CalculationMetrics | null>(null);
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);

  // Submitting state
  const [submitting, setSubmitting] = useState(false);

  // Expand historical items
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<{ success: boolean; data: ProfitDistribution[] }>('/distributions');
      if (response.success && response.data) {
        setHistory(response.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load distribution history');
    } finally {
      setLoading(false);
    }
  };

  // Preset selectedMonth to current month (e.g. '2026-06') on load
  useEffect(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${year}-${month}`);
    fetchHistory();
  }, []);

  // Fetch draft calculation metrics whenever month changes
  const fetchDraftCalculation = async (monthStr: string) => {
    if (!monthStr || !/^\d{4}-\d{2}$/.test(monthStr)) return;
    setDraftLoading(true);
    setDraftError(null);
    try {
      const response = await api.get<{ success: boolean; data: CalculationMetrics }>(`/distributions/calculate?month=${monthStr}`);
      if (response.success && response.data) {
        setDraft(response.data);
      }
    } catch (err: any) {
      setDraftError(err.message || 'Error executing calculation math');
    } finally {
      setDraftLoading(false);
    }
  };

  useEffect(() => {
    fetchDraftCalculation(selectedMonth);
  }, [selectedMonth]);

  const handleSubmitDistribution = async () => {
    if (!draft) return;
    
    // Check if Net Profit <= 0. While we let them save, warn them
    if (draft.netProfit <= 0) {
      if (!window.confirm('The calculated Net Profit for this month is negative or zero (a loss). No profit amounts will be distributed to investors. Do you still want to save this record?')) {
        return;
      }
    }

    setSubmitting(true);
    try {
      const response = await api.post<{ success: boolean; data: ProfitDistribution }>('/distributions', { month: draft.month });
      if (response.success) {
        alert(`Profit distribution for ${draft.month} has been finalized and saved successfully!`);
        setDraft(null);
        // Refresh
        await fetchHistory();
        // re-fetch draft for current selected month
        await fetchDraftCalculation(selectedMonth);
      }
    } catch (err: any) {
      alert(err.message || 'Error saving distribution records');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDistribution = async (id: string, monthStr: string) => {
    if (!window.confirm(`Are you sure you want to clear distribution history for ${monthStr}? This will free the month to be recalculated and submitted again.`)) {
      return;
    }

    try {
      const response = await api.delete<{ success: boolean }>(`/distributions/${id}`);
      if (response.success) {
        setHistory(history.filter(h => h.id !== id));
        // Recalculate draft
        if (selectedMonth === monthStr) {
          fetchDraftCalculation(selectedMonth);
        }
      }
    } catch (err: any) {
      alert(err.message || 'Error deleting distribution history');
    }
  };

  const currencyFormatter = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="border-b border-slate-800 pb-5">
        <h2 className="text-xl font-bold text-white tracking-tight">Monthly Profit Distribution Engine</h2>
        <p className="text-xs text-slate-400 mt-1">Audit net profits, and distribute dividends to active shareholders with complete historical ledgers</p>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/25 text-red-400 rounded-xl text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid: Left column draft calculator, Right column logs */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Drafting Column (3 Cols) */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-slate-800 border border-slate-700/50 rounded-2xl p-6 space-y-5 shadow-xl">
            <h3 className="font-bold text-white text-sm uppercase tracking-wide border-b border-slate-700/40 pb-3 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-emerald-400" />
                <span>Profit Calculator</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">DRAFT CONSOLE</span>
            </h3>

            {/* Select Month */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/40 p-4 rounded-xl border border-slate-700/30">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Target Month</label>
                <span className="text-xs text-slate-500 mt-1 block">Choose a year and month to query the active ledger</span>
              </div>
              <div className="relative shrink-0 min-w-[140px]">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4 pointer-events-none" />
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 pl-9 pr-3 text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                />
              </div>
            </div>

            {draftLoading ? (
              <div className="py-24 text-center">
                <span className="inline-block w-6 h-6 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></span>
                <p className="text-slate-400 text-[11px] mt-2 font-mono">Running ledger formulas...</p>
              </div>
            ) : draftError ? (
              <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl">
                <span>{draftError}</span>
              </div>
            ) : draft ? (
              <div className="space-y-6">
                
                {/* Formulas Display Card */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Revenue */}
                  <div className="p-3 bg-slate-900/40 border border-slate-700/30 rounded-xl text-center">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Net Sales Revenue</span>
                    <span className="font-mono text-xs text-slate-300 mt-1 block">{currencyFormatter(draft.totalSalesRevenue)}</span>
                  </div>
                  {/* COGS */}
                  <div className="p-3 bg-slate-900/40 border border-slate-700/30 rounded-xl text-center">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Cost of Goods (COGS)</span>
                    <span className="font-mono text-xs text-slate-300 mt-1 block">-{currencyFormatter(draft.totalCogs)}</span>
                  </div>
                  {/* GP */}
                  <div className="p-3 bg-slate-900/40 border border-slate-700/30 rounded-xl text-center">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Gross Profit (GP)</span>
                    <span className="font-mono text-xs text-emerald-400 font-bold mt-1 block">={currencyFormatter(draft.grossProfit)}</span>
                  </div>
                  {/* Expenses */}
                  <div className="p-3 bg-slate-900/40 border border-slate-700/30 rounded-xl text-center">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Operating Expenses</span>
                    <span className="font-mono text-xs text-red-400 font-bold mt-1 block">-{currencyFormatter(draft.expenses)}</span>
                  </div>
                </div>

                {/* Net Profit Core Summary Block */}
                <div className="bg-slate-900/60 border border-slate-700/50 p-5 rounded-2xl flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Month Net Business Profit</span>
                    <span className={`text-2xl font-black font-mono block ${draft.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {currencyFormatter(draft.netProfit)}
                    </span>
                  </div>
                  <div className={`p-3 rounded-xl border ${
                    draft.netProfit >= 0 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/15' 
                      : 'bg-red-500/10 text-red-400 border-red-500/15'
                  }`}>
                    {draft.netProfit >= 0 ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                  </div>
                </div>

                {/* Shareholders Dividend Splits */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-emerald-400" />
                    <span>Dividends Split Proposal</span>
                  </h4>
                  
                  {draft.items.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No investors found in system. Shares are not distributable.</p>
                  ) : (
                    <div className="border border-slate-700/60 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-slate-900/40 border-b border-slate-700/40 text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                            <th className="py-2.5 px-4">Investor Name</th>
                            <th className="py-2.5 px-4 text-center">Profit Share %</th>
                            <th className="py-2.5 px-4 text-right">Dividend Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/30 font-mono">
                          {draft.items.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-700/5">
                              <td className="py-2.5 px-4 font-sans text-white font-semibold">{item.investorName}</td>
                              <td className="py-2.5 px-4 text-center text-slate-400 font-bold">{item.sharePercentage}%</td>
                              <td className="py-2.5 px-4 text-right text-emerald-400 font-extrabold">{currencyFormatter(item.profitAmount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Submit Panel */}
                <div className="pt-4 border-t border-slate-700/40 flex justify-end gap-3">
                  {history.some(h => h.month === draft.month) ? (
                    <div className="w-full p-3.5 bg-blue-500/10 border border-blue-500/25 rounded-xl text-xs text-blue-400 flex items-center justify-between">
                      <span className="font-semibold">✓ Ledger distributed and saved already.</span>
                      <span className="text-[10px] font-mono opacity-80">Check logs on the right</span>
                    </div>
                  ) : (
                    <button
                      onClick={handleSubmitDistribution}
                      disabled={submitting || draft.items.length === 0}
                      className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer disabled:opacity-50 transition flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Finalize & Submit {draft.month} Dividend Splits</span>
                    </button>
                  )}
                </div>

              </div>
            ) : (
              <div className="py-12 text-center text-slate-500 italic text-xs">
                Select a month above to draft distribution Splits
              </div>
            )}
          </div>
        </div>

        {/* Historical Logs Column (2 Cols) */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-slate-800 border border-slate-700/50 rounded-2xl p-6 shadow-xl flex flex-col h-full min-h-[400px]">
            <h3 className="font-bold text-white text-sm uppercase tracking-wide border-b border-slate-700/40 pb-3 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-400" />
              <span>Historical Distributions</span>
            </h3>

            {loading ? (
              <div className="py-24 text-center flex-1 flex items-center justify-center">
                <span className="inline-block w-6 h-6 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></span>
              </div>
            ) : history.length === 0 ? (
              <div className="py-24 text-center text-slate-500 flex flex-col items-center justify-center gap-2 flex-1">
                <Calculator className="w-6 h-6 opacity-30" />
                <p className="text-xs font-semibold">No distribution splits submitted</p>
                <p className="text-[10px] max-w-[180px]">Draft a split on the left console, and click "Finalize & Submit".</p>
              </div>
            ) : (
              <div className="space-y-3 mt-4 overflow-y-auto max-h-[50vh] pr-1">
                {history.map((h) => {
                  const isExpanded = expandedId === h.id;
                  return (
                    <div 
                      key={h.id} 
                      className="bg-slate-900/50 border border-slate-700/40 rounded-xl overflow-hidden transition-all duration-150"
                    >
                      {/* Summary Bar */}
                      <button 
                        onClick={() => toggleExpand(h.id)}
                        className="w-full flex items-center justify-between p-4 text-left cursor-pointer hover:bg-slate-700/10 transition-colors"
                      >
                        <div>
                          <span className="text-xs font-bold text-white font-mono">{h.month}</span>
                          <span className="text-[9px] text-slate-500 block font-semibold mt-0.5 uppercase">Saved on {new Date(h.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="text-xs font-extrabold text-emerald-400 font-mono">
                              {currencyFormatter(h.netProfit)}
                            </span>
                            <span className="text-[9px] text-slate-500 block font-semibold uppercase">Net Profit</span>
                          </div>
                          <span className="text-slate-500 text-xs">{isExpanded ? '▲' : '▼'}</span>
                        </div>
                      </button>

                      {/* Expanded Splits sub-table */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="px-4 pb-4 border-t border-slate-800 bg-slate-950/20 text-xs"
                          >
                            <div className="space-y-3.5 pt-4">
                              <div className="grid grid-cols-3 gap-2 text-center text-[10px] bg-slate-900/50 p-2.5 rounded-lg border border-slate-800">
                                <div>
                                  <span className="text-slate-500 block font-bold uppercase text-[8px]">Gross Profit</span>
                                  <span className="text-slate-300 font-semibold font-mono">{currencyFormatter(h.grossProfit)}</span>
                                </div>
                                <div>
                                  <span className="text-slate-500 block font-bold uppercase text-[8px]">Expenses</span>
                                  <span className="text-red-400 font-semibold font-mono">-{currencyFormatter(h.expenses)}</span>
                                </div>
                                <div>
                                  <span className="text-slate-500 block font-bold uppercase text-[8px]">Distributed</span>
                                  <span className="text-emerald-400 font-bold font-mono">{currencyFormatter(h.distributedAmount)}</span>
                                </div>
                              </div>

                              <div className="space-y-1.5 pt-1">
                                <span className="text-slate-500 font-bold uppercase text-[8px] tracking-wider block mb-1">Split Ledger</span>
                                {h.items?.map((item, idx) => (
                                  <div key={idx} className="flex justify-between items-center text-xs p-2 rounded-lg bg-slate-900/20 border border-slate-800">
                                    <span className="text-slate-200 font-medium">{item.investorName}</span>
                                    <div className="font-mono text-right">
                                      <span className="text-slate-500 text-[10px] font-bold mr-2">{item.sharePercentage}%</span>
                                      <span className="text-emerald-400 font-bold">{currencyFormatter(item.profitAmount)}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              <button
                                onClick={() => handleDeleteDistribution(h.id, h.month)}
                                className="w-full flex items-center justify-center gap-1.5 py-1.5 text-red-400 hover:text-red-300 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 hover:border-red-500/20 rounded-lg text-[10px] font-bold transition cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Clear ledger record</span>
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
