import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { CardSkeleton, TableSkeleton } from '../components/common/LoadingSkeleton';
import {
  Layers,
  Thermometer,
  Zap,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle,
  Database,
  Cpu
} from 'lucide-react';

export const PlaceholderDashboard = ({
  title = 'Asset Registry & Health Dashboard',
  moduleNumber = '02',
  description = 'High-level operational overview across bulk milk coolers, tankers, pasteurizers, homogenizers, and packaging lines.'
}) => {
  const { user, role } = useAuth();
  const [viewState, setViewState] = useState('NORMAL'); // 'NORMAL' | 'LOADING' | 'EMPTY' | 'ERROR'

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono font-bold text-dairy-600 bg-dairy-50 px-2 py-0.5 rounded border border-dairy-200">
              MODULE {moduleNumber}
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl">{description}</p>
        </div>

        {/* View State Switcher (Demonstrating Phase 1 universal state handling) */}
        <div className="flex items-center space-x-1.5 bg-white border border-slate-200 p-1 rounded-lg text-xs shadow-xs self-start">
          <span className="text-[11px] font-semibold text-slate-400 px-2">State:</span>
          {['NORMAL', 'LOADING', 'EMPTY', 'ERROR'].map((s) => (
            <button
              key={s}
              onClick={() => setViewState(s)}
              className={`px-2 py-1 rounded font-medium transition ${
                viewState === s ? 'bg-dairy-600 text-white font-bold' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Render states */}
      {viewState === 'LOADING' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
          <TableSkeleton rows={4} />
        </div>
      )}

      {viewState === 'EMPTY' && (
        <EmptyState
          title="No Active Dairy Assets Found"
          description="There are currently no registered assets in this specific chilling center scope."
          actionLabel="Register First Dairy Asset"
          onAction={() => alert('Phase 3 Asset Registration modal trigger')}
        />
      )}

      {viewState === 'ERROR' && (
        <ErrorState
          title="Telemetry Gateway Communication Error"
          message="Could not establish real-time socket connection with the IoT PLC controller."
          onRetry={() => setViewState('NORMAL')}
        />
      )}

      {viewState === 'NORMAL' && (
        <>
          {/* Phase 1 Verification Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-dairy-300 transition">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Fleet Health Index</span>
                <Thermometer className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-bold text-slate-900">94.8%</span>
                <span className="text-xs font-semibold text-emerald-600 flex items-center">
                  <ArrowUpRight className="w-3 h-3" /> +1.2%
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">15/16 assets chilling &le; 4.0&deg;C</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-dairy-300 transition">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active Risk Alarms</span>
                <Zap className="w-4 h-4 text-amber-500" />
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-bold text-amber-600">1</span>
                <StatusBadge status="WARNING" className="text-[10px]" />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">BMC-018: Suction drop detected</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-dairy-300 transition">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Work Orders Today</span>
                <Clock className="w-4 h-4 text-blue-500" />
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-bold text-slate-900">3</span>
                <StatusBadge status="IN_PROGRESS" className="text-[10px]" />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">2 Scheduled &bull; 1 Predictive AI</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-dairy-300 transition">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active User Scope</span>
                <ShieldCheck className="w-4 h-4 text-purple-500" />
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-sm font-bold text-purple-700 truncate">{role}</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 truncate">{user?.orgScope?.cooperativeZone || 'Southern Region'}</p>
            </div>
          </div>

          {/* Technical Architecture Status Box */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl p-5 border border-slate-700 shadow-sm">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-xs font-mono font-semibold tracking-wider text-emerald-400 uppercase">
                    Phase 1 Foundation Active
                  </span>
                </div>
                <h2 className="text-lg font-bold mt-1 text-white">Full-Stack Technical Foundation Verified</h2>
                <p className="text-xs text-slate-300 mt-0.5 max-w-2xl">
                  Node.js/Express backend, MongoDB database schemas (13 collections), Zod validation, Tailwind styling,
                  reusable layout shell, and universal state handling contracts are connected.
                </p>
              </div>

              <div className="flex items-center space-x-3 shrink-0">
                <div className="flex items-center space-x-1.5 text-xs text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
                  <Database className="w-3.5 h-3.5 text-dairy-400" />
                  <span>13 Schemas</span>
                </div>
                <div className="flex items-center space-x-1.5 text-xs text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
                  <Cpu className="w-3.5 h-3.5 text-dairy-400" />
                  <span>AI Architecture Ready</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PlaceholderDashboard;

