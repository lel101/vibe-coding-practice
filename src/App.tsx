import React, { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import LoginView from './components/LoginView';
import DashboardView from './components/DashboardView';
import ProductsView from './components/ProductsView';
import CategoriesView from './components/CategoriesView';
import SuppliersView from './components/SuppliersView';
import StockInView from './components/StockInView';
import SalesView from './components/SalesView';
import ExpensesView from './components/ExpensesView';
import InvestorsView from './components/InvestorsView';
import ProfitDistributionView from './components/ProfitDistributionView';
import ReportsView from './components/ReportsView';
import SettingsView from './components/SettingsView';
import { 
  getAuthToken, getSavedUser, removeAuthToken, 
  removeSavedUser, api 
} from './utils/api';

export default function App() {
  const [token, setToken] = useState<string | null>(getAuthToken());
  const [user, setUser] = useState<any | null>(getSavedUser());
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Load profile on start if token exists
  useEffect(() => {
    const loadProfile = async () => {
      const storedToken = getAuthToken();
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.get<{ success: boolean; data: { user: any } }>('/auth/me');
        if (response.success && response.data?.user) {
          setUser(response.data.user);
        } else {
          // Token expired or invalid
          handleLogout();
        }
      } catch (err) {
        handleLogout();
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [token]);

  const handleLoginSuccess = (loggedInUser: any) => {
    setToken(getAuthToken());
    setUser(loggedInUser);
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    removeAuthToken();
    removeSavedUser();
    setToken(null);
    setUser(null);
  };

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView onNavigateToTab={setActiveTab} />;
      case 'products':
        return <ProductsView />;
      case 'categories':
        return <CategoriesView />;
      case 'suppliers':
        return <SuppliersView />;
      case 'stock-in':
        return <StockInView />;
      case 'sales':
        return <SalesView />;
      case 'expenses':
        return <ExpensesView />;
      case 'investors':
        return <InvestorsView />;
      case 'profit-distribution':
        return <ProfitDistributionView />;
      case 'reports':
        return <ReportsView />;
      case 'settings':
        return <SettingsView user={user} />;
      default:
        return <DashboardView onNavigateToTab={setActiveTab} />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center font-sans">
        <span className="inline-block w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></span>
        <p className="text-slate-400 text-xs mt-3.5 font-semibold tracking-wider uppercase font-mono">Loading corporate workspace...</p>
      </div>
    );
  }

  // Auth gate
  if (!token || !user) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  const tabInfo = (() => {
    switch (activeTab) {
      case 'dashboard':
        return { title: 'System Dashboard', subtitle: 'Monthly Summary' };
      case 'products':
        return { title: 'Product Inventory', subtitle: 'Catalog & Thresholds' };
      case 'categories':
        return { title: 'Category Catalog', subtitle: 'Classification Groupings' };
      case 'suppliers':
        return { title: 'Supplier Directory', subtitle: 'Vendor Contacts' };
      case 'stock-in':
        return { title: 'Stock Inflow Ledger', subtitle: 'Purchase & Restock' };
      case 'sales':
        return { title: 'Sales Ledger', subtitle: 'Billings & Invoicing' };
      case 'expenses':
        return { title: 'Operational Expenses', subtitle: 'Outflow Costs' };
      case 'investors':
        return { title: 'Capital Investors', subtitle: 'Shareholders & Equity' };
      case 'profit-distribution':
        return { title: 'Profit Distributions', subtitle: 'Net Earnings Disbursal' };
      case 'reports':
        return { title: 'Analytical Reporting', subtitle: 'Performance Audits' };
      case 'settings':
        return { title: 'System Controls', subtitle: 'Admin Console & Logs' };
      default:
        return { title: 'Corporate Workstation', subtitle: 'Standard Ledger' };
    }
  })();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex font-sans overflow-hidden">
      {/* Sidebar Navigation Panel */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        user={user} 
        onLogout={handleLogout} 
      />

      {/* Main Workspace Frame with high density scrolling and fixed header layout */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Universal Top Header */}
        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-6 sm:px-8 bg-slate-900/50 shrink-0">
          <h1 className="text-sm sm:text-base font-semibold text-white flex items-center">
            <span>{tabInfo.title}</span>
            <span className="text-slate-500 font-normal ml-2 text-xs sm:text-sm">/ {tabInfo.subtitle}</span>
          </h1>
          <div className="flex items-center gap-3.5">
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded uppercase tracking-wider font-semibold">
              {user.role} mode
            </span>
          </div>
        </header>

        {/* Content viewport */}
        <main className="flex-1 p-5 sm:p-6 overflow-y-auto bg-slate-950">
          <div className="max-w-7xl mx-auto space-y-5">
            {renderActiveView()}
          </div>
        </main>
      </div>
    </div>
  );
}
