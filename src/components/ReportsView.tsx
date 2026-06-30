import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { Sale, Expense, Purchase } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { 
  TrendingUp, TrendingDown, DollarSign, Calendar, 
  AlertTriangle, BarChart3, PieChart, FileText, Briefcase 
} from 'lucide-react';

interface MonthlyData {
  monthName: string;
  monthNum: string;
  revenue: number;
  cogs: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
}

const MONTHS_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export default function ReportsView() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedYear, setSelectedYear] = useState('2026');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [salesRes, expRes, purRes] = await Promise.all([
        api.get<{ success: boolean; data: Sale[] }>('/sales'),
        api.get<{ success: boolean; data: Expense[] }>('/expenses'),
        api.get<{ success: boolean; data: Purchase[] }>('/purchases')
      ]);

      if (salesRes.success && salesRes.data) setSales(salesRes.data);
      if (expRes.success && expRes.data) setExpenses(expRes.data);
      if (purRes.success && purRes.data) setPurchases(purRes.data);
    } catch (err: any) {
      setError(err.message || 'Error compiling ledger metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute monthly arrays for the selected year
  const monthlyBreakdown: MonthlyData[] = MONTHS_NAMES.map((name, index) => {
    const monthNum = String(index + 1).padStart(2, '0');
    const monthPrefix = `${selectedYear}-${monthNum}`;

    // Filter sales in this month
    const monthSales = sales.filter(s => s.date.startsWith(monthPrefix));
    // Filter expenses in this month
    const monthExpenses = expenses.filter(e => e.date.startsWith(monthPrefix));

    const revenue = monthSales.reduce((acc, s) => acc + s.totalAmount, 0);
    const cogs = monthSales.reduce((acc, s) => acc + s.cogs, 0);
    const grossProfit = revenue - cogs;
    const expensesAmt = monthExpenses.reduce((acc, e) => acc + e.amount, 0);
    const netProfit = grossProfit - expensesAmt;

    return {
      monthName: name,
      monthNum,
      revenue,
      cogs,
      grossProfit,
      expenses: expensesAmt,
      netProfit
    };
  });

  // Yearly Summary Totals
  const totalRevenue = monthlyBreakdown.reduce((acc, d) => acc + d.revenue, 0);
  const totalCogs = monthlyBreakdown.reduce((acc, d) => acc + d.cogs, 0);
  const totalGrossProfit = totalRevenue - totalCogs;
  const totalExpenses = monthlyBreakdown.reduce((acc, d) => acc + d.expenses, 0);
  const totalNetProfit = totalGrossProfit - totalExpenses;

  // Margin ratios
  const grossProfitMargin = totalRevenue > 0 ? (totalGrossProfit / totalRevenue) * 100 : 0;
  const netProfitMargin = totalRevenue > 0 ? (totalNetProfit / totalRevenue) * 100 : 0;

  const currencyFormatter = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  };

  const percentFormatter = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // List of available years from the dataset
  const getAvailableYears = () => {
    const years = new Set<string>();
    years.add('2026'); // default
    
    sales.forEach(s => {
      const y = s.date.substring(0, 4);
      if (y) years.add(y);
    });
    expenses.forEach(e => {
      const y = e.date.substring(0, 4);
      if (y) years.add(y);
    });
    purchases.forEach(p => {
      const y = p.purchaseDate.substring(0, 4);
      if (y) years.add(y);
    });

    return Array.from(years).sort();
  };

  const yearsList = getAvailableYears();

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Annual Financial Reports</h2>
          <p className="text-xs text-slate-400 mt-1">Review year-to-date retail margins, operational overheads, and corporate performance charts</p>
        </div>

        {/* Year Selector */}
        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 items-center gap-2">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-2.5">Fiscal Year:</span>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="bg-slate-800 border border-slate-700/60 rounded-lg text-xs font-bold text-emerald-400 py-1.5 px-3 focus:outline-none cursor-pointer"
          >
            {yearsList.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/25 text-red-400 rounded-xl text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="py-24 text-center">
          <span className="inline-block w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></span>
          <p className="text-slate-400 text-xs mt-3">Compiling fiscal charts...</p>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Yearly summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
            {/* Sales Revenue */}
            <div className="bg-slate-800 border border-slate-700/50 p-5 rounded-2xl">
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide block">Gross Sales Revenue</span>
              <p className="text-xl font-black text-white font-mono mt-1">{currencyFormatter(totalRevenue)}</p>
              <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold uppercase font-sans">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                <span>Total Invoices out</span>
              </div>
            </div>

            {/* Total COGS */}
            <div className="bg-slate-800 border border-slate-700/50 p-5 rounded-2xl">
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide block">Total Cost of Goods (COGS)</span>
              <p className="text-xl font-black text-slate-300 font-mono mt-1">{currencyFormatter(totalCogs)}</p>
              <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold uppercase font-sans">
                <div className="w-2 h-2 bg-slate-500 rounded-full"></div>
                <span>Inventory wholesale value</span>
              </div>
            </div>

            {/* Gross Profit */}
            <div className="bg-slate-800 border border-slate-700/50 p-5 rounded-2xl">
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide block">Gross Profit (GP)</span>
              <p className="text-xl font-black text-emerald-400 font-mono mt-1">{currencyFormatter(totalGrossProfit)}</p>
              <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-emerald-500 font-bold uppercase font-sans">
                <span>Margin: {percentFormatter(grossProfitMargin)}</span>
              </div>
            </div>

            {/* Operating Expenses */}
            <div className="bg-slate-800 border border-slate-700/50 p-5 rounded-2xl">
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide block">Operating Expenses</span>
              <p className="text-xl font-black text-red-400 font-mono mt-1">{currencyFormatter(totalExpenses)}</p>
              <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold uppercase font-sans">
                <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                <span>Overheads & Wages</span>
              </div>
            </div>

            {/* Net Profit */}
            <div className="bg-slate-800 border border-slate-700/50 p-5 rounded-2xl">
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide block">Net Profit</span>
              <p className={`text-xl font-black font-mono mt-1 ${totalNetProfit >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                {currencyFormatter(totalNetProfit)}
              </p>
              <div className="mt-2.5 flex items-center gap-1.5 text-[10px] font-bold uppercase font-sans text-blue-400">
                <span>Margin: {percentFormatter(netProfitMargin)}</span>
              </div>
            </div>
          </div>

          {/* Interactive Chart Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Chart Column (2/3 width) */}
            <div className="lg:col-span-2 bg-slate-800 border border-slate-700/50 rounded-2xl p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                <span>Monthly Fiscal Health Performance</span>
              </h3>
              
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                    <XAxis dataKey="monthName" stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', borderRadius: '12px' }}
                      labelStyle={{ color: '#ffffff', fontWeight: 'bold', fontSize: '12px' }}
                      itemStyle={{ fontSize: '11px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                    <Bar name="Sales Revenue" dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar name="Expenses" dataKey="expenses" fill="#f87171" radius={[4, 4, 0, 0]} />
                    <Bar name="Net Profit" dataKey="netProfit" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Profit Area Curve (1/3 width) */}
            <div className="lg:col-span-1 bg-slate-800 border border-slate-700/50 rounded-2xl p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <PieChart className="w-4 h-4 text-emerald-400" />
                <span>Net Earnings Trend curve</span>
              </h3>

              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#60a5fa" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                    <XAxis dataKey="monthName" stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', borderRadius: '12px' }}
                      labelStyle={{ color: '#ffffff', fontWeight: 'bold', fontSize: '12px' }}
                      itemStyle={{ fontSize: '11px' }}
                    />
                    <Area type="monotone" name="Net Profit" dataKey="netProfit" stroke="#60a5fa" strokeWidth={2.5} fillOpacity={1} fill="url(#colorNet)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* Complete Fiscal Ledger Breakdown */}
          <div className="bg-slate-800 border border-slate-700/50 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-5 border-b border-slate-700/50 bg-slate-900/10">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>Monthly Fiscal Ledger</span>
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-700/50 text-[10px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-900/30">
                    <th className="py-3.5 px-5">Month</th>
                    <th className="py-3.5 px-4 text-right">Gross Sales</th>
                    <th className="py-3.5 px-4 text-right">COGS Cost</th>
                    <th className="py-3.5 px-4 text-right">Gross Profit</th>
                    <th className="py-3.5 px-4 text-right">Op. Expenses</th>
                    <th className="py-3.5 px-5 text-right">Net Income</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/30 text-xs font-mono">
                  {monthlyBreakdown.map((row) => (
                    <tr key={row.monthNum} className="hover:bg-slate-700/10 transition-colors">
                      <td className="py-3.5 px-5 text-slate-300 font-sans font-bold">{MONTHS_NAMES[Number(row.monthNum) - 1]} {selectedYear}</td>
                      <td className="py-3.5 px-4 text-right text-slate-300">{currencyFormatter(row.revenue)}</td>
                      <td className="py-3.5 px-4 text-right text-slate-500">-{currencyFormatter(row.cogs)}</td>
                      <td className="py-3.5 px-4 text-right text-emerald-500 font-semibold">{currencyFormatter(row.grossProfit)}</td>
                      <td className="py-3.5 px-4 text-right text-red-400">-{currencyFormatter(row.expenses)}</td>
                      <td className={`py-3.5 px-5 text-right font-bold text-sm ${row.netProfit >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                        {currencyFormatter(row.netProfit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
