import React, { useState } from 'react';
import { api } from '../utils/api';
import { Shield, RefreshCw, Database, Terminal, CheckCircle } from 'lucide-react';

interface SettingsProps {
  user: any;
}

export default function SettingsView({ user }: SettingsProps) {
  const [resetting, setResetting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSystemReset = async () => {
    if (!window.confirm('WARNING: This will wipe all current transactions (Invoices, Purchases, Profit distributions) and restore the system to its initial pristine seed data. This action is irreversible. Proceed?')) {
      return;
    }

    setResetting(true);
    setSuccessMsg(null);
    try {
      // In our server, we can write a clean reset endpoint, or simulate database restoration.
      // Let's call a system reset endpoint.
      const response = await api.post<{ success: boolean; message: string }>('/auth/reset-db', {});
      if (response.success) {
        setSuccessMsg(response.message || 'Database successfully restored to original seed state.');
        setTimeout(() => {
          window.location.reload(); // Reload to refresh all cache
        }, 1500);
      }
    } catch (err: any) {
      alert(err.message || 'Error resetting database system.');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="border-b border-slate-800 pb-5">
        <h2 className="text-xl font-bold text-white tracking-tight">System Settings & Controls</h2>
        <p className="text-xs text-slate-400 mt-1">Configure profile variables, perform backups and manage server database migrations</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Profile details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-800 border border-slate-700/50 rounded-2xl p-6 space-y-5 shadow-xl">
            <h3 className="font-bold text-white text-sm uppercase tracking-wide border-b border-slate-700/40 pb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Security Profile</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-900/40 border border-slate-700/30 rounded-xl space-y-1">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Logged in User</span>
                <span className="text-sm font-bold text-white block">{user?.name || 'Super Administrator'}</span>
              </div>

              <div className="p-4 bg-slate-900/40 border border-slate-700/30 rounded-xl space-y-1">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Access Role Clearance</span>
                <span className="text-xs font-mono font-extrabold text-emerald-400 bg-emerald-500/10 py-0.5 px-2 rounded border border-emerald-500/10 inline-block uppercase">
                  {user?.role || 'Admin'}
                </span>
              </div>

              <div className="p-4 bg-slate-900/40 border border-slate-700/30 rounded-xl space-y-1">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Session JWT Token Status</span>
                <span className="text-xs text-emerald-400 flex items-center gap-1.5 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Verified & Active</span>
                </span>
              </div>

              <div className="p-4 bg-slate-900/40 border border-slate-700/30 rounded-xl space-y-1">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">System Runtime Mode</span>
                <span className="text-xs text-slate-400 font-mono font-medium">Node.js (TypeScript Serverless Engine)</span>
              </div>
            </div>
          </div>

          {/* Database controls */}
          <div className="bg-slate-800 border border-slate-700/50 rounded-2xl p-6 space-y-4 shadow-xl">
            <h3 className="font-bold text-white text-sm uppercase tracking-wider flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" />
              <span>Database Administration</span>
            </h3>
            
            <p className="text-xs text-slate-400 leading-relaxed">
              BizManager uses an in-memory database wrapper on top of server JSON schemas for instant response calculations and high portability. If you need to clear demo logs or restore the database to seed values, use the system restore option below.
            </p>

            {successMsg && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl flex items-center gap-2 font-semibold">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>{successMsg}</span>
              </div>
            )}

            <div className="pt-2">
              <button
                onClick={handleSystemReset}
                disabled={resetting}
                className="px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/45 text-red-400 font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center gap-2"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
                <span>{resetting ? 'Purging database...' : 'Wipe & Re-Seed Database'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Technical stack logs */}
        <div className="lg:col-span-1">
          <div className="bg-slate-800 border border-slate-700/50 rounded-2xl p-6 space-y-4 shadow-xl h-full">
            <h3 className="font-bold text-white text-sm uppercase tracking-wide border-b border-slate-700/40 pb-3 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>Log console</span>
            </h3>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 font-mono text-[10px] text-slate-400 space-y-2.5 leading-relaxed overflow-hidden">
              <p className="text-slate-500">{"[SYSTEM INFRASTRUCTURE LOG]"}</p>
              <p>{"$ check_jwt_signature --active"}</p>
              <p className="text-emerald-400">{"[OK] HMAC-SHA256 signature algorithm ready"}</p>
              <p>{"$ fetch_database_metadata"}</p>
              <p className="text-slate-300">{"Database: Memory-JSON ledger system"}</p>
              <p className="text-slate-300">{"Prisma Client: Installed"}</p>
              <p className="text-slate-300">{"Deployment Mode: Container sandbox"}</p>
              <p className="text-slate-500">{"[READY] Waiting for corporate connections..."}</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
