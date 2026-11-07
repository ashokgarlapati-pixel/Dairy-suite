import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Kanban,
  Plus,
  RefreshCw,
  Clock,
  Wrench,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  ShieldCheck,
  ChevronRight,
  Filter,
  User,
  Package,
  ArrowUpRight,
  PauseCircle,
  SlidersHorizontal,
  X,
  Edit,
  AlertTriangle
} from 'lucide-react';
import workOrderApi from '../api/workOrderApi';
import assetApi from '../api/assetApi';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';
import WorkOrderFormModal from '../components/maintenance/WorkOrderFormModal';
import SupervisorVerificationModal from '../components/maintenance/SupervisorVerificationModal';

const KANBAN_COLUMNS = [
  { id: 'CREATED', title: '1. Created / Backlog', color: 'border-slate-300 text-slate-700 bg-slate-50' },
  { id: 'ASSIGNED', title: '2. Assigned / Queued', color: 'border-blue-300 text-blue-700 bg-blue-50/50' },
  { id: 'IN_PROGRESS', title: '3. In Progress', color: 'border-amber-300 text-amber-700 bg-amber-50/50' },
  { id: 'PENDING_APPROVAL', title: '4. Pending Sign-Off', color: 'border-purple-300 text-purple-700 bg-purple-50/50' },
  { id: 'CLOSED', title: '5. Completed & Verified', color: 'border-emerald-300 text-emerald-700 bg-emerald-50/50' }
];

