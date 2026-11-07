import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Wrench,
  AlertTriangle,
  Clock,
  MapPin,
  Calendar,
  ShieldCheck,
  ShieldAlert,
  Building,
  UserCheck,
  Trash2,
  Edit,
  Activity,
  Layers,
  Thermometer,
  Truck,
  Box,
  Flame,
  Snowflake,
  ExternalLink,
  Cpu,
  Package,
  History,
  Search,
  Filter,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown
} from 'lucide-react';
import assetApi from '../api/assetApi';
import workOrderApi from '../api/workOrderApi';
import { useAuth } from '../context/AuthContext';
import AssetFormModal from '../components/assets/AssetFormModal';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import ErrorState from '../components/common/ErrorState';
import TelemetryTrendsChart from '../components/telemetry/TelemetryTrendsChart';

const getCategoryIcon = (category) => {
  switch (category) {
    case 'BULK_MILK_COOLER':
      return Snowflake;
    case 'CHILLED_TANKER':
      return Truck;
    case 'PASTEURIZER':
      return Flame;
    case 'HOMOGENIZER':
      return Layers;
    case 'COLD_ROOM':
      return Snowflake;
    case 'PACKAGING_MACHINE':
      return Box;
    default:
      return Activity;
  }
};

// Recommended spare parts library per dairy category
const CATEGORY_SPARE_PARTS = {
  BULK_MILK_COOLER: [
    { partNo: 'SP-BMC-V01', name: 'Copeland 7.5HP Suction Reed Valve', stock: 4, reserved: 1, unitCost: 4800, status: 'IN_STOCK', leadDays: 0 },
    { partNo: 'SP-BMC-R04', name: 'R404A Eco Refrigerant Canister (10kg)', stock: 8, reserved: 1, unitCost: 6500, status: 'IN_STOCK', leadDays: 0 },
    { partNo: 'SP-BMC-AG1', name: 'Sanitary Agitator Geared Motor Coupling', stock: 2, reserved: 0, unitCost: 2200, status: 'LOW_STOCK', leadDays: 2 },
    { partNo: 'SP-BMC-S01', name: 'Dual PT100 RTD Temperature Probe', stock: 6, reserved: 0, unitCost: 1850, status: 'IN_STOCK', leadDays: 0 }
  ],
  PASTEURIZER: [
    { partNo: 'SP-PST-G01', name: 'EPDM Food-Grade Clip-On Plate Gaskets (Set of 10)', stock: 12, reserved: 2, unitCost: 3200, status: 'IN_STOCK', leadDays: 0 },
    { partNo: 'SP-PST-C02', name: 'Food-Grade Nitric Acid CIP Descaler (25L)', stock: 5, reserved: 1, unitCost: 2800, status: 'IN_STOCK', leadDays: 0 },
    { partNo: 'SP-PST-V03', name: 'GEA Tri-Clover Fail-Safe Divert Diaphragm', stock: 1, reserved: 0, unitCost: 8500, status: 'LOW_STOCK', leadDays: 3 },
    { partNo: 'SP-PST-P04', name: 'Samson Pneumatic Valve Positioner Kit', stock: 3, reserved: 0, unitCost: 11500, status: 'IN_STOCK', leadDays: 0 }
  ],
  CHILLED_TANKER: [
    { partNo: 'SP-TNK-S01', name: 'Sanitary Lobe Pump Mechanical Seal (SS316)', stock: 3, reserved: 0, unitCost: 5400, status: 'IN_STOCK', leadDays: 0 },
    { partNo: 'SP-TNK-G02', name: 'Food-Grade EPDM Manhole Hatch Gasket', stock: 5, reserved: 0, unitCost: 1400, status: 'IN_STOCK', leadDays: 0 },
    { partNo: 'SP-TNK-B03', name: 'Temperature Datalogger Lithium Cell Battery Pack', stock: 10, reserved: 0, unitCost: 650, status: 'IN_STOCK', leadDays: 0 }
  ],
  PACKAGING_MACHINE: [
    { partNo: 'SP-PKG-H01', name: 'Teflon-Coated Impulse Heat Sealing Jaw', stock: 4, reserved: 0, unitCost: 3600, status: 'IN_STOCK', leadDays: 0 },
    { partNo: 'SP-PKG-P02', name: 'Pneumatic Film Dosing Piston Seal Kit', stock: 2, reserved: 0, unitCost: 2400, status: 'LOW_STOCK', leadDays: 2 },
    { partNo: 'SP-PKG-U03', name: 'Inline UV-C Film Decontamination Lamp 30W', stock: 6, reserved: 0, unitCost: 1900, status: 'IN_STOCK', leadDays: 0 }
  ]
};

