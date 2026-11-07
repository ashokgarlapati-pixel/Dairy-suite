import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Clock,
  DollarSign,
  Wrench,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Info,
  CheckCircle,
  XCircle,
  FileCheck2,
  SlidersHorizontal,
  Layers,
  ArrowRight
} from 'lucide-react';
import aiApi from '../api/aiApi';
import { useAuth } from '../context/AuthContext';
import RecommendationReviewModal from '../components/ai/RecommendationReviewModal';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';

export const MaintenanceRecommendationsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState([]);
  const [filterTab, setFilterTab] = useState('ALL'); // 'ALL' | 'PENDING' | 'DECIDED'
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Review modal target
  const [selectedRecommendation, setSelectedRecommendation] = useState(null);

  const canReview = user?.role === 'MAINTENANCE_ADMIN' || user?.role === 'OPERATIONS_MANAGER';

  const fetchRecommendations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await aiApi.getRecommendations();
      if (res?.data?.recommendations) {
        setRecommendations(res.data.recommendations);
      }
    } catch (err) {
      console.error('Failed to load recommendations:', err);
      setError(err.message || 'Unable to connect to AI recommendations service.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const handleReviewSubmitted = () => {
    fetchRecommendations();
  };

  const filteredRecommendations = recommendations.filter((rec) => {
    if (filterTab === 'PENDING') return rec.status === 'PENDING_REVIEW';
    if (filterTab === 'DECIDED') return rec.status !== 'PENDING_REVIEW';
    return true;
  });

  const pendingCount = recommendations.filter((r) => r.status === 'PENDING_REVIEW').length;
  const decidedCount = recommendations.filter((r) => r.status !== 'PENDING_REVIEW').length;

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <span className="p-2 bg-purple-100 text-purple-700 rounded-xl">
              <Sparkles className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Maintenance Recommendations (HITL Governance)
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Prescriptive maintenance timing, skills, parts, and downtime with strict Human-in-the-Loop supervisor authorization.
          </p>
        </div>

        <button
          onClick={fetchRecommendations}
          className="p-2.5 text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm"
          title="Refresh Recommendations"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-purple-600' : ''}`} />
        </button>
      </div>

      {/* Human-in-the-Loop Governance Notice Banner */}
      <div className="p-4 bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 border border-purple-200 rounded-2xl flex items-start space-x-3 text-xs text-purple-950 shadow-sm">
        <ShieldCheck className="w-5 h-5 text-purple-700 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-sm block">Strict Separation: AI Advisory Suggestions vs Approved Business Decisions</span>
          <p className="text-purple-800 mt-0.5 leading-relaxed">
            AI recommendations act solely as decision-support proposals. No equipment shutdown, part consumption, or field work order is dispatched until an authorized supervisor executes an explicit review decision (<span className="font-bold">ACCEPT</span>, <span className="font-bold">CORRECT</span>, <span className="font-bold">OVERRIDE</span>, or <span className="font-bold">REJECT</span>) with a mandatory recorded operational explanation.
          </p>
        </div>
      </div>

      {/* Tabs Filter (Clear Separation of AI Suggestions from Business Decisions) */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setFilterTab('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              filterTab === 'ALL'
                ? 'bg-purple-700 text-white shadow-md shadow-purple-700/20'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            All Recommendations ({recommendations.length})
          </button>
          <button
            onClick={() => setFilterTab('PENDING')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              filterTab === 'PENDING'
                ? 'bg-purple-700 text-white shadow-md shadow-purple-700/20'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Pending AI Suggestions ({pendingCount})
          </button>
          <button
            onClick={() => setFilterTab('DECIDED')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              filterTab === 'DECIDED'
                ? 'bg-emerald-700 text-white shadow-md shadow-emerald-700/20'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Approved Business Decisions ({decidedCount})
          </button>
        </div>

        <button
          onClick={() => navigate('/predictions/rul')}
          className="inline-flex items-center space-x-1.5 text-xs font-bold text-purple-700 hover:text-purple-800"
        >
          <span>Run Predictive Telemetry Diagnostics</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <LoadingSkeleton count={3} />
      ) : error ? (
        <ErrorState
          title="Failed to Load Recommendations"
          message={error}
          onRetry={fetchRecommendations}
        />
      ) : filteredRecommendations.length === 0 ? (
        <EmptyState
          title={
            filterTab === 'PENDING'
              ? 'No Pending AI Suggestions'
              : filterTab === 'DECIDED'
              ? 'No Approved Business Decisions Yet'
              : 'No Recommendations Found'
          }
          message="All dairy equipment is operating within normal baseline limits, or all pending recommendations have been reviewed and dispatched."
          actionLabel="Run Diagnostic Scan"
          onAction={() => navigate('/predictions/rul')}
        />
      ) : (
        <div className="space-y-4">
          {filteredRecommendations.map((rec) => {
            const isP0 = rec.priority === 'CRITICAL_P0';
            const milkLoss = rec.costImpact?.estimatedMilkSouringLoss || 0;
            const repairCost = rec.costImpact?.estimatedRepairCost || 0;
            const isPending = rec.status === 'PENDING_REVIEW';

            return (
              <div
                key={rec._id || rec.recommendationId}
                className={`bg-white rounded-2xl border p-6 shadow-sm hover:shadow-md transition-all space-y-4 ${
                  isPending ? 'border-purple-200' : 'border-slate-200'
                }`}
              >
                {/* Visual Distinction: AI Suggestion vs Approved Business Decision */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-mono text-xs font-bold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-200">
                      {rec.assetId?.assetTag || rec.assetTag || 'DAIRY-ASSET'}
                    </span>
                    <span
                      className={`font-mono text-[11px] font-bold px-2.5 py-0.5 rounded-md ${
                        isP0
                          ? 'bg-rose-100 text-rose-700'
                          : rec.priority === 'HIGH_P1'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {rec.priority}
                    </span>

                    {/* Clear Status Badge separating AI from Business Decision */}
                    {isPending ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200 flex items-center space-x-1">
                        <Sparkles className="w-3 h-3" />
                        <span>AI SUGGESTION (PENDING HUMAN REVIEW)</span>
                      </span>
                    ) : rec.status === 'ACCEPTED' ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center space-x-1">
                        <CheckCircle className="w-3 h-3 text-emerald-600" />
                        <span>APPROVED BUSINESS DECISION: ACCEPTED</span>
                      </span>
                    ) : rec.status === 'CORRECTED' ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300 flex items-center space-x-1">
                        <FileCheck2 className="w-3 h-3 text-blue-600" />
                        <span>APPROVED BUSINESS DECISION: CORRECTED</span>
                      </span>
                    ) : rec.status === 'OVERRIDDEN' ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center space-x-1">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        <span>APPROVED BUSINESS DECISION: SUPERVISOR OVERRIDE</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center space-x-1">
                        <XCircle className="w-3 h-3 text-rose-600" />
                        <span>SUPERVISOR DECISION: REJECTED</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-semibold">
                    <Clock className="w-4 h-4 text-purple-600" />
                    <span>Timing: {rec.suggestedTiming}</span>
                  </div>
                </div>

                {/* Body Details: Title, Safety, Cost, Operational Impact */}
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-slate-900">{rec.title}</h3>
                  <div className="p-3 bg-rose-50/60 border border-rose-100 rounded-xl text-xs space-y-1">
                    <span className="font-bold text-rose-800 block uppercase tracking-wider text-[10px]">
                      Food Safety & Biological Impact
                    </span>
                    <p className="text-rose-900 font-medium">{rec.safetyImpact}</p>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                    <span className="font-bold text-slate-600 block uppercase tracking-wider text-[10px]">
                      Operational Milk Reception Impact
                    </span>
                    <p className="text-slate-700">{rec.operationalImpact}</p>
                  </div>
                </div>

                {/* 3-Column Info Grid: Skills, Parts, Cost Exposure */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  {/* Column 1: Required Skills */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                    <span className="font-bold text-slate-600 block uppercase tracking-wider text-[10px]">
                      Required Technician Skills
                    </span>
                    <ul className="space-y-1 text-slate-700 font-medium">
                      {rec.requiredSkills?.map((skill, i) => (
                        <li key={i} className="flex items-center space-x-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-sky-600" />
                          <span>{skill}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Column 2: Probable Spare Parts */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                    <span className="font-bold text-slate-600 block uppercase tracking-wider text-[10px]">
                      Probable Spare Parts & Availability
                    </span>
                    <ul className="space-y-1 text-slate-700">
                      {rec.probableParts?.map((p, i) => (
                        <li key={i} className="flex items-center justify-between">
                          <span className="truncate">{p.partName}</span>
                          <span className="font-mono text-slate-500 font-semibold">
                            ₹{p.estimatedCost?.toLocaleString()}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Column 3: Financial Spoilage Risk Exposure */}
                  <div className="p-3.5 bg-rose-50/50 rounded-xl border border-rose-200 text-xs space-y-1">
                    <span className="font-bold text-rose-700 block uppercase tracking-wider text-[10px]">
                      Financial Milk Loss Risk Value
                    </span>
                    <div className="text-2xl font-black font-mono text-rose-600 mt-1">
                      ₹{milkLoss.toLocaleString('en-IN')}
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Est. Repair Cost: ₹{repairCost.toLocaleString('en-IN')} • Downtime ~{rec.expectedDowntimeHours || 3.0}h
                    </p>
                  </div>
                </div>

                {/* If already reviewed: Display Approved Business Decision Audit Details */}
                {!isPending && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-800">Review Decision:</span>
                        <span className="font-bold uppercase font-mono px-2 py-0.5 rounded bg-white border border-slate-300">
                          {rec.status}
                        </span>
                      </div>
                      <span className="text-slate-500 font-mono text-[11px]">
                        Reviewed by {rec.reviewerName || 'Authorized Supervisor'} ({rec.reviewerRole || 'Operations Manager'}) on {rec.reviewedAt ? new Date(rec.reviewedAt).toLocaleString() : 'Recent'}
                      </span>
                    </div>

                    <div>
                      <span className="font-semibold text-slate-600 block text-[11px]">
                        Mandatory Operational Justification Reason:
                      </span>
                      <p className="text-slate-800 font-medium mt-0.5 italic">
                        "{rec.reviewerReason || 'Physical inspection verified and decision logged.'}"
                      </p>
                    </div>

                    {rec.convertedWorkOrderId && (
                      <div className="pt-1 flex items-center space-x-2 text-emerald-700 font-semibold">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Work Order Dispatched to Field Queue (Ref: #{rec.convertedWorkOrderId})</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Footer Action */}
                <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <span className="text-xs text-slate-400">
                    {isPending
                      ? 'Awaiting authorization by Operations Manager or Maintenance Admin'
                      : 'Audit record permanently persisted to cooperative ledger'}
                  </span>

                  {isPending && (
                    canReview ? (
                      <button
                        onClick={() => setSelectedRecommendation(rec)}
                        className="inline-flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-700/25 transition-all"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>Authorize Decision (Accept / Correct / Override / Reject)</span>
                      </button>
                    ) : (
                      <span className="text-xs text-slate-500 font-medium">
                        View-only (Review requires Operations Manager role)
                      </span>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Review Modal with all 4 authorized actions */}
      <RecommendationReviewModal
        isOpen={Boolean(selectedRecommendation)}
        onClose={() => setSelectedRecommendation(null)}
        onReviewSubmitted={handleReviewSubmitted}
        recommendation={selectedRecommendation}
      />
    </div>
  );
};

export default MaintenanceRecommendationsPage;
