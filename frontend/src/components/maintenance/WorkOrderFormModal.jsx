import React, { useState } from 'react';
import { X, Wrench, AlertCircle, Save, Plus, Trash2 } from 'lucide-react';
import workOrderApi from '../../api/workOrderApi';

export const WorkOrderFormModal = ({ isOpen, onClose, onWorkOrderCreated, assets = [] }) => {
  const [formData, setFormData] = useState({
    assetId: assets[0]?._id || '',
    title: '',
    description: '',
    priority: 'MEDIUM_P2',
    source: 'MANUAL',
    estimatedDowntimeHours: 2.0,
    requiredSkills: 'Refrigeration Mechanic',
    partsRequired: [{ partName: '', quantityReserved: 1, unitCost: 0 }]
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'estimatedDowntimeHours' ? Number(value) : value
    }));
  };

  const handlePartChange = (index, field, value) => {
    const updated = [...formData.partsRequired];
    updated[index][field] = field === 'quantityReserved' || field === 'unitCost' ? Number(value) : value;
    setFormData((prev) => ({ ...prev, partsRequired: updated }));
  };

  const addPartRow = () => {
    setFormData((prev) => ({
      ...prev,
      partsRequired: [...prev.partsRequired, { partName: '', quantityReserved: 1, unitCost: 0 }]
    }));
  };

  const removePartRow = (index) => {
    setFormData((prev) => ({
      ...prev,
      partsRequired: prev.partsRequired.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setErrors({ title: 'Work order title is required' });
      return;
    }
    if (!formData.description.trim()) {
      setErrors({ description: 'Detailed work instructions required' });
      return;
    }

    setIsSubmitting(true);
    setServerError('');

    const payload = {
      assetId: formData.assetId || assets[0]?._id,
      title: formData.title.trim(),
      description: formData.description.trim(),
      priority: formData.priority,
      source: formData.source,
      estimatedDowntimeHours: Number(formData.estimatedDowntimeHours),
      requiredSkills: formData.requiredSkills.split(',').map((s) => s.trim()).filter(Boolean),
      partsRequired: formData.partsRequired.filter((p) => p.partName.trim())
    };

    try {
      const res = await workOrderApi.createWorkOrder(payload);
      onWorkOrderCreated(res.data);
      onClose();
    } catch (err) {
      console.error('Work order creation error:', err);
      setServerError(err.message || 'Failed to dispatch work order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-r from-slate-900 to-sky-950 text-white">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-sky-500/20 text-sky-400 rounded-lg">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Dispatch Maintenance Work Order</h2>
              <p className="text-xs text-slate-300">
                Assign technician, reserve warehouse spares & schedule downtime
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {serverError && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Target Asset */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Dairy Asset <span className="text-red-500">*</span>
            </label>
            <select
              name="assetId"
              value={formData.assetId}
              onChange={handleChange}
              className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
            >
              {assets.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.assetTag} - {a.name} ({a.category?.replace(/_/g, ' ')})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Priority Level <span className="text-red-500">*</span>
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
              >
                <option value="CRITICAL_P0">P0 - Critical (Immediate Breakdown)</option>
                <option value="HIGH_P1">P1 - High Priority (Cold Chain Threat)</option>
                <option value="MEDIUM_P2">P2 - Medium Priority</option>
                <option value="LOW_P3">P3 - Low Priority</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Estimated Downtime (Hours)
              </label>
              <input
                type="number"
                step="0.5"
                name="estimatedDowntimeHours"
                value={formData.estimatedDowntimeHours}
                onChange={handleChange}
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Work Order Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g. Compressor Suction Valve Leak Overhaul"
              className={`w-full px-3.5 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-sky-500 ${
                errors.title ? 'border-red-500' : 'border-slate-300'
              }`}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Work Instructions & Diagnostic Description <span className="text-red-500">*</span>
            </label>
            <textarea
              name="description"
              rows={3}
              value={formData.description}
              onChange={handleChange}
              placeholder="Specify step-by-step procedures, safety isolation rules, sanitary CIP requirements..."
              className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Required Technician Qualifications (Comma-separated)
            </label>
            <input
              type="text"
              name="requiredSkills"
              value={formData.requiredSkills}
              onChange={handleChange}
              placeholder="e.g. Refrigeration Mechanic, Sanitary TIG Welding"
              className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Parts Reservation */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Warehouse Parts Required
              </span>
              <button
                type="button"
                onClick={addPartRow}
                className="inline-flex items-center space-x-1 text-xs text-sky-600 hover:text-sky-700 font-bold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Spare Part</span>
              </button>
            </div>

            {formData.partsRequired.map((part, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Spare part name / code"
                  value={part.partName}
                  onChange={(e) => handlePartChange(index, 'partName', e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                />
                <input
                  type="number"
                  min="1"
                  placeholder="Qty"
                  value={part.quantityReserved}
                  onChange={(e) => handlePartChange(index, 'quantityReserved', e.target.value)}
                  className="w-20 px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                />
                {formData.partsRequired.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePartRow(index)}
                    className="p-1.5 text-rose-500 hover:text-rose-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center space-x-2 px-5 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-xl shadow-md transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Dispatching...' : 'Dispatch Work Order'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WorkOrderFormModal;

