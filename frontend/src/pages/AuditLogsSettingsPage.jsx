import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  Sliders,
  FileText,
  Lock,
  Save,
  Clock,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Database,
  Building2,
  Cpu,
  Radio,
  Bell,
  Wrench,
  Thermometer,
  Layers,
  X,
  Eye,
  SlidersHorizontal
} from 'lucide-react';
import auditApi from '../api/auditApi';
import { useAuth } from '../context/AuthContext';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';

const ACTION_OPTIONS = [
  { value: '', label: 'All Action Types (11)' },
  { value: 'AUTHENTICATION', label: 'AUTHENTICATION' },
  { value: 'LOGIN', label: 'LOGIN' },
  { value: 'DATA_ACCESS', label: 'DATA_ACCESS' },
  { value: 'CREATE', label: 'CREATE' },
  { value: 'MODIFY', label: 'MODIFY' },
  { value: 'DELETE', label: 'DELETE' },
  { value: 'EXPORT', label: 'EXPORT' },
  { value: 'AI_EXECUTION', label: 'AI_EXECUTION' },
  { value: 'APPROVAL', label: 'APPROVAL' },
  { value: 'REJECTION', label: 'REJECTION' },
  { value: 'OVERRIDE', label: 'OVERRIDE' },
  { value: 'CONFIG_CHANGE', label: 'CONFIG_CHANGE' }
];

const ENTITY_OPTIONS = [
  { value: '', label: 'All Entity Types' },
  { value: 'Asset', label: 'Dairy Assets' },
  { value: 'WorkOrder', label: 'Work Orders' },
  { value: 'FailurePrediction', label: 'AI Predictions' },
  { value: 'Recommendation', label: 'AI Recommendations' },
  { value: 'User', label: 'User Directory' },
  { value: 'Report', label: 'Reliability Reports' },
  { value: 'SystemConfig', label: 'System Configurations' }
];

const ROLE_OPTIONS = [
  { value: '', label: 'All Roles' },
  { value: 'MAINTENANCE_ADMIN', label: 'Maintenance Admin' },
  { value: 'OPERATIONS_MANAGER', label: 'Operations Manager' },
  { value: 'TECHNICIAN', label: 'Field Technician' },
  { value: 'VENDOR', label: 'Equipment Vendor' },
  { value: 'SYSTEM', label: 'System Automation' }
];

const OUTCOME_OPTIONS = [
  { value: '', label: 'All Outcomes' },
  { value: 'SUCCESS', label: 'SUCCESS' },
  { value: 'FAILURE', label: 'FAILURE' },
  { value: 'ACCESS_DENIED', label: 'ACCESS_DENIED' }
];

