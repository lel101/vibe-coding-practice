import React from 'react';
import { 
  LayoutDashboard, Box, Tags, Truck, ArrowUpRight, 
  ArrowDownLeft, Receipt, Users, Calculator, FileText, 
  Settings, LogOut, Building2, User
} from 'lucide-react';
import { motion } from 'motion/react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: any;
  onLogout: () => void;
}

export default function Sidebar({ activeTab, setActiveTab, user, onLogout }: SidebarProps) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'products', label: 'Products', icon: Box },
    { id: 'categories', label: 'Categories', icon: Tags },
    { id: 'suppliers', label: 'Suppliers', icon: Truck },
    { id: 'stock-in', label: 'Stock In', icon: ArrowDownLeft },
    { id: 'sales', label: 'Sales', icon: ArrowUpRight },
    { id: 'expenses', label: 'Expenses', icon: Receipt },
    { id: 'investors', label: 'Investors', icon: Users },
    { id: 'profit-distribution', label: 'Profit Distribution', icon: Calculator },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 h-screen sticky top-0">
      {/* Brand Header */}
      <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800">
        <div className="w-8 h-8 bg-emerald-500 rounded flex items-center justify-center text-slate-950 font-bold text-lg select-none">
          B
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-white leading-none">BizManager</h1>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1 scrollbar-thin scrollbar-thumb-slate-800">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer relative group ${
                isActive 
                  ? 'text-emerald-400 bg-slate-800/80 border border-slate-700/40' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40 border border-transparent'
              }`}
            >
              {isActive && (
                <motion.div 
                  layoutId="activeIndicator"
                  className="absolute left-0 w-1 h-6 bg-emerald-500 rounded-r-md"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <Icon className={`w-4 h-4 shrink-0 transition-colors ${
                isActive ? 'text-emerald-400' : 'text-slate-400 group-hover:text-white'
              }`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer Profile Details */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex flex-col gap-3">
        <div className="flex items-center gap-3 px-2 py-1.5 rounded-xl">
          <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 border border-slate-700">
            <User className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{user?.name || 'Administrator'}</p>
            <span className="text-[10px] text-emerald-400 font-mono tracking-wider font-semibold uppercase">{user?.role || 'ADMIN'}</span>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/15 transition-all duration-150 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
