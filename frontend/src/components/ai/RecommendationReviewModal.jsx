import React, { useState } from 'react';
import { X, CheckCircle, XCircle, AlertTriangle, ShieldCheck, FileCheck2 } from 'lucide-react';
import aiApi from '../../api/aiApi';

export const RecommendationReviewModal = ({ isOpen, onClose, onReviewSubmitted, recommendation }) => {
  const [decision, setDecision] = useState('ACCEPTED');
  const [reviewerReason, setReviewerReason] = useState('');
  const [modifiedPriority, setModifiedPriority] = useState(recommendation?.priority || 'HIGH_P1');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen || !recommendation) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reviewerReason.trim() || reviewerReason.trim().length < 5) {
      setErrorMessage('Please provide a mandatory operational explanation / justification for this review decision.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = await aiApi.reviewRecommendation(recommendation._id, {
        decision,
        reviewerReason: reviewerReason.trim(),
        modifiedPriority
      });
      onReviewSubmitted(res.data);
      onClose();
    } catch (err) {
      console.error('Review submission error:', err);
      setErrorMessage(err.message || 'Failed to submit recommendation review.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-r from-purple-950 via-slate-900 to-slate-900 text-white">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-500/20 text-purple-400 rounded-lg">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Human-in-the-Loop AI Review</h2>
              <p className="text-xs text-slate-300">
                Authorized Supervisor Acceptance & Work Order Dispatch
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Recommendation Summary */}
          <div className="p-3.5 bg-purple-50/60 border border-purple-200 rounded-xl text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-purple-900 text-sm">{recommendation.title}</span>
              <span className="font-mono font-bold text-purple-700 bg-white px-2 py-0.5 rounded border border-purple-200">
                {recommendation.priority}
              </span>
            </div>
            <p className="text-slate-600">{recommendation.safetyImpact}</p>
            <div className="text-[11px] text-purple-800 font-semibold pt-1">
              Timing: {recommendation.suggestedTiming}
            </div>
          </div>

          {/* Decision Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              Review Decision <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                type="button"
                onClick={() => setDecision('ACCEPTED')}
                className={`p-3 rounded-xl border text-center transition-all ${
                  decision === 'ACCEPTED'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20 font-bold'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <CheckCircle className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
                <div className="text-xs font-bold">Accept</div>
                <div className="text-[10px] text-slate-400">Dispatch WO</div>
              </button>

              <button
                type="button"
                onClick={() => setDecision('CORRECTED')}
                className={`p-3 rounded-xl border text-center transition-all ${
                  decision === 'CORRECTED'
                    ? 'border-blue-500 bg-blue-50 text-blue-800 ring-2 ring-blue-500/20 font-bold'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <FileCheck2 className="w-4 h-4 mx-auto mb-1 text-blue-600" />
                <div className="text-xs font-bold">Correct</div>
                <div className="text-[10px] text-slate-400">Adjust Params</div>
              </button>

              <button
                type="button"
                onClick={() => setDecision('OVERRIDDEN')}
                className={`p-3 rounded-xl border text-center transition-all ${
                  decision === 'OVERRIDDEN'
                    ? 'border-amber-500 bg-amber-50 text-amber-800 ring-2 ring-amber-500/20 font-bold'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <AlertTriangle className="w-4 h-4 mx-auto mb-1 text-amber-600" />
                <div className="text-xs font-bold">Override</div>
                <div className="text-[10px] text-slate-400">Supervisor Lead</div>
              </button>

              <button
                type="button"
                onClick={() => setDecision('REJECTED')}
                className={`p-3 rounded-xl border text-center transition-all ${
                  decision === 'REJECTED'
                    ? 'border-rose-500 bg-rose-50 text-rose-800 ring-2 ring-rose-500/20 font-bold'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <XCircle className="w-4 h-4 mx-auto mb-1 text-rose-600" />
                <div className="text-xs font-bold">Reject</div>
                <div className="text-[10px] text-slate-400">Dismiss Alert</div>
              </button>
            </div>
          </div>

          {/* Priority override if accepted or overridden */}
          {decision !== 'REJECTED' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Assigned Work Order Priority
              </label>
              <select
                value={modifiedPriority}
                onChange={(e) => setModifiedPriority(e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="CRITICAL_P0">CRITICAL_P0 - Immediate Stoppage</option>
                <option value="HIGH_P1">HIGH_P1 - Cold Chain Threat</option>
                <option value="MEDIUM_P2">MEDIUM_P2 - Standard Preventive</option>
                <option value="LOW_P3">LOW_P3 - Auxiliary Servicing</option>
              </select>
            </div>
          )}

          {/* Mandatory Reason */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mandatory Engineering Justification / Supervisor Note <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={reviewerReason}
              onChange={(e) => setReviewerReason(e.target.value)}
              placeholder="Explain physical findings, milk production constraints, technician availability, or why this AI suggestion was accepted/rejected..."
              className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center space-x-2 px-5 py-2 text-xs font-bold text-white bg-purple-700 hover:bg-purple-600 rounded-xl shadow-md transition-all"
            >
              <FileCheck2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Submitting Review...' : 'Confirm Decision & Log Audit'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RecommendationReviewModal;

