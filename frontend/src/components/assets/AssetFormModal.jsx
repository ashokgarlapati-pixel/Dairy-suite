import React, { useState, useEffect } from 'react';
import { X, Wrench, AlertCircle, Save, Check } from 'lucide-react';
import assetApi from '../../api/assetApi';

const CATEGORY_OPTIONS = [
  { value: 'BULK_MILK_COOLER', label: 'Bulk Milk Cooler (BMC)' },
  { value: 'CHILLED_TANKER', label: 'Insulated Road Milk Tanker' },
  { value: 'PASTEURIZER', label: 'Plate Pasteurizer (HTST)' },
  { value: 'HOMOGENIZER', label: 'High-Pressure Homogenizer' },
  { value: 'COLD_ROOM', label: 'Cold Storage Room' },
  { value: 'PACKAGING_MACHINE', label: 'Pouch Packaging Machine' }
];

const CRITICALITY_OPTIONS = [
  { value: 'CRITICAL_P0', label: 'P0 - Mission Critical (Immediate Milk Souring Risk)' },
  { value: 'HIGH_P1', label: 'P1 - High Priority (Cold Chain Transfer Line)' },
  { value: 'MEDIUM_P2', label: 'P2 - Medium Priority (Secondary Unit)' },
  { value: 'LOW_P3', label: 'P3 - Low Priority (Auxiliary Equipment)' }
];

const STATUS_OPTIONS = [
  { value: 'OPERATIONAL', label: 'Operational (Normal)' },
  { value: 'WARNING', label: 'Warning (Inspection Recommended)' },
  { value: 'CRITICAL_FAULT', label: 'Critical Fault (Breakdown)' },
  { value: 'UNDER_MAINTENANCE', label: 'Under Maintenance' }
];

const RISK_OPTIONS = [
  { value: 'LOW', label: 'Low Risk' },
  { value: 'MEDIUM', label: 'Medium Risk' },
  { value: 'HIGH', label: 'High Risk' },
  { value: 'CRITICAL', label: 'Critical / Imminent Risk' }
];

