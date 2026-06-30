import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { 
  Box, DollarSign, TrendingUp, TrendingDown, AlertTriangle, 
  PackageCheck, ArrowRight, Activity, CalendarDays, RefreshCw
} from 'lucide-react';
import { motion } from 'motion/react';

interface DashboardStats {
  totalProducts: number;
  totalStockValue: number;
  todaySales: number;
  monthlySales: number;
  grossProfit: number;
  netProfit: number;
  lowStockProducts: any[];
  topSellingProducts: any[];
  dailySalesChart: { date: string; amount: number; profit: number }[];
  monthlySalesChart: { month: string; amount: number; profit: number }[];
}

interface DashboardViewProps {
  onNavigateToTab: (tab: string) => void;
}

export default function DashboardView({ onNavigateToTab }: DashboardViewProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<{ success: boolean; data: DashboardStats }>('/dashboard/summary');
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-slate-400 font-medium text-sm">Compiling system stats...</span>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-6 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error || 'An error occurred while compiling system stats'}</span>
        </div>
        <button 
          onClick={fetchStats}
          className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-white text-xs font-semibold rounded-xl transition cursor-pointer flex items-center gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  const {
    totalProducts,
    totalStockValue,
    todaySales,
    monthlySales,
    grossProfit,
    netProfit,
    lowStockProducts,
    topSellingProducts,
    dailySalesChart,
    monthlySalesChart
  } = stats;

  const currencyFormatter = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  // Helper to draw custom SVG charts
  const maxDaily = Math.max(...dailySalesChart.map(d => d.amount), 100);
  const maxMonthly = Math.max(...monthlySalesChart.map(m => m.amount), 500);

  return (
    <div className="space-y-5 font-sans">
      {/* Top Welcome Bar */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-base font-semibold text-white tracking-tight">Financial & Stock Overview</h2>
          <p className="text-slate-400 text-xs mt-0.5">Real-time status of active warehouse inventory and sales records</p>
        </div>
        <button 
          onClick={fetchStats}
          className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-md transition-all cursor-pointer flex items-center gap-1.5 text-xs font-medium"
          title="Refresh metrics"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Sync</span>
        </button>
      </div>

      {/* Low Stock Warning Alert Banner (Critical Stock Notification) */}
      {lowStockProducts.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3">
            <div className="p-1.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white leading-tight">Low Stock Alert! ({lowStockProducts.length} items require restock)</h4>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-normal">
                The following products have reached or dropped below their designated minimum threshold quantity: {' '}
                <span className="font-mono text-amber-300 font-semibold">
                  {lowStockProducts.slice(0, 3).map(p => p.name).join(', ')}
                  {lowStockProducts.length > 3 ? ` + ${lowStockProducts.length - 3} more` : ''}
                </span>
              </p>
            </div>
          </div>
          <button 
            onClick={() => onNavigateToTab('products')}
            className="self-start md:self-auto px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-[11px] font-bold rounded transition cursor-pointer flex items-center gap-1.5 shrink-0 border border-amber-500/20"
          >
            <span>Review Stock Levels</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </motion.div>
      )}

      {/* Grid of Key Performance Indicators (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Products Count */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 relative overflow-hidden group shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Total Active Products</p>
              <h3 className="text-2xl font-bold text-white tracking-tight mt-2 font-mono">{totalProducts}</h3>
            </div>
            <div className="p-2 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Box className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800 flex justify-between items-center text-[11px]">
            <span className="text-slate-500">Inventory items tracked</span>
            <button onClick={() => onNavigateToTab('products')} className="text-blue-400 hover:text-blue-300 font-medium cursor-pointer">Manage</button>
          </div>
        </div>

        {/* Stock value */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 relative overflow-hidden group shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Total Stock Valuation</p>
              <h3 className="text-2xl font-bold text-white tracking-tight mt-2 font-mono">{currencyFormatter(totalStockValue)}</h3>
            </div>
            <div className="p-2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <PackageCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800 flex justify-between items-center text-[11px]">
            <span className="text-slate-500">Sum of (Cost Price × Stock)</span>
            <button onClick={() => onNavigateToTab('stock-in')} className="text-emerald-400 hover:text-emerald-300 font-medium cursor-pointer">Order Stock</button>
          </div>
        </div>

        {/* Today's Sales */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 relative overflow-hidden group shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Today's Total Sales</p>
              <h3 className="text-2xl font-bold text-white tracking-tight mt-2 font-mono">{currencyFormatter(todaySales)}</h3>
            </div>
            <div className="p-2 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800 flex justify-between items-center text-[11px]">
            <span className="text-slate-500">Real-time daily ledger</span>
            <button onClick={() => onNavigateToTab('sales')} className="text-purple-400 hover:text-purple-300 font-medium cursor-pointer">New Sale</button>
          </div>
        </div>

        {/* Monthly Sales */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 relative overflow-hidden group shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Monthly Sales Volume</p>
              <h3 className="text-2xl font-bold text-white tracking-tight mt-2 font-mono">{currencyFormatter(monthlySales)}</h3>
            </div>
            <div className="p-2 rounded bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <CalendarDays className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800 flex justify-between items-center text-[11px]">
            <span className="text-slate-500">Current calendar month sales</span>
            <button onClick={() => onNavigateToTab('reports')} className="text-teal-400 hover:text-teal-300 font-medium cursor-pointer">Reports</button>
          </div>
        </div>

        {/* Gross Profit */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 relative overflow-hidden group shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Gross Profit (Cumulative)</p>
              <h3 className="text-2xl font-bold text-emerald-400 tracking-tight mt-2 font-mono">{currencyFormatter(grossProfit)}</h3>
            </div>
            <div className="p-2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800 flex justify-between items-center text-[11px]">
            <span className="text-slate-500">Sales minus Cost of Goods Sold</span>
            <span className="text-slate-500 font-medium">Healthy Margin</span>
          </div>
        </div>

        {/* Net Profit */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 relative overflow-hidden group shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Net Business Profit</p>
              <h3 className={`text-2xl font-bold tracking-tight mt-2 font-mono ${netProfit >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                {currencyFormatter(netProfit)}
              </h3>
            </div>
            <div className={`p-2 rounded border transition-colors ${
              netProfit >= 0 
                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
                : 'bg-red-500/10 text-red-400 border-red-500/20'
            }`}>
              {netProfit >= 0 ? <DollarSign className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800 flex justify-between items-center text-[11px]">
            <span className="text-slate-500">Gross Profit minus Expenses</span>
            <button onClick={() => onNavigateToTab('profit-distribution')} className="text-blue-400 hover:text-blue-300 font-medium cursor-pointer">Distribute</button>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Daily Sales Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col shadow-sm">
          <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-2">
            <div>
              <h4 className="text-xs font-bold text-white tracking-tight uppercase">Daily Sales Revenue</h4>
              <p className="text-[10px] text-slate-500 mt-0.5">Daily sales volume trends (Last 14 Days)</p>
            </div>
            <span className="px-2 py-0.5 bg-slate-800 rounded text-[9px] text-emerald-400 font-mono font-semibold">DAILY</span>
          </div>
          
          <div className="flex-1 min-h-[220px] relative flex items-end justify-between gap-1 pb-4">
            {/* Custom Responsive SVG Line/Bar Overlay Grid */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[9px] text-slate-500 font-mono pr-2">
              <div className="border-b border-slate-800/60 w-full pt-1">Max: {currencyFormatter(maxDaily)}</div>
              <div className="border-b border-slate-800/60 w-full">Mid: {currencyFormatter(maxDaily / 2)}</div>
              <div className="border-b border-slate-800/60 w-full pb-1">0</div>
            </div>
            
            <svg viewBox="0 0 100 40" className="w-full h-full shrink-0 z-10 pt-6 px-4">
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.35"/>
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0"/>
                </linearGradient>
              </defs>
              {/* Draw area */}
              <polygon
                points={`0,40 ${dailySalesChart.map((d, idx) => {
                  const x = (idx / (dailySalesChart.length - 1)) * 100;
                  const y = 40 - (d.amount / maxDaily) * 35;
                  return `${x},${y}`;
                }).join(' ')} 100,40`}
                fill="url(#chartGrad)"
              />
              {/* Draw path line */}
              <polyline
                fill="none"
                stroke="#10b981"
                strokeWidth="1.5"
                points={dailySalesChart.map((d, idx) => {
                  const x = (idx / (dailySalesChart.length - 1)) * 100;
                  const y = 40 - (d.amount / maxDaily) * 35;
                  return `${x},${y}`;
                }).join(' ')}
              />
              {/* Draw dots */}
              {dailySalesChart.map((d, idx) => {
                const x = (idx / (dailySalesChart.length - 1)) * 100;
                const y = 40 - (d.amount / maxDaily) * 35;
                return (
                  <circle
                    key={idx}
                    cx={x}
                    cy={y}
                    r="1"
                    fill="#10b981"
                    stroke="#0f172a"
                    strokeWidth="0.2"
                    className="hover:r-2 transition-all cursor-pointer"
                  >
                    <title>{`${d.date}: ${currencyFormatter(d.amount)}`}</title>
                  </circle>
                );
              })}
            </svg>
          </div>
          
          <div className="flex justify-between px-2 text-[9px] text-slate-500 font-semibold font-mono border-t border-slate-800 pt-3">
            <span>{dailySalesChart[0]?.date}</span>
            <span>{dailySalesChart[Math.floor(dailySalesChart.length / 2)]?.date}</span>
            <span>{dailySalesChart[dailySalesChart.length - 1]?.date}</span>
          </div>
        </div>

        {/* Monthly Sales Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col shadow-sm">
          <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-2">
            <div>
              <h4 className="text-xs font-bold text-white tracking-tight uppercase">Monthly Performance</h4>
              <p className="text-[10px] text-slate-500 mt-0.5">Aggregate billing volume and estimated margins</p>
            </div>
            <span className="px-2 py-0.5 bg-slate-800 rounded text-[9px] text-blue-400 font-mono font-semibold">MONTHLY</span>
          </div>
          
          <div className="flex-1 min-h-[220px] relative flex items-end justify-between pb-4 px-2">
            {/* Grid */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[9px] text-slate-500 font-mono pr-2">
              <div className="border-b border-slate-800/60 w-full pt-1">Max: {currencyFormatter(maxMonthly)}</div>
              <div className="border-b border-slate-800/60 w-full">Mid: {currencyFormatter(maxMonthly / 2)}</div>
              <div className="border-b border-slate-800/60 w-full pb-1">0</div>
            </div>
            
            {monthlySalesChart.map((m, idx) => {
              const pctAmount = Math.max((m.amount / maxMonthly) * 100, 3);
              const pctProfit = Math.max((m.profit / maxMonthly) * 100, 0);
              return (
                <div key={idx} className="flex flex-col items-center flex-1 z-10 group relative h-[85%] justify-end">
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 bg-slate-950 text-white font-mono text-[10px] p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-slate-700 shrink-0 shadow-lg z-30 min-w-[120px]">
                    <p className="font-bold text-slate-300">{m.month}</p>
                    <p className="mt-1 text-teal-400">Revenue: {currencyFormatter(m.amount)}</p>
                    <p className="text-emerald-400">GP: {currencyFormatter(m.profit)}</p>
                  </div>
                  
                  {/* Visual Bar container */}
                  <div className="w-7 bg-slate-700/20 rounded-t-md overflow-hidden flex flex-col justify-end h-full">
                    <div 
                      style={{ height: `${pctAmount}%` }}
                      className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-sm relative flex items-end justify-center"
                    >
                      {/* Secondary profit highlight inside */}
                      <div 
                        style={{ height: `${(pctProfit / pctAmount) * 100}%` }}
                        className="w-full bg-gradient-to-t from-emerald-500 to-emerald-400 opacity-80"
                      />
                    </div>
                  </div>
                  
                  <span className="text-[10px] text-slate-400 font-mono mt-2 truncate w-full text-center">{m.month.split(' ')[0]}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bento Grid: Left: Low Stock List, Right: Top Selling Products */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Low Stock Watch */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 lg:col-span-3 flex flex-col shadow-sm">
          <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-2">
            <div>
              <h4 className="text-xs font-bold text-white tracking-tight uppercase">Minimum Stock Watchlist</h4>
              <p className="text-[10px] text-slate-500 mt-0.5">Products requiring purchase orders immediately</p>
            </div>
            <button 
              onClick={() => onNavigateToTab('stock-in')}
              className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] font-semibold rounded border border-emerald-500/15 cursor-pointer transition"
            >
              Order Stock
            </button>
          </div>
          
          <div className="flex-1 overflow-x-auto">
            {lowStockProducts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 py-8 text-xs">
                <p>✓ All products are safely stocked</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[9px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="pb-2">Product Name</th>
                    <th className="pb-2 text-center">Current</th>
                    <th className="pb-2 text-center">Minimum</th>
                    <th className="pb-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-xs">
                  {lowStockProducts.slice(0, 5).map((p, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/20">
                      <td className="py-2.5 font-medium text-white max-w-[180px] truncate">
                        <div>
                          <p className="truncate text-xs font-medium text-slate-200">{p.name}</p>
                          <span className="text-[9px] text-slate-500 font-mono tracking-wider">{p.SKU}</span>
                        </div>
                      </td>
                      <td className="py-2.5 text-center font-mono font-semibold text-amber-400">{p.currentStock} {p.unit}</td>
                      <td className="py-2.5 text-center font-mono text-slate-500">{p.minimumStock} {p.unit}</td>
                      <td className="py-2.5 text-right">
                        <span className="inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20 uppercase tracking-wide">
                          {p.currentStock === 0 ? 'Out' : 'Low'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Top Selling Products */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 lg:col-span-2 flex flex-col shadow-sm">
          <div className="mb-4 border-b border-slate-800 pb-2">
            <h4 className="text-xs font-bold text-white tracking-tight uppercase">Top Selling Products</h4>
            <p className="text-[10px] text-slate-500 mt-0.5">Top billing volume catalog items</p>
          </div>
          
          <div className="flex-1 space-y-2.5">
            {topSellingProducts.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 py-8 text-xs text-center">
                <p>No transactions yet.<br/>Sales will populate this board.</p>
              </div>
            ) : (
              topSellingProducts.map((p, idx) => (
                <div key={idx} className="flex items-center gap-3 p-2 rounded bg-slate-950/40 border border-slate-850 hover:border-slate-800 transition-all">
                  <div className="w-6 h-6 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center font-mono text-[10px] font-bold text-emerald-400 shrink-0">
                    #{idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-200 truncate leading-tight">{p.name}</p>
                    <span className="text-[9px] text-slate-500 font-mono uppercase tracking-wider">{p.SKU}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-white font-mono">{p.quantity} sold</p>
                    <p className="text-[10px] text-emerald-400 font-mono mt-0.5">{currencyFormatter(p.revenue)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