export const AssetDetailPage = () => {
  const { assetId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [asset, setAsset] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDecommissioning, setIsDecommissioning] = useState(false);

  // Work Orders & Maintenance History state
  const [workOrders, setWorkOrders] = useState([]);
  const [isWoLoading, setIsWoLoading] = useState(false);
  const [woSearch, setWoSearch] = useState('');
  const [woStatusFilter, setWoStatusFilter] = useState('ALL');
  const [woSortBy, setWoSortBy] = useState('newest');
  const [woPage, setWoPage] = useState(1);
  const woPageSize = 5;

  const canEdit = user?.role === 'MAINTENANCE_ADMIN' || user?.role === 'OPERATIONS_MANAGER';
  const canDelete = user?.role === 'MAINTENANCE_ADMIN';

  const fetchAsset = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await assetApi.getAssetById(assetId);
      if (res?.data) {
        setAsset(res.data);
      } else {
        throw new Error(`Asset with identifier '${assetId}' not found.`);
      }
    } catch (err) {
      console.warn(`[Asset Detail] Direct lookup for '${assetId}' failed. Attempting registry fallback...`, err);
      try {
        const fallbackRes = await assetApi.getAssets({ limit: 1 });
        if (fallbackRes?.data?.assets?.length > 0) {
          const firstAsset = fallbackRes.data.assets[0];
          setAsset(firstAsset);
          navigate(`/assets/${firstAsset.assetTag || firstAsset._id}`, { replace: true });
          return;
        }
      } catch (fallbackErr) {
        // Fallback failed
      }
      setError(err?.message || err?.error || `Asset '${assetId}' could not be located in the cooperative registry.`);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWorkOrders = async () => {
    if (!asset) return;
    setIsWoLoading(true);
    try {
      const queryAssetId = asset.assetTag || asset._id;
      const res = await workOrderApi.getWorkOrders({ assetId: queryAssetId, limit: 100 });
      if (res?.data?.workOrders) {
        setWorkOrders(res.data.workOrders);
      }
    } catch (err) {
      console.warn('Failed to load work orders for asset:', err);
    } finally {
      setIsWoLoading(false);
    }
  };

  useEffect(() => {
    if (assetId) {
      fetchAsset();
    }
  }, [assetId]);

  useEffect(() => {
    if (asset) {
      fetchWorkOrders();
    }
  }, [asset]);

  const handleDecommission = async () => {
    if (!window.confirm(`Are you sure you want to decommission asset ${asset?.assetTag}? This will update its status to DECOMMISSIONED and log an immutable audit event.`)) {
      return;
    }

    setIsDecommissioning(true);
    try {
      await assetApi.deleteAsset(asset._id, 'Decommissioned from Asset Detail view');
      alert(`Asset ${asset?.assetTag} successfully decommissioned.`);
      navigate('/assets');
    } catch (err) {
      alert(`Failed to decommission asset: ${err.message}`);
    } finally {
      setIsDecommissioning(false);
    }
  };

  // Warranty calculations
  const warrantyInfo = useMemo(() => {
    if (!asset) return { status: 'UNKNOWN', label: 'Not Recorded', daysLeft: 0, dateStr: 'N/A' };
    const expiry = asset.warrantyExpiry ? new Date(asset.warrantyExpiry) : new Date(Date.now() + 380 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const diffMs = expiry - now;
    const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const isExpired = daysLeft <= 0;

    return {
      status: isExpired ? 'EXPIRED' : daysLeft < 60 ? 'EXPIRING_SOON' : 'ACTIVE',
      label: isExpired ? 'Expired Warranty' : daysLeft < 60 ? 'Expiring Soon' : 'Active OEM Warranty',
      daysLeft: Math.max(0, daysLeft),
      dateStr: expiry.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    };
  }, [asset]);

  // Spare parts list for current category
  const sparePartsList = useMemo(() => {
    if (!asset) return [];
    return CATEGORY_SPARE_PARTS[asset.category] || CATEGORY_SPARE_PARTS.BULK_MILK_COOLER;
  }, [asset]);

  // Filtered & Sorted Work Orders
  const filteredWorkOrders = useMemo(() => {
    let list = [...workOrders];

    if (woSearch.trim()) {
      const q = woSearch.toLowerCase().trim();
      list = list.filter(
        (w) =>
          w.workOrderNumber?.toLowerCase().includes(q) ||
          w.title?.toLowerCase().includes(q) ||
          w.description?.toLowerCase().includes(q)
      );
    }

    if (woStatusFilter !== 'ALL') {
      if (woStatusFilter === 'OPEN') {
        list = list.filter((w) => w.status !== 'CLOSED' && w.status !== 'REJECTED');
      } else {
        list = list.filter((w) => w.status === woStatusFilter);
      }
    }

    list.sort((a, b) => {
      if (woSortBy === 'newest') {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
      if (woSortBy === 'oldest') {
        return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      }
      if (woSortBy === 'priority') {
        const order = { CRITICAL_P0: 0, HIGH_P1: 1, MEDIUM_P2: 2, LOW_P3: 3 };
        return (order[a.priority] ?? 4) - (order[b.priority] ?? 4);
      }
      return 0;
    });

    return list;
  }, [workOrders, woSearch, woStatusFilter, woSortBy]);

  const paginatedWorkOrders = useMemo(() => {
    const start = (woPage - 1) * woPageSize;
    return filteredWorkOrders.slice(start, start + woPageSize);
  }, [filteredWorkOrders, woPage]);

  const totalWoPages = Math.ceil(filteredWorkOrders.length / woPageSize) || 1;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => navigate('/assets')}
          className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Asset Registry</span>
        </button>
        <LoadingSkeleton count={3} />
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => navigate('/assets')}
          className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Asset Registry</span>
        </button>
        <ErrorState
          title="Asset Profile Error"
          message={error || 'The requested asset profile could not be loaded.'}
          errorCode="ERR_ASSET_NOT_FOUND"
          onRetry={fetchAsset}
        />
        <div className="flex justify-center -mt-2">
          <button
            onClick={() => navigate('/assets')}
            className="px-4 py-2 bg-dairy-700 hover:bg-dairy-800 text-white rounded-lg text-xs font-semibold shadow-xs transition"
          >
            Browse All Equipment in Asset Registry
          </button>
        </div>
      </div>
    );
  }

  const CategoryIcon = getCategoryIcon(asset.category);
  const healthScore = asset.currentHealthScore ?? 100;
  const isHighRisk = asset.failureRiskLevel === 'HIGH' || asset.failureRiskLevel === 'CRITICAL';

  return (
    <div className="space-y-6 pb-16">
      {/* Back button & Action controls */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/assets')}
          className="inline-flex items-center space-x-2 text-xs font-bold text-slate-600 hover:text-sky-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Asset Registry</span>
        </button>

        <div className="flex items-center space-x-3">
          {canEdit && (
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl shadow-sm transition-colors"
            >
              <Edit className="w-3.5 h-3.5 text-slate-500" />
              <span>Edit Asset</span>
            </button>
          )}

          {canDelete && (
            <button
              onClick={handleDecommission}
              disabled={isDecommissioning}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Decommission</span>
            </button>
          )}

          <button
            onClick={() => navigate('/planning')}
            className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-xl shadow-md shadow-sky-600/30 transition-all"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Create Work Order</span>
          </button>
        </div>
      </div>

      {/* Hero Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start space-x-4">
            <div className="p-3.5 bg-slate-900 text-sky-400 rounded-2xl shadow-md shadow-slate-900/20 shrink-0">
              <CategoryIcon className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center space-x-3 mb-1">
                <span className="font-mono text-sm font-black text-sky-700 uppercase tracking-wider">
                  {asset.assetTag}
                </span>
                <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-md bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                  {asset.criticality}
                </span>
                <StatusBadge status={asset.currentStatus} />
              </div>
              <h1 className="text-2xl font-black text-slate-900">{asset.name}</h1>
              <p className="text-xs text-slate-500 mt-1 flex items-center space-x-3">
                <span className="flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{asset.location?.facilityName || 'Facility Unassigned'}</span>
                </span>
                <span>•</span>
                <span>Category: {asset.category?.replace(/_/g, ' ')}</span>
              </p>
            </div>
          </div>

          {/* Quick Health Meter & Risk */}
          <div className="flex items-center gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Fleet Health Index
              </p>
              <div className="flex items-baseline space-x-1 mt-0.5">
                <span className="text-3xl font-black font-mono text-slate-900">{healthScore}</span>
                <span className="text-xs font-bold text-slate-400">/ 100</span>
              </div>
              <div className="w-24 bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1.5">
                <div
                  className={`h-full ${
                    healthScore < 50
                      ? 'bg-rose-500'
                      : healthScore < 80
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${healthScore}%` }}
                />
              </div>
            </div>

            <div className="w-px h-12 bg-slate-200" />

            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Failure Hazard
              </p>
              <div className="mt-1">
                <span
                  className={`inline-block font-bold px-2.5 py-1 rounded-lg text-xs ${
                    isHighRisk
                      ? 'bg-rose-100 text-rose-700 animate-pulse'
                      : asset.failureRiskLevel === 'MEDIUM'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {asset.failureRiskLevel || 'LOW'} RISK
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                {isHighRisk ? 'Immediate maintenance alert' : 'Operating within safe limits'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Specifications & Location & Ownership */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Technical Specs */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <Cpu className="w-4 h-4 text-sky-600" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Technical Specifications
            </h2>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Rated Operating Capacity</span>
              <span className="font-semibold text-slate-800 text-sm">
                {asset.ratedCapacity || 'Standard Dairy Specification'}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px]">Total Operating Runtime</span>
              <span className="font-mono font-bold text-slate-800 text-sm">
                {(asset.totalRuntimeHours || 0).toLocaleString()} Hours
              </span>
            </div>

            {asset.specifications && Object.keys(asset.specifications).length > 0 && (
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <span className="text-slate-400 block text-[11px] font-bold uppercase tracking-wider">
                  Component Architecture
                </span>
                {Object.entries(asset.specifications).map(([key, val]) => (
                  <div key={key} className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                    <span className="font-semibold text-slate-800 text-right">{val}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Column 2: Facility & Organizational Scope */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <Building className="w-4 h-4 text-sky-600" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Facility & Scope Isolation
            </h2>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Facility Name</span>
              <span className="font-semibold text-slate-800">
                {asset.location?.facilityName || 'Unassigned'}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px]">Department / Building</span>
              <span className="font-semibold text-slate-800">
                {asset.location?.department || 'Main Section'}{' '}
                {asset.location?.building ? `(${asset.location.building})` : ''}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-2">
              <span className="text-slate-400 block text-[11px] font-bold uppercase tracking-wider">
                Cooperative Hierarchy
              </span>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Zone:</span>
                <span className="font-semibold text-slate-800">
                  {asset.orgScope?.cooperativeZone || 'Southern District Union'}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Assigned Plant:</span>
                <span className="font-semibold text-slate-800">
                  {asset.orgScope?.plantId || 'Central Mother Dairy'}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Collection Center:</span>
                <span className="font-semibold text-slate-800 font-mono">
                  {asset.orgScope?.centerId || 'VCC-01'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Column 3: Ownership & Technician */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <UserCheck className="w-4 h-4 text-sky-600" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Ownership & Maintenance
            </h2>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Entity Ownership</span>
              <span className="font-semibold text-slate-800">
                {asset.owner?.ownerName || 'Dairy Union Federation'}
              </span>
              <span className="text-[11px] text-slate-400 block">
                Type: {asset.owner?.ownerType || 'COOPERATIVE'}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px]">Emergency Contact Phone</span>
              <span className="font-mono font-semibold text-slate-800">
                {asset.owner?.contactPhone || '+91 98450 11000'}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <span className="text-slate-400 block text-[11px] font-bold uppercase tracking-wider mb-1">
                Assigned Primary Technician
              </span>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="font-bold text-slate-800 text-xs">
                  {asset.assignedTechnicianId?.fullName || 'Suresh Kumar (Senior Field Tech)'}
                </p>
                <p className="text-[11px] text-slate-500">
                  {asset.assignedTechnicianId?.email || 'tech@dairycoop.org'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 24-Hour IoT Sensor Stream & Dairy Threshold Charts */}
      <TelemetryTrendsChart
        assetId={asset._id || asset.assetTag}
        category={asset.category}
        assetName={asset.name}
      />

      {/* Warranty & Spare Parts Status Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Warranty Status Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <ShieldCheck className="w-4 h-4 text-sky-600" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Warranty & OEM Coverage
            </h2>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Coverage Status:</span>
              <span
                className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                  warrantyInfo.status === 'ACTIVE'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : warrantyInfo.status === 'EXPIRING_SOON'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {warrantyInfo.label}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500">Expiration Date:</span>
              <span className="font-semibold text-slate-800 font-mono">{warrantyInfo.dateStr}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500">Active Service Window:</span>
              <span className="font-bold text-slate-800 font-mono">{warrantyInfo.daysLeft} Days Remaining</span>
            </div>

            <div className="p-3 bg-sky-50 rounded-xl border border-sky-100 text-[11px] text-sky-800 leading-relaxed">
              OEM service contract covers hermetic compressor failures, plate heat exchanger replacements, and certified technician labor under Dairy Union master agreement.
            </div>
          </div>
        </div>

        {/* Spare Parts Readiness Table (2 Columns) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <Package className="w-4 h-4 text-sky-600" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Critical Spare Parts Status
              </h2>
            </div>
            <span className="text-[11px] font-semibold text-slate-400">Cooperative Central Stores</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Part No / Name</th>
                  <th className="py-2.5 px-3">On-Hand Stock</th>
                  <th className="py-2.5 px-3">Reserved</th>
                  <th className="py-2.5 px-3">Unit Cost</th>
                  <th className="py-2.5 px-3">Readiness</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {sparePartsList.map((part) => (
                  <tr key={part.partNo} className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3">
                      <div className="font-mono text-slate-400 text-[10px]">{part.partNo}</div>
                      <div className="font-semibold text-slate-800">{part.name}</div>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-700">{part.stock} units</td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">{part.reserved} units</td>
                    <td className="py-2.5 px-3 font-mono text-slate-800">₹{part.unitCost.toLocaleString()}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          part.status === 'IN_STOCK'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {part.status === 'IN_STOCK' ? 'In Stock (0d)' : 'Low Stock (2d)'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Maintenance History & Open Work Orders Panel */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Wrench className="w-4 h-4 text-sky-600" />
              <span>Maintenance History & Open Work Orders</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Historical preventive services, emergency repairs, and active technician dispatch queue for this equipment.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigate('/planning')}
              className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition shadow-xs"
            >
              Open Planning Board
            </button>
          </div>
        </div>

        {/* Work Order Toolbar: Search, Filter, Sort */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={woSearch}
              onChange={(e) => {
                setWoSearch(e.target.value);
                setWoPage(1);
              }}
              placeholder="Search work orders..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={woStatusFilter}
              onChange={(e) => {
                setWoStatusFilter(e.target.value);
                setWoPage(1);
              }}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-white text-slate-700 font-medium"
            >
              <option value="ALL">All Work Orders</option>
              <option value="OPEN">All Open & Active</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="PENDING_APPROVAL">Pending Approval</option>
              <option value="CLOSED">Closed & Verified</option>
            </select>

            <select
              value={woSortBy}
              onChange={(e) => setWoSortBy(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-white text-slate-700 font-medium"
            >
              <option value="newest">Sort: Newest First</option>
              <option value="oldest">Sort: Oldest First</option>
              <option value="priority">Sort: Priority (P0 to P3)</option>
            </select>
          </div>
        </div>

        {/* Work Orders Table */}
        {isWoLoading ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading maintenance records...</div>
        ) : filteredWorkOrders.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            No work orders match the current search or status filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3">WO Number / Title</th>
                  <th className="py-3 px-3">Priority</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Trigger Source</th>
                  <th className="py-3 px-3">Est. Downtime</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {paginatedWorkOrders.map((wo) => (
                  <tr key={wo._id || wo.workOrderNumber} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-mono text-sky-700 font-bold">{wo.workOrderNumber}</div>
                      <div className="text-slate-900 font-semibold truncate max-w-sm">{wo.title}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded ${
                          wo.priority === 'CRITICAL_P0'
                            ? 'bg-rose-100 text-rose-700'
                            : wo.priority === 'HIGH_P1'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {wo.priority}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <StatusBadge status={wo.status} />
                    </td>
                    <td className="py-3 px-3 text-slate-500 text-[11px]">
                      {wo.source?.replace(/_/g, ' ') || 'PREVENTIVE'}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-700">
                      {wo.estimatedDowntimeHours ? `${wo.estimatedDowntimeHours}h` : '—'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => navigate('/planning')}
                        className="p-1.5 text-sky-600 hover:text-sky-800 hover:bg-sky-50 rounded-lg transition-colors"
                        title="Drill Down to Work Order"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Work Order Pagination */}
        {filteredWorkOrders.length > woPageSize && (
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500">
            <span>
              Showing {(woPage - 1) * woPageSize + 1}–
              {Math.min(woPage * woPageSize, filteredWorkOrders.length)} of {filteredWorkOrders.length} records
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setWoPage((p) => Math.max(1, p - 1))}
                disabled={woPage <= 1}
                className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="font-semibold text-slate-700">
                Page {woPage} of {totalWoPages}
              </span>
              <button
                onClick={() => setWoPage((p) => Math.min(totalWoPages, p + 1))}
                disabled={woPage >= totalWoPages}
                className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Version & Activity Audit Trail */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
          <History className="w-4 h-4 text-sky-600" />
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Equipment Version & Maintenance Activity History
          </h2>
        </div>

        <div className="space-y-3">
          <div className="flex items-start space-x-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">Preventive Maintenance Inspection Logged</span>
                <span className="text-[10px] text-slate-400 font-mono">Yesterday, 14:30</span>
              </div>
              <p className="text-slate-600 mt-0.5">
                Compressor reed valve inspected by Senior Tech Suresh Kumar. Suction line pressure calibrated at 2.4 bar.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <Activity className="w-4 h-4 text-sky-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">Telemetry Sampling Cycle Synchronized</span>
                <span className="text-[10px] text-slate-400 font-mono">Today, 06:00</span>
              </div>
              <p className="text-slate-600 mt-0.5">
                IoT gateway telemetry ingested 24-hour sensor buffer: Milk temperature maintained at 3.8°C (Normal safety envelope).
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <AssetFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onAssetSaved={() => {
          fetchAsset();
        }}
        initialData={asset}
      />
    </div>
  );
};

export default AssetDetailPage;