export const MaintenancePlanningPage = () => {
  const { user } = useAuth();
  const [workOrders, setWorkOrders] = useState([]);
  const [assets, setAssets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [verificationTargetWO, setVerificationTargetWO] = useState(null);

  // Supervisor Action Modal state (Escalate, Defer, Override)
  const [actionModal, setActionModal] = useState({
    isOpen: false,
    type: null, // 'ESCALATE' | 'DEFER' | 'OVERRIDE'
    workOrder: null,
    reason: '',
    overridePriority: 'HIGH_P1',
    deferUntilDate: ''
  });
  const [isActionSubmitting, setIsActionSubmitting] = useState(false);

  const canVerify = user?.role === 'MAINTENANCE_ADMIN' || user?.role === 'OPERATIONS_MANAGER';
  const canModify = user?.role === 'MAINTENANCE_ADMIN' || user?.role === 'OPERATIONS_MANAGER';

  const fetchWorkOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [woRes, assetsRes] = await Promise.all([
        workOrderApi.getWorkOrders(),
        assetApi.getAssets({ limit: 50 }).catch(() => null)
      ]);

      if (woRes?.data) {
        setWorkOrders(woRes.data.workOrders || []);
      }
      if (assetsRes?.data?.assets) {
        setAssets(assetsRes.data.assets);
      }
    } catch (err) {
      console.error('Failed to load planning board:', err);
      setError(err.message || 'Unable to connect to planning service.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkOrders();
  }, [fetchWorkOrders]);

  const handleStatusTransition = async (woId, nextStatus) => {
    try {
      await workOrderApi.updateStatus(woId, nextStatus, `Advanced on Planning Board to ${nextStatus}`);
      fetchWorkOrders();
    } catch (err) {
      alert(`Status transition rejected: ${err.message}`);
    }
  };

  const handleOpenActionModal = (type, wo) => {
    setActionModal({
      isOpen: true,
      type,
      workOrder: wo,
      reason: '',
      overridePriority: wo.priority === 'CRITICAL_P0' ? 'HIGH_P1' : 'CRITICAL_P0',
      deferUntilDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });
  };

  const handleSubmitAction = async (e) => {
    e.preventDefault();
    if (!actionModal.reason.trim()) {
      alert('A clear reason is required for audit recording.');
      return;
    }

    setIsActionSubmitting(true);
    try {
      const wo = actionModal.workOrder;
      const updates = { reason: actionModal.reason.trim() };

      if (actionModal.type === 'ESCALATE') {
        updates.isEscalate = true;
        updates.priority = 'CRITICAL_P0';
      } else if (actionModal.type === 'DEFER') {
        updates.isDefer = true;
        updates.status = 'DEFERRED';
        if (actionModal.deferUntilDate) {
          updates.scheduledStartDate = actionModal.deferUntilDate;
        }
      } else if (actionModal.type === 'OVERRIDE') {
        updates.isOverride = true;
        updates.priority = actionModal.overridePriority;
      }

      await workOrderApi.updateWorkOrder(wo._id, updates);
      setActionModal({ isOpen: false, type: null, workOrder: null, reason: '', overridePriority: 'HIGH_P1', deferUntilDate: '' });
      fetchWorkOrders();
    } catch (err) {
      alert(`Action failed: ${err.message}`);
    } finally {
      setIsActionSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <span>Maintenance Planning & Closure Verification Board</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            End-to-end lifecycle matrix: technician assignment, required skills, spare parts availability, downtime planning & supervisor closure verification.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchWorkOrders}
            className="p-2.5 text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm transition-colors"
            title="Refresh Board"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-sky-600' : ''}`} />
          </button>

          {canModify && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-sm font-bold rounded-xl shadow-md transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create Work Order</span>
            </button>
          )}
        </div>
      </div>

      {/* Kanban Board Container */}
      {isLoading ? (
        <LoadingSkeleton count={5} />
      ) : error ? (
        <ErrorState
          title="Planning Board Failed to Load"
          message={error}
          onRetry={fetchWorkOrders}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 overflow-x-auto pb-4">
          {KANBAN_COLUMNS.map((col) => {
            const columnTickets = workOrders.filter((w) => w.status === col.id);

            return (
              <div
                key={col.id}
                className="bg-slate-50/80 rounded-2xl border border-slate-200 p-3.5 flex flex-col justify-between min-h-[540px]"
              >
                {/* Column Header */}
                <div>
                  <div className={`p-2.5 rounded-xl border font-bold text-xs flex items-center justify-between mb-3 ${col.color}`}>
                    <span>{col.title}</span>
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-white/70 shadow-2xs font-bold">
                      {columnTickets.length}
                    </span>
                  </div>

                  {/* Tickets List */}
                  <div className="space-y-3">
                    {columnTickets.length === 0 ? (
                      <div className="p-4 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-400">
                        No active tickets
                      </div>
                    ) : (
                      columnTickets.map((wo) => {
                        const isP0 = wo.priority === 'CRITICAL_P0';

                        return (
                          <div
                            key={wo._id || wo.workOrderNumber}
                            className={`bg-white p-3.5 rounded-xl border shadow-2xs space-y-2.5 transition-all hover:shadow-md ${
                              isP0 ? 'border-l-4 border-l-rose-500 border-rose-200' : 'border-slate-200'
                            }`}
                          >
                            {/* Card Header: WO Number & Priority */}
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-mono font-bold text-sky-700">
                                {wo.workOrderNumber}
                              </span>
                              <span
                                className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  isP0
                                    ? 'bg-rose-100 text-rose-700'
                                    : wo.priority === 'HIGH_P1'
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {wo.priority}
                              </span>
                            </div>

                            {/* Title */}
                            <h4 className="font-bold text-xs text-slate-900 leading-snug line-clamp-2">
                              {wo.title}
                            </h4>

                            {/* Target Asset & Downtime */}
                            <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
                              <span className="font-semibold text-slate-700 truncate max-w-[110px]">
                                {wo.assetId?.assetTag || wo.assetTag || 'Asset'}
                              </span>
                              <span className="text-slate-500 font-mono flex items-center space-x-1">
                                <Clock className="w-3 h-3 text-slate-400" />
                                <span>~{wo.estimatedDowntimeHours || 2}h downtime</span>
                              </span>
                            </div>

                            {/* Required Skills & Parts Availability */}
                            <div className="space-y-1 text-[10px] pt-1 border-t border-slate-50">
                              <div className="flex items-center space-x-1 text-slate-600 truncate">
                                <User className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="text-slate-400">Skill:</span>
                                <span className="font-semibold truncate">
                                  {wo.requiredSkills?.[0] || 'Dairy Certified Tech'}
                                </span>
                              </div>

                              <div className="flex items-center space-x-1 text-slate-600">
                                <Package className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="text-slate-400">Spares:</span>
                                <span className="font-semibold text-emerald-700">
                                  {wo.partsRequired?.length > 0
                                    ? `${wo.partsRequired.length} Parts Reserved (In Stock)`
                                    : 'Readiness Verified'}
                                </span>
                              </div>
                            </div>

                            {/* Supervisor Action Toolbar: Escalate, Defer, Override */}
                            {canModify && col.id !== 'CLOSED' && (
                              <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-[10px]">
                                {!isP0 && (
                                  <button
                                    onClick={() => handleOpenActionModal('ESCALATE', wo)}
                                    className="text-rose-600 hover:text-rose-800 font-bold flex items-center space-x-0.5"
                                    title="Escalate Priority to Critical P0"
                                  >
                                    <ArrowUpRight className="w-3 h-3" />
                                    <span>Escalate</span>
                                  </button>
                                )}
                                <button
                                  onClick={() => handleOpenActionModal('DEFER', wo)}
                                  className="text-slate-500 hover:text-slate-800 font-medium flex items-center space-x-0.5"
                                  title="Postpone / Defer Maintenance"
                                >
                                  <PauseCircle className="w-3 h-3" />
                                  <span>Defer</span>
                                </button>
                                <button
                                  onClick={() => handleOpenActionModal('OVERRIDE', wo)}
                                  className="text-sky-600 hover:text-sky-800 font-medium flex items-center space-x-0.5"
                                  title="Supervisor Override"
                                >
                                  <SlidersHorizontal className="w-3 h-3" />
                                  <span>Override</span>
                                </button>
                              </div>
                            )}

                            {/* Column specific primary lifecycle action buttons */}
                            <div className="pt-2 flex items-center justify-end gap-1.5 border-t border-slate-50">
                              {col.id === 'CREATED' && (
                                <button
                                  onClick={() => handleStatusTransition(wo._id, 'ASSIGNED')}
                                  className="px-2.5 py-1 text-[11px] font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors"
                                >
                                  Assign
                                </button>
                              )}

                              {col.id === 'ASSIGNED' && (
                                <button
                                  onClick={() => handleStatusTransition(wo._id, 'IN_PROGRESS')}
                                  className="px-2.5 py-1 text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
                                >
                                  Start Job
                                </button>
                              )}

                              {col.id === 'IN_PROGRESS' && (
                                <button
                                  onClick={() => handleStatusTransition(wo._id, 'PENDING_APPROVAL')}
                                  className="px-2.5 py-1 text-[11px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                                >
                                  Submit Review
                                </button>
                              )}

                              {col.id === 'PENDING_APPROVAL' && canVerify && (
                                <button
                                  onClick={() => setVerificationTargetWO(wo)}
                                  className="inline-flex items-center space-x-1 px-3 py-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm transition-all"
                                >
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                  <span>Verify & Sign</span>
                                </button>
                              )}

                              {col.id === 'CLOSED' && (
                                <span className="inline-flex items-center space-x-1 text-[10px] text-emerald-600 font-semibold">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Closure Verified</span>
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dispatch Modal */}
      <WorkOrderFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onWorkOrderCreated={() => fetchWorkOrders()}
        assets={assets}
      />

      {/* Supervisor Closure Verification Modal (Approve / Reject) */}
      <SupervisorVerificationModal
        isOpen={Boolean(verificationTargetWO)}
        onClose={() => setVerificationTargetWO(null)}
        onVerified={() => fetchWorkOrders()}
        workOrder={verificationTargetWO}
      />

      {/* Supervisor Material Decision Action Modal (Escalate, Defer, Override) */}
      {actionModal.isOpen && actionModal.workOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setActionModal({ isOpen: false, type: null, workOrder: null, reason: '', overridePriority: 'HIGH_P1', deferUntilDate: '' })}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2.5 mb-3">
              <div
                className={`p-2 rounded-xl text-white ${
                  actionModal.type === 'ESCALATE'
                    ? 'bg-rose-600'
                    : actionModal.type === 'DEFER'
                    ? 'bg-amber-600'
                    : 'bg-sky-600'
                }`}
              >
                {actionModal.type === 'ESCALATE' ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : actionModal.type === 'DEFER' ? (
                  <PauseCircle className="w-5 h-5" />
                ) : (
                  <SlidersHorizontal className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {actionModal.type === 'ESCALATE'
                    ? 'Escalate Priority to Critical P0'
                    : actionModal.type === 'DEFER'
                    ? 'Defer Maintenance Work Order'
                    : 'Supervisor Priority & Plan Override'}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  {actionModal.workOrder.workOrderNumber} • {actionModal.workOrder.assetTag || 'Asset'}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmitAction} className="space-y-4 pt-2">
              {actionModal.type === 'OVERRIDE' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Override Priority Level
                  </label>
                  <select
                    value={actionModal.overridePriority}
                    onChange={(e) => setActionModal({ ...actionModal, overridePriority: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white font-medium"
                  >
                    <option value="CRITICAL_P0">P0 - Critical</option>
                    <option value="HIGH_P1">P1 - High</option>
                    <option value="MEDIUM_P2">P2 - Medium</option>
                    <option value="LOW_P3">P3 - Low</option>
                  </select>
                </div>
              )}

              {actionModal.type === 'DEFER' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Postpone Schedule Until
                  </label>
                  <input
                    type="date"
                    value={actionModal.deferUntilDate}
                    onChange={(e) => setActionModal({ ...actionModal, deferUntilDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white font-medium"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mandatory Material Decision Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={actionModal.reason}
                  onChange={(e) => setActionModal({ ...actionModal, reason: e.target.value })}
                  placeholder={`State reason for ${actionModal.type.toLowerCase()} (Logged to immutable audit trail)...`}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500"
                  required
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Action, actor identity, timestamp, and previous/new values will be recorded in the immutable audit ledger.
                </p>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActionModal({ isOpen: false, type: null, workOrder: null, reason: '', overridePriority: 'HIGH_P1', deferUntilDate: '' })}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isActionSubmitting}
                  className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition shadow-sm disabled:opacity-50 ${
                    actionModal.type === 'ESCALATE'
                      ? 'bg-rose-600 hover:bg-rose-500'
                      : actionModal.type === 'DEFER'
                      ? 'bg-amber-600 hover:bg-amber-500'
                      : 'bg-sky-600 hover:bg-sky-500'
                  }`}
                >
                  {isActionSubmitting ? 'Recording...' : `Confirm ${actionModal.type}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenancePlanningPage;
