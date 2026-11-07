import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  Clock,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Play,
  FileCheck2,
  User,
  MapPin,
  RefreshCw,
  Plus,
  Layers,
  ChevronRight,
  ShieldAlert,
  ShieldCheck,
  Camera,
  Mic,
  Eye,
  X,
  ExternalLink,
  Filter,
  TrendingDown,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import workOrderApi from '../api/workOrderApi';
import assetApi from '../api/assetApi';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';
import WorkOrderFormModal from '../components/maintenance/WorkOrderFormModal';
import EvidenceUploadModal from '../components/maintenance/EvidenceUploadModal';

export const MaintenanceCalendarPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isTechnician = user?.role === 'TECHNICIAN';

  const [activeTab, setActiveTab] = useState(isTechnician ? 'queue' : 'calendar');
  const [workOrders, setWorkOrders] = useState([]);
  const [assets, setAssets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter state for technician queue
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [evidenceTargetWO, setEvidenceTargetWO] = useState(null);
  const [drillDownWO, setDrillDownWO] = useState(null);

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
      console.error('Failed to fetch work orders:', err);
      setError(err.message || 'Unable to load maintenance calendar.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkOrders();
  }, [fetchWorkOrders]);

  const handleStartJob = async (woId) => {
    try {
      await workOrderApi.updateStatus(woId, 'IN_PROGRESS', 'Technician initiated maintenance work');
      fetchWorkOrders();
    } catch (err) {
      alert(`Failed to start job: ${err.message}`);
    }
  };

  // Filtered queue items
  const filteredWorkOrders = useMemo(() => {
    if (statusFilter === 'ALL') return workOrders;
    if (statusFilter === 'CRITICAL') return workOrders.filter((w) => w.priority === 'CRITICAL_P0');
    if (statusFilter === 'WARNING') return workOrders.filter((w) => w.priority === 'HIGH_P1');
    if (statusFilter === 'NORMAL') return workOrders.filter((w) => w.status === 'CREATED' || w.status === 'ASSIGNED');
    if (statusFilter === 'IN_PROGRESS') return workOrders.filter((w) => w.status === 'IN_PROGRESS');
    if (statusFilter === 'PENDING_APPROVAL') return workOrders.filter((w) => w.status === 'PENDING_APPROVAL');
    if (statusFilter === 'APPROVED') return workOrders.filter((w) => w.status === 'APPROVED');
    if (statusFilter === 'REJECTED') return workOrders.filter((w) => w.status === 'REJECTED');
    if (statusFilter === 'CLOSED') return workOrders.filter((w) => w.status === 'CLOSED');
    return workOrders;
  }, [workOrders, statusFilter]);

  const scheduledJobs = useMemo(() => {
    return workOrders.filter((w) => w.scheduledStartDate);
  }, [workOrders]);

  // Downtime analytics
  const downtimeAnalytics = useMemo(() => {
    const totalDowntimeHours = workOrders.reduce((sum, w) => sum + (w.estimatedDowntimeHours || 0), 0);
    const avgDowntime = workOrders.length > 0 ? (totalDowntimeHours / workOrders.length).toFixed(1) : 0;
    const criticalAlarms = workOrders.filter((w) => w.priority === 'CRITICAL_P0').length;
    const pendingReviews = workOrders.filter((w) => w.status === 'PENDING_APPROVAL').length;
    const completedJobs = workOrders.filter((w) => w.status === 'CLOSED' || w.status === 'APPROVED').length;

    return {
      totalDowntimeHours,
      avgDowntime,
      criticalAlarms,
      pendingReviews,
      completedJobs,
      availabilityIndex: 98.4
    };
  }, [workOrders]);

  return (
    <div className="space-y-6 pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <span>Maintenance Calendar & Technician Queue</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Preventive schedules, failure-risk breakdown alerts, mobile evidence capture, and technician task queues.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchWorkOrders}
            className="p-2.5 text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-sky-600' : ''}`} />
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-sm font-bold rounded-xl shadow-md transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule Work Order</span>
          </button>
        </div>
      </div>

      {/* Downtime & Operational Analytics Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Projected Stoppage</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline space-x-1 mt-1">
            <span className="text-2xl font-black text-slate-900 font-mono">{downtimeAnalytics.totalDowntimeHours}</span>
            <span className="text-xs text-slate-500 font-bold">Hours</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Avg {downtimeAnalytics.avgDowntime}h per work order</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Failure-Risk Alarms</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="flex items-baseline space-x-1 mt-1">
            <span className="text-2xl font-black text-rose-600 font-mono">{downtimeAnalytics.criticalAlarms}</span>
            <span className="text-xs text-rose-500 font-bold">Critical P0</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">AI trigger breakdown risk</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pending Reviews</span>
            <FileCheck2 className="w-4 h-4 text-sky-500" />
          </div>
          <div className="flex items-baseline space-x-1 mt-1">
            <span className="text-2xl font-black text-sky-600 font-mono">{downtimeAnalytics.pendingReviews}</span>
            <span className="text-xs text-slate-500 font-bold">Awaiting sign-off</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Technician evidence submitted</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Cold-Chain Availability</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline space-x-1 mt-1">
            <span className="text-2xl font-black text-emerald-600 font-mono">{downtimeAnalytics.availabilityIndex}%</span>
            <span className="text-xs text-emerald-600 font-bold">Target &gt;98%</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">{downtimeAnalytics.completedJobs} maintenance cycles closed</span>
        </div>
      </div>

      {/* View Switcher Tabs & Filter Toolbar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('queue')}
              className={`inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'queue'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <Wrench className="w-4 h-4" />
              <span>Technician Queue (Active Tasks)</span>
              <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-sky-500/30 text-sky-300">
                {workOrders.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('calendar')}
              className={`inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'calendar'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <CalendarIcon className="w-4 h-4" />
              <span>Preventive Calendar Schedule</span>
              <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-slate-200 text-slate-700">
                {scheduledJobs.length}
              </span>
            </button>
          </div>
        </div>

        {/* Status Filters: Normal, Warning, Critical, Pending Review, Approved, Rejected, Completed */}
        {activeTab === 'queue' && (
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center">
              <Filter className="w-3 h-3 mr-1" />
              Status:
            </span>
            {[
              { id: 'ALL', label: 'All Items' },
              { id: 'NORMAL', label: 'Normal / Scheduled', badge: 'bg-slate-100 text-slate-700' },
              { id: 'WARNING', label: 'Warning (P1)', badge: 'bg-amber-100 text-amber-700' },
              { id: 'CRITICAL', label: 'Critical (P0)', badge: 'bg-rose-100 text-rose-700' },
              { id: 'IN_PROGRESS', label: 'In Progress', badge: 'bg-blue-100 text-blue-700' },
              { id: 'PENDING_APPROVAL', label: 'Pending Review', badge: 'bg-purple-100 text-purple-700' },
              { id: 'APPROVED', label: 'Approved', badge: 'bg-emerald-100 text-emerald-700' },
              { id: 'REJECTED', label: 'Rejected', badge: 'bg-rose-100 text-rose-700' },
              { id: 'CLOSED', label: 'Completed', badge: 'bg-slate-100 text-slate-600' }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  statusFilter === f.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <LoadingSkeleton count={4} />
      ) : error ? (
        <ErrorState
          title="Failed to Load Maintenance Queue"
          message={error}
          onRetry={fetchWorkOrders}
        />
      ) : activeTab === 'queue' ? (
        /* Technician Prioritized Queue View */
        filteredWorkOrders.length === 0 ? (
          <EmptyState
            title="No Work Orders Match Filter"
            message="No maintenance tasks found matching the selected state filter."
            actionLabel="Reset Filter"
            onAction={() => setStatusFilter('ALL')}
          />
        ) : (
          <div className="space-y-4">
            {filteredWorkOrders.map((wo) => {
              const isP0 = wo.priority === 'CRITICAL_P0';
              const isP1 = wo.priority === 'HIGH_P1';
              return (
                <div
                  key={wo._id || wo.workOrderNumber}
                  className={`bg-white rounded-2xl border p-5 shadow-sm transition-all hover:shadow-md ${
                    isP0
                      ? 'border-l-4 border-l-rose-500 border-slate-200'
                      : isP1
                      ? 'border-l-4 border-l-amber-500 border-slate-200'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Identity & Details */}
                    <div className="space-y-2 max-w-3xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-bold text-xs text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-md border border-sky-200">
                          {wo.workOrderNumber}
                        </span>
                        <span
                          className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded-md ${
                            isP0
                              ? 'bg-rose-100 text-rose-700'
                              : isP1
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {wo.priority}
                        </span>
                        <StatusBadge status={wo.status} />
                        {wo.source === 'AI_PREDICTIVE_TRIGGER' && (
                          <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 text-[10px] font-bold tracking-wider">
                            AI PREDICTIVE TRIGGER
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-slate-900">{wo.title}</h3>
                      <p className="text-xs text-slate-600 line-clamp-2">{wo.description}</p>

                      {/* Equipment Tag & Location */}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                        <span className="font-semibold text-slate-800">
                          Target Asset: {wo.assetId?.assetTag || wo.assetTag || 'Asset'}
                        </span>
                        <span>•</span>
                        <span className="flex items-center space-x-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{wo.assetId?.location?.facilityName || 'Central Processing Plant'}</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>Est. {wo.estimatedDowntimeHours || 2}h downtime</span>
                        </span>
                      </div>
                    </div>

                    {/* Right: Actions & Drill-Down Button */}
                    <div className="flex items-center space-x-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                      {wo.status === 'ASSIGNED' || wo.status === 'CREATED' ? (
                        <button
                          onClick={() => handleStartJob(wo._id)}
                          className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Start Job</span>
                        </button>
                      ) : wo.status === 'IN_PROGRESS' ? (
                        <button
                          onClick={() => setEvidenceTargetWO(wo)}
                          className="inline-flex items-center space-x-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                        >
                          <FileCheck2 className="w-3.5 h-3.5" />
                          <span>Submit Evidence</span>
                        </button>
                      ) : wo.status === 'PENDING_APPROVAL' ? (
                        <span className="px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-xs font-bold">
                          Pending Review
                        </span>
                      ) : wo.status === 'APPROVED' || wo.status === 'CLOSED' ? (
                        <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold flex items-center space-x-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Completed</span>
                        </span>
                      ) : null}

                      {/* Drill-down Button */}
                      <button
                        onClick={() => setDrillDownWO(wo)}
                        className="inline-flex items-center space-x-1 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                        title="Inspect Evidence & Checklist"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>

                      <button
                        onClick={() => navigate('/planning')}
                        className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
                        title="View in Planning Board"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* Calendar Schedule Matrix */
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Scheduled Preventive & Predictive Maintenance Cycles
              </h2>
              <p className="text-xs text-slate-500">
                Upcoming equipment shutdowns synchronized with milk chilling and dispatch schedules
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-sky-700 bg-sky-50 px-3 py-1 rounded-lg">
              {scheduledJobs.length} Events Scheduled
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {scheduledJobs.map((wo) => (
              <div
                key={wo._id}
                onClick={() => setDrillDownWO(wo)}
                className="p-4 rounded-xl border border-slate-200 hover:border-sky-300 transition-all space-y-2 bg-slate-50/50 cursor-pointer group"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-sky-700 group-hover:underline">{wo.workOrderNumber}</span>
                  <StatusBadge status={wo.status} />
                </div>
                <h4 className="font-bold text-sm text-slate-900">{wo.title}</h4>
                <p className="text-xs text-slate-500 line-clamp-2">{wo.description}</p>
                <div className="pt-2 border-t border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                  <span className="font-semibold">{wo.assetTag || 'Asset'}</span>
                  <span className="text-slate-400 font-mono">
                    {new Date(wo.scheduledStartDate).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dispatch Modal */}
      <WorkOrderFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onWorkOrderCreated={() => fetchWorkOrders()}
        assets={assets}
      />

      {/* Evidence Upload Modal */}
      <EvidenceUploadModal
        isOpen={Boolean(evidenceTargetWO)}
        onClose={() => setEvidenceTargetWO(null)}
        onEvidenceSubmitted={() => fetchWorkOrders()}
        workOrder={evidenceTargetWO}
      />

      {/* Record Drill-Down & Supporting Evidence Drawer Modal */}
      {drillDownWO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-r from-slate-900 to-sky-950 text-white">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-sky-500/20 text-sky-400 rounded-lg">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Record Inspection & Evidence Drill-Down</h2>
                  <p className="text-xs text-slate-300 font-mono">
                    {drillDownWO.workOrderNumber} • {drillDownWO.assetTag || 'Asset'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDrillDownWO(null)}
                className="p-2 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto text-xs">
              {/* Status and Priority Banner */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Current State</span>
                  <div className="mt-1 flex items-center space-x-2">
                    <StatusBadge status={drillDownWO.status} />
                    <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                      {drillDownWO.priority}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Estimated Stoppage</span>
                  <span className="font-mono font-bold text-slate-800 text-sm">
                    {drillDownWO.estimatedDowntimeHours || 2} Hours
                  </span>
                </div>
              </div>

              {/* Title & Description */}
              <div>
                <h3 className="text-sm font-bold text-slate-900">{drillDownWO.title}</h3>
                <p className="text-slate-600 mt-1 leading-relaxed">{drillDownWO.description}</p>
              </div>

              {/* Inspection Checklist Results */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center space-x-1.5">
                  <FileCheck2 className="w-4 h-4 text-sky-600" />
                  <span>Quality & Safety Inspection Checklist</span>
                </span>
                {drillDownWO.evidence?.checklistResults && drillDownWO.evidence.checklistResults.length > 0 ? (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                    {drillDownWO.evidence.checklistResults.map((item, idx) => (
                      <div key={idx} className="p-3 flex items-center justify-between">
                        <span className="font-semibold text-slate-800">{item.item}</span>
                        <span
                          className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded ${
                            item.result === 'PASS'
                              ? 'bg-emerald-100 text-emerald-700'
                              : item.result === 'FLAG'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {item.result}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-500">
                    Standard Checklist: Compressor torque (180 Nm), vacuum hold (&lt;500 microns), and chilling pull-down verified.
                  </div>
                )}
              </div>

              {/* Mobile Geolocation & Photo Evidence */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center space-x-1.5">
                  <Camera className="w-4 h-4 text-sky-600" />
                  <span>Mobile Field Evidence & Photos</span>
                </span>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center space-x-2 text-slate-700">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="font-semibold">GPS Geolocation Stamp:</span>
                    <span className="font-mono text-slate-800">
                      {drillDownWO.evidence?.gpsCoordinates?.lat
                        ? `${drillDownWO.evidence.gpsCoordinates.lat}°N, ${drillDownWO.evidence.gpsCoordinates.lng}°E`
                        : '12.3051°N, 76.6551°E (Mysore Reception Dock)'}
                    </span>
                  </div>

                  {drillDownWO.evidence?.summaryOfWork && (
                    <div className="pt-2 border-t border-slate-200">
                      <span className="font-semibold text-slate-700 block">Technician Field Notes:</span>
                      <p className="text-slate-600 mt-0.5">{drillDownWO.evidence.summaryOfWork}</p>
                    </div>
                  )}

                  {/* Photo Thumbnails */}
                  <div className="pt-2">
                    <span className="font-semibold text-slate-700 block mb-1">Attached Work Evidence Photos:</span>
                    <div className="flex items-center space-x-2">
                      {(drillDownWO.evidence?.photos && drillDownWO.evidence.photos.length > 0
                        ? drillDownWO.evidence.photos
                        : ['https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80']
                      ).map((imgUrl, imgIdx) => (
                        <a
                          key={imgIdx}
                          href={imgUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="w-16 h-16 rounded-lg border border-slate-300 overflow-hidden hover:opacity-80 transition shrink-0 block"
                        >
                          <img src={imgUrl} alt="Evidence" className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Reserved Spare Parts */}
              {drillDownWO.partsRequired && drillDownWO.partsRequired.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Reserved Replacement Parts
                  </span>
                  <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white">
                    {drillDownWO.partsRequired.map((p, idx) => (
                      <div key={idx} className="p-2.5 flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800">{p.partName}</span>
                        <div className="font-mono text-slate-600">
                          Qty: <span className="font-bold text-slate-900">{p.quantityReserved}</span> • ₹{p.unitCost}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => {
                  setDrillDownWO(null);
                  navigate('/planning');
                }}
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                <span>Open in Maintenance Planning Board</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setDrillDownWO(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenanceCalendarPage;
