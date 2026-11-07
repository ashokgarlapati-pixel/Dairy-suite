import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Activity,
  Layers,
  Calendar,
  ClipboardList,
  Cpu,
  Sparkles,
  BarChart3,
  FileText,
  Bell,
  Users,
  ShieldAlert,
  Sliders,
  Milk,
  X
} from 'lucide-react';

export const Sidebar = ({ isOpen, onClose }) => {
  const { role } = useAuth();

  // Navigation items mapping exactly to the 12 required modules
  const navItems = [
    {
      group: 'Core Operational Modules',
      items: [
        { name: 'Asset Registry & Health', path: '/assets', icon: Layers },
        { name: 'Asset Detail & History', path: '/assets/BMC-018', icon: Activity },
        { name: 'Maintenance Calendar & Queue', path: '/calendar', icon: Calendar },
        { name: 'Planning & Closure Board', path: '/planning', icon: ClipboardList }
      ]
    },
    {
      group: 'AI Decision Support & MLOps',
      items: [
        { name: 'Failure Risk & RUL', path: '/predictions/rul', icon: Cpu, badge: 'AI' },
        { name: 'Maintenance Recommendations', path: '/recommendations', icon: Sparkles, badge: 'HITL' },
        { name: 'Reliability & Model Performance', path: '/mlops-performance', icon: BarChart3 }
      ]
    },
    {
      group: 'Analytics & Administration',
      items: [
        { name: 'Reports & Analytics', path: '/analytics-reports', icon: FileText },
        { name: 'Notifications Center', path: '/notifications', icon: Bell },
        {
          name: 'User & Role Management',
          path: '/users',
          icon: Users,
          restrictedTo: ['MAINTENANCE_ADMIN']
        },
        {
          name: 'Audit Logs & Settings',
          path: '/audit-settings',
          icon: ShieldAlert,
          restrictedTo: ['MAINTENANCE_ADMIN', 'OPERATIONS_MANAGER']
        }
      ]
    }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col border-r border-slate-800 transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand / Logo Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-dairy-600 flex items-center justify-center text-white shadow-md shadow-dairy-600/30">
              <Milk className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white leading-tight">DairyReliability</h1>
              <p className="text-[10px] text-dairy-400 font-mono tracking-wide uppercase">Smart Asset Suite</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {navItems.map((group, idx) => {
            // Filter out items not accessible to the current role
            const accessibleItems = group.items.filter(
              (item) => !item.restrictedTo || item.restrictedTo.includes(role)
            );

            if (accessibleItems.length === 0) return null;

            return (
              <div key={idx} className="space-y-1">
                <p className="px-3 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                  {group.group}
                </p>
                {accessibleItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition group ${
                          isActive
                            ? 'bg-dairy-600 text-white shadow-sm shadow-dairy-600/20 font-semibold'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`
                      }
                    >
                      <div className="flex items-center space-x-2.5">
                        <Icon className="w-4 h-4 shrink-0 text-slate-400 group-hover:text-white transition" />
                        <span>{item.name}</span>
                      </div>
                      {item.badge && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-dairy-300 border border-slate-700">
                          {item.badge}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Cold-Chain Telemetry Live Pulse Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40">
          <div className="bg-slate-800/80 rounded-xl p-2.5 border border-slate-700/60 flex items-center justify-between shadow-2xs">
            <div className="flex items-center space-x-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <div>
                <span className="text-[11px] font-semibold text-slate-200 block leading-tight">IoT Cold-Chain Gateway</span>
                <span className="text-[9px] text-slate-400 font-mono">1,420 pings / min</span>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/70 px-2 py-0.5 rounded-md border border-emerald-800/50">
              ONLINE
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;

