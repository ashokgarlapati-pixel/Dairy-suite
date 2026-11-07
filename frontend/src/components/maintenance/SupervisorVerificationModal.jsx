import React, { useState } from 'react';
import { X, CheckCircle, XCircle, ShieldCheck, AlertCircle } from 'lucide-react';
import workOrderApi from '../../api/workOrderApi';
import { useAuth } from '../../context/AuthContext';

export const SupervisorVerificationModal = ({
  isOpen,
  onClose,
  onVerified,
  workOrder
}) => {
  const { user } = useAuth();
  const [decision, setDecision] = useState('APPROVED');
  const [supervisorNotes, setSupervisorNotes] = useState('');
  const [signoffSignatureName, setSignoffSignatureName] = useState(
    user?.fullName || 'Ramesh Patel (Operations Manager)'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen || !workOrder) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!supervisorNotes.trim()) {
      setErrorMessage('Please provide formal verification remarks / sign-off notes.');
      return;
    }
    if (!signoffSignatureName.trim()) {
      setErrorMessage('Electronic signature name is required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = await workOrderApi.verifyClosure(workOrder._id, {
        decision,
        supervisorNotes: supervisorNotes.trim(),
        signoffSignatureName: signoffSignatureName.trim()
      });
      onVerified(res.data);
      onClose();
    } catch (err) {
      console.error('Verification failed:', err);
      setErrorMessage(err.message || 'Closure verification failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-r from-slate-900 to-sky-950 text-white">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-sky-500/20 text-sky-400 rounded-lg">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Multi-Tier Closure Sign-Off</h2>
              <p className="text-xs text-slate-300">
                Work Order: <span className="font-mono text-sky-400">{workOrder.workOrderNumber}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Work Summary Preview */}
          {workOrder.evidence?.summaryOfWork && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
              <span className="font-bold text-slate-700 block uppercase tracking-wider text-[10px]">
                Technician's Submitted Work Evidence
              </span>
              <p className="text-slate-600">{workOrder.evidence.summaryOfWork}</p>
            </div>
          )}

          {/* Decision Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              Sign-Off Decision
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDecision('APPROVED')}
                className={`p-3 rounded-xl border flex items-center space-x-2 transition-all ${
                  decision === 'APPROVED'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <div className="text-left">
                  <div className="text-xs font-bold">Approve & Close</div>
                  <div className="text-[10px] text-slate-400">Releases asset to operational</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDecision('REJECTED')}
                className={`p-3 rounded-xl border flex items-center space-x-2 transition-all ${
                  decision === 'REJECTED'
                    ? 'border-rose-500 bg-rose-50 text-rose-800 ring-2 ring-rose-500/20'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <XCircle className="w-4 h-4 text-rose-600" />
                <div className="text-left">
                  <div className="text-xs font-bold">Reject for Rework</div>
                  <div className="text-[10px] text-slate-400">Returns ticket to technician</div>
                </div>
              </button>
            </div>
          </div>

          {/* Supervisor Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Verification Remarks & Audit Justification <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={supervisorNotes}
              onChange={(e) => setSupervisorNotes(e.target.value)}
              placeholder={
                decision === 'APPROVED'
                  ? 'e.g. Verified cold pull-down telemetry stream below 3.8°C; zero leaks on valve plate; released for collection cycle.'
                  : 'Specify exact rework required, failed checklist items, or unacceptable tolerances...'
              }
              className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Electronic Signature */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Authorized Supervisor Signature <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={signoffSignatureName}
              onChange={(e) => setSignoffSignatureName(e.target.value)}
              className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 font-semibold"
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
              className={`inline-flex items-center space-x-2 px-5 py-2 text-xs font-bold text-white rounded-xl shadow-md transition-all ${
                decision === 'APPROVED'
                  ? 'bg-emerald-600 hover:bg-emerald-500'
                  : 'bg-rose-600 hover:bg-rose-500'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? 'Submitting Sign-off...'
                  : decision === 'APPROVED'
                  ? 'Confirm Formal Closure'
                  : 'Return for Rework'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SupervisorVerificationModal;

