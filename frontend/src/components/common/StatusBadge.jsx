import React from 'react';

const statusConfig = {
  // Operational Statuses
  OPERATIONAL: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Operational' },
  WARNING: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'Warning' },
  CRITICAL_FAULT: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', label: 'Critical Fault' },
  UNDER_MAINTENANCE: { bg: 'bg-dairy-50', text: 'text-dairy-700', border: 'border-dairy-200', label: 'In Maintenance' },
  DECOMMISSIONED: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-300', label: 'Decommissioned' },

  // Risk Levels
  LOW: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Low Risk' },
  MEDIUM: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'Medium Risk' },
  HIGH: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', label: 'High Risk' },
  CRITICAL: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', label: 'Critical Risk' },

  // Work Order Statuses
  CREATED: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', label: 'Created' },
  ASSIGNED: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: 'Assigned' },
  IN_PROGRESS: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', label: 'In Progress' },
  PENDING_APPROVAL: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', label: 'Pending Approval' },
  APPROVED: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Approved' },
  COMPLETED: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', label: 'Completed' },
  CLOSED: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-300', label: 'Closed' },
  REJECTED: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', label: 'Rejected' },
  DEFERRED: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'Deferred' },
  ESCALATED: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', label: 'Escalated' },

  // Criticality
  CRITICAL_P0: { bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-300', label: 'P0 Critical' },
  HIGH_P1: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300', label: 'P1 High' },
  MEDIUM_P2: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300', label: 'P2 Medium' },
  LOW_P3: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300', label: 'P3 Low' }
};

export const StatusBadge = ({ status, className = '' }) => {
  const config = statusConfig[status] || {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
    label: status
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.bg} ${config.text} ${config.border} ${className}`}
    >
      <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-current opacity-75"></span>
      {config.label}
    </span>
  );
};

export default StatusBadge;