export const AuditLogsSettingsPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('audit'); // 'audit' | 'settings'

  // Audit Logs State
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, totalPages: 1, total: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState('');
  const [zoneFilter, setZoneFilter] = useState('');
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [logError, setLogError] = useState(null);
  const [selectedLogForDiff, setSelectedLogForDiff] = useState(null);

  // Settings State across all 6 domains
  const [settingsSection, setSettingsSection] = useState('thresholds'); // thresholds, ai, workflow, masterData, integrations, notifications
  const [settings, setSettings] = useState({
    masterData: {
      equipmentCategories: ['BULK_MILK_COOLER', 'CHILLED_TANKER', 'PASTEURIZER', 'HOMOGENIZER', 'COLD_ROOM', 'PACKAGING_MACHINE'],
      approvedManufacturers: ['AlphaLaval', 'GEA Westfalia', 'TetraPak', 'Frick India', 'Kirloskar'],
      preventiveIntervalHours: 720
    },
    workflowRules: {
      unassignedWorkOrderEscalationHours: 12,
      requireDualSupervisorSignoffP0: true,
      autoDispatchEmergencyP0: true,
      minTechnicianCertificationLevel: 'LEVEL_2_CERTIFIED'
    },
    thresholds: {
      milkQualityCeilingTemp: 4.0,
      pasteurizerHoldingTemp: 72.0,
      minCipFlowRateLMin: 120.0,
      maxDifferentialPressureBar: 1.8,
      condenserPressureLimitBar: 22.0
    },
    aiSettings: {
      defaultModel: 'Gemini-2.5-Flash / DairyPhysics-v2.5',
      minAiConfidenceThreshold: 75,
      rulWarningThresholdDays: 14,
      anomalySensitivity: 0.85,
      driftRetrainingTrigger: 0.15
    },
    integrations: {
      scadaOpcEndpoint: 'opc.tcp://scada.dairycoop.org:4840',
      telemetryHeartbeatSeconds: 60,
      tankerGpsWebhook: 'https://telemetry.dairycoop.org/api/v1/tankers/webhook',
      erpSyncIntervalMinutes: 15
    },
    notificationRules: {
      enableAutomatedSmsAlerts: true,
      emailDigestTime: '07:00 IST',
      pushOnSupervisorSignoff: true,
      autoEscalateUnacknowledgedMins: 30
    }
  });

  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsNotice, setSettingsNotice] = useState('');

  const fetchAuditLogs = useCallback(async () => {
    setIsLoadingLogs(true);
    setLogError(null);
    try {
      const res = await auditApi.getAuditLogs({
        page: pagination.page,
        limit: pagination.limit,
        action: actionFilter || undefined,
        resourceType: entityFilter || undefined,
        actorRole: roleFilter || undefined,
        outcome: outcomeFilter || undefined,
        cooperativeZone: zoneFilter || undefined,
        search: searchQuery.trim() || undefined
      });
      if (res?.data) {
        setLogs(res.data.logs || []);
        if (res.data.pagination) {
          setPagination((prev) => ({ ...prev, ...res.data.pagination }));
        }
      }
    } catch (err) {
      console.error('Failed to load audit trail:', err);
      setLogError(err.message || 'Unable to retrieve immutable audit logs.');
    } finally {
      setIsLoadingLogs(false);
    }
  }, [pagination.page, pagination.limit, actionFilter, entityFilter, roleFilter, outcomeFilter, zoneFilter, searchQuery]);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await auditApi.getSettings();
      if (res?.data?.settings) {
        setSettings((prev) => ({
          ...prev,
          ...res.data.settings,
          thresholds: { ...prev.thresholds, ...(res.data.settings.thresholds || {}) },
          aiSettings: { ...prev.aiSettings, ...(res.data.settings.aiSettings || {}) },
          workflowRules: { ...prev.workflowRules, ...(res.data.settings.workflowRules || {}) },
          masterData: { ...prev.masterData, ...(res.data.settings.masterData || {}) },
          integrations: { ...prev.integrations, ...(res.data.settings.integrations || {}) },
          notificationRules: { ...prev.notificationRules, ...(res.data.settings.notificationRules || {}) }
        }));
      }
    } catch (err) {
      console.warn('Failed to load settings:', err);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'audit') {
      fetchAuditLogs();
    } else {
      fetchSettings();
    }
  }, [activeTab, fetchAuditLogs, fetchSettings]);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setSettingsNotice('');

    try {
      const res = await auditApi.updateSettings({
        ...settings,
        reason: 'Master system operational thresholds, AI models, and rules updated by Admin'
      });
      if (res?.data?.settings) {
        setSettings((prev) => ({ ...prev, ...res.data.settings }));
      }
      setSettingsNotice('Configuration saved successfully. Immutable CONFIG_CHANGE audit event recorded.');
      setTimeout(() => setSettingsNotice(''), 4500);
    } catch (err) {
      alert(`Failed to save settings: ${err.message}`);
    } finally {
      setIsSavingSettings(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <span>Audit Logs & System Governance Hub</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Tamper-proof append-only audit trail and master cooperative reliability configurations across all 6 domains.
          </p>
        </div>

        <button
          onClick={() => (activeTab === 'audit' ? fetchAuditLogs() : fetchSettings())}
          className="p-2.5 text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-2xs transition-colors self-start sm:self-auto"
          title="Refresh Feed"
        >
          <RefreshCw className={`w-4 h-4 ${isLoadingLogs ? 'animate-spin text-sky-600' : ''}`} />
        </button>
      </div>

      {/* Primary Switcher Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('audit')}
          className={`inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'audit'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>Immutable Audit Trail Ledger</span>
        </button>

        {user?.role === 'MAINTENANCE_ADMIN' && (
          <button
            onClick={() => setActiveTab('settings')}
            className={`inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'settings'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Master System Settings & Governance</span>
          </button>
        )}
      </div>

      {activeTab === 'audit' ? (
        /* Tab 1: Audit Logs View */
        <div className="space-y-4">
          {/* Append-Only Immutability Guarantee Banner */}
          <div className="p-4 bg-slate-900 text-white rounded-2xl flex items-start space-x-3 text-xs shadow-md">
            <Database className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-sm block">Append-Only Immutability Architecture</span>
              <p className="text-slate-300 mt-0.5 leading-relaxed">
                Audit logs are strictly non-editable and cannot be deleted by any user or administrator. Every authentication event, work order state advance, AI recommendation review, and configuration change is permanently logged with IP address and previous/new state diffs.
              </p>
            </div>
          </div>

          {/* Multi-Filter Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
              {/* Action Filter */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Action Type</label>
                <select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-800 font-semibold"
                >
                  {ACTION_OPTIONS.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Entity / Resource Filter */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Entity Domain</label>
                <select
                  value={entityFilter}
                  onChange={(e) => setEntityFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-800 font-semibold"
                >
                  {ENTITY_OPTIONS.map((e) => (
                    <option key={e.value} value={e.value}>
                      {e.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Role Filter */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Actor Role</label>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-800 font-semibold"
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Outcome Filter */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Outcome</label>
                <select
                  value={outcomeFilter}
                  onChange={(e) => setOutcomeFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-800 font-semibold"
                >
                  {OUTCOME_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Scope Zone Filter */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Org Zone</label>
                <select
                  value={zoneFilter}
                  onChange={(e) => setZoneFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-800 font-semibold"
                >
                  <option value="">All Zones</option>
                  <option value="ALL">Entire Federation (ALL)</option>
                  <option value="Southern District Union">Southern District Union</option>
                  <option value="Mysore District Union">Mysore District Union</option>
                  <option value="Mandya Chilling Zone">Mandya Chilling Zone</option>
                </select>
              </div>

              {/* Keyword Search */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Search Keywords</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Actor, ID, or reason..."
                    className="w-full pl-8 pr-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Audit Logs Table */}
          {isLoadingLogs ? (
            <LoadingSkeleton count={5} />
          ) : logError ? (
            <ErrorState title="Audit Ledger Error" message={logError} onRetry={fetchAuditLogs} />
          ) : logs.length === 0 ? (
            <EmptyState title="No Audit Records" message="No audit records match the selected filter criteria." />
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200 text-[10px]">
                    <tr>
                      <th className="py-3.5 px-4">Timestamp</th>
                      <th className="py-3.5 px-4">Actor</th>
                      <th className="py-3.5 px-4">Action</th>
                      <th className="py-3.5 px-4">Entity</th>
                      <th className="py-3.5 px-4">Outcome</th>
                      <th className="py-3.5 px-4">Operational Reason</th>
                      <th className="py-3.5 px-4 text-right">State Diff</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {logs.map((log) => {
                      const isSuccess = log.outcome === 'SUCCESS';
                      let actionColor = 'bg-slate-100 text-slate-700';
                      if (log.action === 'CREATE') actionColor = 'bg-emerald-100 text-emerald-800';
                      else if (log.action === 'MODIFY') actionColor = 'bg-blue-100 text-blue-800';
                      else if (log.action === 'DELETE') actionColor = 'bg-rose-100 text-rose-800';
                      else if (log.action === 'APPROVAL') actionColor = 'bg-purple-100 text-purple-800';
                      else if (log.action === 'REJECTION') actionColor = 'bg-rose-100 text-rose-800';
                      else if (log.action === 'OVERRIDE') actionColor = 'bg-amber-100 text-amber-800';
                      else if (log.action === 'AI_EXECUTION') actionColor = 'bg-indigo-100 text-indigo-800';
                      else if (log.action === 'CONFIG_CHANGE') actionColor = 'bg-teal-100 text-teal-800';
                      else if (log.action === 'EXPORT') actionColor = 'bg-sky-100 text-sky-800';

                      return (
                        <tr
                          key={log._id || log.logId}
                          onClick={() => setSelectedLogForDiff(log)}
                          className="hover:bg-sky-50/50 cursor-pointer transition-colors"
                        >
                          <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                            <div>{new Date(log.timestamp).toLocaleDateString()}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900">{log.actorName}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{log.actorRole}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded ${actionColor}`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-mono font-semibold text-slate-800">{log.resourceType}</div>
                            <div className="text-[10px] text-slate-400 font-mono truncate max-w-[120px]">
                              {log.resourceId || 'N/A'}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                                isSuccess
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-rose-50 text-rose-700'
                              }`}
                            >
                              <span>{log.outcome}</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 text-xs max-w-xs truncate">
                            {log.reason || 'Standard transaction logged'}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedLogForDiff(log);
                              }}
                              className="text-sky-600 hover:text-sky-800 text-xs font-bold"
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pagination */}
          {pagination.total > 0 && (
            <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
              <span>Total {pagination.total} immutable audit records stored</span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                  disabled={pagination.page <= 1}
                  className="p-2 border border-slate-200 rounded-lg disabled:opacity-40"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="font-bold">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => setPagination((prev) => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
                  disabled={pagination.page >= pagination.totalPages}
                  className="p-2 border border-slate-200 rounded-lg disabled:opacity-40"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Tab 2: Master System Settings View across all 6 domains */
        <div className="space-y-6">
          {/* Settings Section Sub-Tabs */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-2 border-b border-slate-100 text-xs font-bold">
            {[
              { id: 'thresholds', label: '1. Food Safety Thresholds', icon: Thermometer },
              { id: 'ai', label: '2. AI & Model Parameters', icon: Cpu },
              { id: 'workflow', label: '3. Workflow & Escalations', icon: Wrench },
              { id: 'masterData', label: '4. Master Data Catalog', icon: Layers },
              { id: 'integrations', label: '5. SCADA & ERP Integrations', icon: Radio },
              { id: 'notifications', label: '6. Notification Delivery Rules', icon: Bell }
            ].map((sec) => {
              const Icon = sec.icon;
              return (
                <button
                  key={sec.id}
                  onClick={() => setSettingsSection(sec.id)}
                  className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl whitespace-nowrap transition-all ${
                    settingsSection === sec.id
                      ? 'bg-sky-600 text-white shadow-2xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{sec.label}</span>
                </button>
              );
            })}
          </div>

          {settingsNotice && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{settingsNotice}</span>
            </div>
          )}

          <form onSubmit={handleSaveSettings} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6 max-w-3xl">
            {/* Section 1: Food Safety Thresholds */}
            {settingsSection === 'thresholds' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Food Safety & Operational Limits</h3>
                  <p className="text-xs text-slate-500">Statutory parameters for cold-chain chilling and thermal pasteurization</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Raw Milk Maximum Temperature Alarm Ceiling (°C)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={settings.thresholds.milkQualityCeilingTemp}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          thresholds: { ...settings.thresholds, milkQualityCeilingTemp: parseFloat(e.target.value) }
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">Milk above 4.0°C triggers immediate cold-chain alarms</span>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Pasteurizer Minimum Holding Temperature (°C)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={settings.thresholds.pasteurizerHoldingTemp}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          thresholds: { ...settings.thresholds, pasteurizerHoldingTemp: parseFloat(e.target.value) }
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Minimum CIP Cleaning Flow Rate (L/min)
                    </label>
                    <input
                      type="number"
                      value={settings.thresholds.minCipFlowRateLMin}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          thresholds: { ...settings.thresholds, minCipFlowRateLMin: parseFloat(e.target.value) }
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Max Homogenizer Differential Pressure (Bar)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={settings.thresholds.maxDifferentialPressureBar}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          thresholds: { ...settings.thresholds, maxDifferentialPressureBar: parseFloat(e.target.value) }
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Section 2: AI Settings */}
            {settingsSection === 'ai' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">AI Diagnostic & RUL Parameters</h3>
                  <p className="text-xs text-slate-500">Google Gemini model versioning, confidence barriers, and drift retraining rules</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Default AI Reasoning Engine</label>
                    <input
                      type="text"
                      value={settings.aiSettings.defaultModel}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          aiSettings: { ...settings.aiSettings, defaultModel: e.target.value }
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Minimum AI Predictive Confidence Gate (%)
                    </label>
                    <input
                      type="number"
                      value={settings.aiSettings.minAiConfidenceThreshold}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          aiSettings: { ...settings.aiSettings, minAiConfidenceThreshold: parseInt(e.target.value, 10) }
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      RUL Warning Window Threshold (Days)
                    </label>
                    <input
                      type="number"
                      value={settings.aiSettings.rulWarningThresholdDays}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          aiSettings: { ...settings.aiSettings, rulWarningThresholdDays: parseInt(e.target.value, 10) }
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Model Drift Retraining Trigger Score
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={settings.aiSettings.driftRetrainingTrigger}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          aiSettings: { ...settings.aiSettings, driftRetrainingTrigger: parseFloat(e.target.value) }
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Section 3: Workflow Rules */}
            {settingsSection === 'workflow' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Maintenance Workflow Rules</h3>
                  <p className="text-xs text-slate-500">Escalation thresholds and supervisor sign-off mandates</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Unassigned Work Order Escalation Timeline (Hours)
                    </label>
                    <input
                      type="number"
                      value={settings.workflowRules.unassignedWorkOrderEscalationHours}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          workflowRules: { ...settings.workflowRules, unassignedWorkOrderEscalationHours: parseInt(e.target.value, 10) }
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>

                  <div className="flex flex-col justify-center space-y-2 pt-2">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.workflowRules.requireDualSupervisorSignoffP0}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            workflowRules: { ...settings.workflowRules, requireDualSupervisorSignoffP0: e.target.checked }
                          })
                        }
                        className="rounded text-sky-600 focus:ring-sky-500"
                      />
                      <span className="font-semibold text-slate-700">Require Supervisor Closure Sign-Off for P0</span>
                    </label>

                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.workflowRules.autoDispatchEmergencyP0}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            workflowRules: { ...settings.workflowRules, autoDispatchEmergencyP0: e.target.checked }
                          })
                        }
                        className="rounded text-sky-600 focus:ring-sky-500"
                      />
                      <span className="font-semibold text-slate-700">Auto-Dispatch Emergency Work Orders on Thermal Breach</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Section 4: Master Data */}
            {settingsSection === 'masterData' && (
              <div className="space-y-4 text-xs">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Cooperative Master Data Specifications</h3>
                  <p className="text-xs text-slate-500">Equipment taxonomy and certified OEM manufacturers</p>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Supported Equipment Categories (6)</div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {settings.masterData.equipmentCategories.map((c) => (
                      <span key={c} className="px-2 py-0.5 bg-sky-100 text-sky-800 rounded font-mono font-bold text-[10px]">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Approved Manufacturers Directory</div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {settings.masterData.approvedManufacturers.map((m) => (
                      <span key={m} className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-semibold text-[10px]">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Section 5: Integrations */}
            {settingsSection === 'integrations' && (
              <div className="space-y-4 text-xs">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Telemetry & External Integrations</h3>
                  <p className="text-xs text-slate-500">SCADA OPC-UA endpoints, GPS webhooks, and ERP synchronization</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">SCADA / PLC Gateway Endpoint</label>
                    <input
                      type="text"
                      value={settings.integrations.scadaOpcEndpoint}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          integrations: { ...settings.integrations, scadaOpcEndpoint: e.target.value }
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Tanker GPS & Thermal Webhook URL</label>
                    <input
                      type="text"
                      value={settings.integrations.tankerGpsWebhook}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          integrations: { ...settings.integrations, tankerGpsWebhook: e.target.value }
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Section 6: Notifications */}
            {settingsSection === 'notifications' && (
              <div className="space-y-4 text-xs">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Notification Delivery Rules</h3>
                  <p className="text-xs text-slate-500">Automated SMS, push notification rules, and email digests</p>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center space-x-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={settings.notificationRules.enableAutomatedSmsAlerts}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          notificationRules: { ...settings.notificationRules, enableAutomatedSmsAlerts: e.target.checked }
                        })
                      }
                      className="rounded text-sky-600 focus:ring-sky-500"
                    />
                    <span className="font-semibold text-slate-700">Enable Automated SMS Alerts for Critical P0 Souring Hazards</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={settings.notificationRules.pushOnSupervisorSignoff}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          notificationRules: { ...settings.notificationRules, pushOnSupervisorSignoff: e.target.checked }
                        })
                      }
                      className="rounded text-sky-600 focus:ring-sky-500"
                    />
                    <span className="font-semibold text-slate-700">Immediate In-App Push on Supervisor Sign-Off Request</span>
                  </label>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-4 border-t border-slate-200 flex justify-end">
              <button
                type="submit"
                disabled={isSavingSettings}
                className="inline-flex items-center space-x-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-md transition-all disabled:opacity-50 text-xs"
              >
                <Save className="w-4 h-4" />
                <span>{isSavingSettings ? 'Saving...' : 'Save Configuration & Log Audit'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* State Diff / JSON Inspection Modal */}
      {selectedLogForDiff && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[85vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-sky-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Audit Transaction Record #{selectedLogForDiff.logId || selectedLogForDiff._id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedLogForDiff(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono text-[11px]">
                <div><span className="text-slate-400">Actor:</span> <span className="font-bold text-slate-800">{selectedLogForDiff.actorName}</span></div>
                <div><span className="text-slate-400">Role:</span> <span className="font-bold text-slate-800">{selectedLogForDiff.actorRole}</span></div>
                <div><span className="text-slate-400">Action:</span> <span className="font-bold text-sky-700">{selectedLogForDiff.action}</span></div>
                <div><span className="text-slate-400">Outcome:</span> <span className="font-bold text-emerald-700">{selectedLogForDiff.outcome}</span></div>
                <div><span className="text-slate-400">IP:</span> <span>{selectedLogForDiff.ipAddress}</span></div>
                <div><span className="text-slate-400">Timestamp:</span> <span>{new Date(selectedLogForDiff.timestamp).toLocaleString()}</span></div>
              </div>

              <div>
                <span className="font-bold text-slate-700 block mb-1">Operational Justification / Reason:</span>
                <p className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-700 leading-relaxed">
                  {selectedLogForDiff.reason}
                </p>
              </div>

              {selectedLogForDiff.previousState && (
                <div>
                  <span className="font-bold text-slate-700 block mb-1">Previous State:</span>
                  <pre className="bg-slate-900 text-rose-300 p-3 rounded-xl overflow-x-auto text-[10px] font-mono">
                    {JSON.stringify(selectedLogForDiff.previousState, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLogForDiff.newState && (
                <div>
                  <span className="font-bold text-slate-700 block mb-1">New State:</span>
                  <pre className="bg-slate-900 text-emerald-300 p-3 rounded-xl overflow-x-auto text-[10px] font-mono">
                    {JSON.stringify(selectedLogForDiff.newState, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedLogForDiff(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800"
              >
                Close Audit Inspection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogsSettingsPage;