export const AssetFormModal = ({ isOpen, onClose, onAssetSaved, initialData = null }) => {
  const isEditing = Boolean(initialData && initialData._id);

  const [formData, setFormData] = useState({
    assetTag: '',
    name: '',
    category: 'BULK_MILK_COOLER',
    criticality: 'HIGH_P1',
    ratedCapacity: '',
    currentStatus: 'OPERATIONAL',
    currentHealthScore: 100,
    failureRiskLevel: 'LOW',
    totalRuntimeHours: 0,
    facilityName: 'Mysore Central Chilling Center',
    department: 'Raw Milk Reception Dock (RMRD)',
    building: 'Main Hall',
    cooperativeZone: 'Southern District Union',
    plantId: 'Plant-Central (Mysore)',
    centerId: 'VCC-MYSORE-01',
    ownerType: 'COOPERATIVE',
    ownerName: 'Dairy Union Federation',
    contactPhone: '+91 98450 11000'
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData({
        assetTag: initialData.assetTag || '',
        name: initialData.name || '',
        category: initialData.category || 'BULK_MILK_COOLER',
        criticality: initialData.criticality || 'HIGH_P1',
        ratedCapacity: initialData.ratedCapacity || '',
        currentStatus: initialData.currentStatus || 'OPERATIONAL',
        currentHealthScore: initialData.currentHealthScore ?? 100,
        failureRiskLevel: initialData.failureRiskLevel || 'LOW',
        totalRuntimeHours: initialData.totalRuntimeHours || 0,
        facilityName: initialData.location?.facilityName || 'Mysore Central Chilling Center',
        department: initialData.location?.department || '',
        building: initialData.location?.building || '',
        cooperativeZone: initialData.orgScope?.cooperativeZone || 'Southern District Union',
        plantId: initialData.orgScope?.plantId || 'Plant-Central (Mysore)',
        centerId: initialData.orgScope?.centerId || 'VCC-MYSORE-01',
        ownerType: initialData.owner?.ownerType || 'COOPERATIVE',
        ownerName: initialData.owner?.ownerName || 'Dairy Union Federation',
        contactPhone: initialData.owner?.contactPhone || ''
      });
    } else {
      setFormData({
        assetTag: '',
        name: '',
        category: 'BULK_MILK_COOLER',
        criticality: 'HIGH_P1',
        ratedCapacity: '',
        currentStatus: 'OPERATIONAL',
        currentHealthScore: 100,
        failureRiskLevel: 'LOW',
        totalRuntimeHours: 0,
        facilityName: 'Mysore Central Chilling Center',
        department: 'Raw Milk Reception Dock (RMRD)',
        building: 'Main Hall',
        cooperativeZone: 'Southern District Union',
        plantId: 'Plant-Central (Mysore)',
        centerId: 'VCC-MYSORE-01',
        ownerType: 'COOPERATIVE',
        ownerName: 'Dairy Union Federation',
        contactPhone: '+91 98450 11000'
      });
    }
    setErrors({});
    setServerError('');
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'currentHealthScore' || name === 'totalRuntimeHours' ? Number(value) : value
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.assetTag.trim()) newErrors.assetTag = 'Asset Tag is required';
    if (!formData.name.trim()) newErrors.name = 'Asset Name is required';
    if (!formData.facilityName.trim()) newErrors.facilityName = 'Facility Name is required';
    if (!formData.cooperativeZone.trim()) newErrors.cooperativeZone = 'Cooperative Zone is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setServerError('');

    const payload = {
      assetTag: formData.assetTag.toUpperCase().trim(),
      name: formData.name.trim(),
      category: formData.category,
      criticality: formData.criticality,
      ratedCapacity: formData.ratedCapacity.trim(),
      currentStatus: formData.currentStatus,
      currentHealthScore: Number(formData.currentHealthScore),
      failureRiskLevel: formData.failureRiskLevel,
      totalRuntimeHours: Number(formData.totalRuntimeHours),
      location: {
        facilityName: formData.facilityName.trim(),
        department: formData.department.trim(),
        building: formData.building.trim()
      },
      orgScope: {
        cooperativeZone: formData.cooperativeZone.trim(),
        plantId: formData.plantId.trim(),
        centerId: formData.centerId.trim()
      },
      owner: {
        ownerType: formData.ownerType,
        ownerName: formData.ownerName.trim(),
        contactPhone: formData.contactPhone.trim()
      }
    };

    try {
      if (isEditing) {
        const res = await assetApi.updateAsset(initialData._id, payload);
        onAssetSaved(res.data);
      } else {
        const res = await assetApi.createAsset(payload);
        onAssetSaved(res.data);
      }
      onClose();
    } catch (err) {
      console.error('Asset save error:', err);
      setServerError(
        err.message || 'Failed to save asset. Please verify input fields and unique asset tag.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-r from-slate-900 to-sky-950 text-white">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-sky-500/20 text-sky-400 rounded-lg">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">
                {isEditing ? `Edit Asset: ${formData.assetTag}` : 'Register New Dairy Equipment'}
              </h2>
              <p className="text-xs text-slate-300">
                Bulk Milk Coolers, Tankers, Pasteurizers, Homogenizers & Cold Storage Assets
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Server Error Alert */}
        {serverError && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center space-x-3 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
            <span>{serverError}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Section 1: Core Identity */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-2">
              1. Core Asset Identification
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Asset Tag / ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="assetTag"
                  value={formData.assetTag}
                  onChange={handleChange}
                  placeholder="e.g. BMC-MYSORE-021"
                  className={`w-full px-3.5 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-sky-500 font-mono ${
                    errors.assetTag ? 'border-red-500' : 'border-slate-300'
                  }`}
                  disabled={isEditing}
                />
                {errors.assetTag && <p className="text-xs text-red-500 mt-1">{errors.assetTag}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Asset Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Bulk Milk Cooler 5,000L #21"
                  className={`w-full px-3.5 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-sky-500 ${
                    errors.name ? 'border-red-500' : 'border-slate-300'
                  }`}
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Equipment Category <span className="text-red-500">*</span>
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                >
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Criticality Level <span className="text-red-500">*</span>
                </label>
                <select
                  name="criticality"
                  value={formData.criticality}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                >
                  {CRITICALITY_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Rated Capacity / Specification
                </label>
                <input
                  type="text"
                  name="ratedCapacity"
                  value={formData.ratedCapacity}
                  onChange={handleChange}
                  placeholder="e.g. 5,000 Liters / 3 Hours"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Total Runtime Hours
                </label>
                <input
                  type="number"
                  name="totalRuntimeHours"
                  value={formData.totalRuntimeHours}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Operational Health & Status */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-2">
              2. Operational Condition & Health
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Current Status
                </label>
                <select
                  name="currentStatus"
                  value={formData.currentStatus}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Health Score ({formData.currentHealthScore} / 100)
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="range"
                    name="currentHealthScore"
                    min="0"
                    max="100"
                    value={formData.currentHealthScore}
                    onChange={handleChange}
                    className="w-full accent-sky-600"
                  />
                  <span className="font-mono text-sm font-bold w-10 text-right">
                    {formData.currentHealthScore}%
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Estimated Failure Risk
                </label>
                <select
                  name="failureRiskLevel"
                  value={formData.failureRiskLevel}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                >
                  {RISK_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Location & Organizational Scope */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-2">
              3. Location & Organizational Scope Isolation
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Facility Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="facilityName"
                  value={formData.facilityName}
                  onChange={handleChange}
                  placeholder="e.g. Mysore Central Chilling Center"
                  className={`w-full px-3.5 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-sky-500 ${
                    errors.facilityName ? 'border-red-500' : 'border-slate-300'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  placeholder="e.g. Raw Milk Reception Dock"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Building / Bay</label>
                <input
                  type="text"
                  name="building"
                  value={formData.building}
                  onChange={handleChange}
                  placeholder="e.g. Block A - Bay 3"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cooperative Zone <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="cooperativeZone"
                  value={formData.cooperativeZone}
                  onChange={handleChange}
                  placeholder="e.g. Southern District Union"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Plant</label>
                <input
                  type="text"
                  name="plantId"
                  value={formData.plantId}
                  onChange={handleChange}
                  placeholder="e.g. Plant-Central (Mysore)"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Collection Center</label>
                <input
                  type="text"
                  name="centerId"
                  value={formData.centerId}
                  onChange={handleChange}
                  placeholder="e.g. VCC-MYSORE-01"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Ownership */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-2">
              4. Ownership & Vendor Support
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Owner Type</label>
                <select
                  name="ownerType"
                  value={formData.ownerType}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                >
                  <option value="COOPERATIVE">Dairy Cooperative</option>
                  <option value="CONTRACTOR">Contractor / Transport</option>
                  <option value="VILLAGE_SOCIETY">Village Society (Farmers)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Owner Name</label>
                <input
                  type="text"
                  name="ownerName"
                  value={formData.ownerName}
                  onChange={handleChange}
                  placeholder="e.g. Mysore Cooperative Federation"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Emergency Phone</label>
                <input
                  type="text"
                  name="contactPhone"
                  value={formData.contactPhone}
                  onChange={handleChange}
                  placeholder="+91 98450 11000"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center space-x-2 px-6 py-2 text-sm font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-xl shadow-md shadow-sky-600/30 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving Asset...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{isEditing ? 'Save Changes' : 'Register Equipment'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssetFormModal;

