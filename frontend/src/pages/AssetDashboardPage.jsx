import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  LayoutGrid,
  List,
  RefreshCw,
  Activity,
  AlertTriangle,
  ShieldAlert,
  Server,
  Snowflake,
  Flame,
  Truck,
  Layers,
  Box,
  ChevronLeft,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import assetApi from '../api/assetApi';
import { useAuth } from '../context/AuthContext';
import AssetCard from '../components/assets/AssetCard';
import AssetFormModal from '../components/assets/AssetFormModal';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';

const CATEGORY_TABS = [
  { id: '', label: 'All Equipment', icon: Server },
  { id: 'BULK_MILK_COOLER', label: 'BMCs', icon: Snowflake },
  { id: 'PASTEURIZER', label: 'Pasteurizers', icon: Flame },
  { id: 'CHILLED_TANKER', label: 'Tankers', icon: Truck },
  { id: 'HOMOGENIZER', label: 'Homogenizers', icon: Layers },
  { id: 'COLD_ROOM', label: 'Cold Rooms', icon: Snowflake },
  { id: 'PACKAGING_MACHINE', label: 'Packaging', icon: Box }
];

export const AssetDashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canRegister = user?.role === 'MAINTENANCE_ADMIN' || user?.role === 'OPERATIONS_MANAGER';
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSearch = searchParams.get('search') || '';

  // Data states
  const [assets, setAssets] = useState([]);
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, totalPages: 1, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter & View states
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState(urlSearch);
  const [statusFilter, setStatusFilter] = useState('');
  const [criticalityFilter, setCriticalityFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  // Sync when URL query parameter changes
  useEffect(() => {
    if (urlSearch !== searchQuery) {
      setSearchQuery(urlSearch);
    }
  }, [urlSearch]);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch Assets
  const fetchAssets = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search: searchQuery.trim() || undefined,
        category: selectedCategory || undefined,
        currentStatus: statusFilter || undefined,
        criticality: criticalityFilter || undefined,
        failureRiskLevel: riskFilter || undefined,
        ownerType: ownerFilter || undefined,
        location: locationFilter.trim() || undefined
      };

      const [assetsRes, statsRes] = await Promise.all([
        assetApi.getAssets(params),
        assetApi.getAssetStats().catch(() => null)
      ]);

      if (assetsRes?.data) {
        setAssets(assetsRes.data.assets || []);
        if (assetsRes.data.pagination) {
          setPagination((prev) => ({
            ...prev,
            ...assetsRes.data.pagination
          }));
        }
      }

      if (statsRes?.data) {
        setStats(statsRes.data);
      }
    } catch (err) {
      console.error('Fetch assets failed:', err);
      setError(err.message || 'Unable to connect to asset registry service.');
    } finally {
      setIsLoading(false);
    }
  }, [
    pagination.page,
    pagination.limit,
    selectedCategory,
    searchQuery,
    statusFilter,
    criticalityFilter,
    riskFilter,
    ownerFilter,
    locationFilter
  ]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const handleAssetSaved = () => {
    fetchAssets();
  };

  const clearFilters = () => {
    setSelectedCategory('');
    setSearchQuery('');
    setStatusFilter('');
    setCriticalityFilter('');
    setRiskFilter('');
    setOwnerFilter('');
    setLocationFilter('');
    setSearchParams({});
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const hasActiveFilters =
    Boolean(selectedCategory) ||
    Boolean(searchQuery) ||
    Boolean(statusFilter) ||
    Boolean(criticalityFilter) ||
    Boolean(riskFilter) ||
    Boolean(ownerFilter) ||
    Boolean(locationFilter);

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <span>Dairy Asset Registry & Health Dashboard</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time condition monitoring, failure risk indicators, and asset health across chilling centers & processing plants.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => fetchAssets()}
            className="p-2.5 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm transition-colors"
            title="Refresh Registry"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-sky-600' : ''}`} />
          </button>

          {canRegister && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-sm font-bold rounded-xl shadow-md shadow-sky-600/25 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Register Equipment</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Assets */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Assets
            </p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">
              {stats?.totalAssets ?? assets.length}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">BMCs, Tankers, Lines</p>
          </div>
          <div className="p-3 bg-sky-50 text-sky-600 rounded-xl">
            <Server className="w-6 h-6" />
          </div>
        </div>

        {/* Fleet Health Index */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Fleet Health Index
            </p>
            <h3 className="text-2xl font-black text-emerald-600 mt-1">
              {stats?.avgHealthScore ?? 85}%
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Weighted condition metric</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        {/* Warning / Critical Faults */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Critical Faults (P0)
            </p>
            <h3 className="text-2xl font-black text-rose-600 mt-1">
              {stats?.criticalFaultCount ?? 0}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {stats?.warningCount ?? 0} in Warning state
            </p>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>

        {/* High Risk Assets */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Imminent Risk Assets
            </p>
            <h3 className="text-2xl font-black text-amber-600 mt-1">
              {stats?.highRiskCount ?? 0}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">RUL &lt; 7 Days breakdown hazard</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Category Pills Bar */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORY_TABS.map((tab) => {
          const Icon = tab.icon;
          const isSelected = selectedCategory === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setSelectedCategory(tab.id);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className={`inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              placeholder="Search asset tag, name, facility..."
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-transparent placeholder:text-slate-400"
            />
          </div>

          {/* Filters & View Switcher */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
            {/* Status Dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white text-slate-700 font-medium focus:ring-2 focus:ring-sky-500"
            >
              <option value="">All Statuses</option>
              <option value="OPERATIONAL">Operational</option>
              <option value="WARNING">Warning</option>
              <option value="CRITICAL_FAULT">Critical Fault</option>
              <option value="UNDER_MAINTENANCE">Under Maintenance</option>
            </select>

            {/* Criticality Dropdown */}
            <select
              value={criticalityFilter}
              onChange={(e) => {
                setCriticalityFilter(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white text-slate-700 font-medium focus:ring-2 focus:ring-sky-500"
            >
              <option value="">All Criticalities</option>
              <option value="CRITICAL_P0">P0 - Critical</option>
              <option value="HIGH_P1">P1 - High</option>
              <option value="MEDIUM_P2">P2 - Medium</option>
              <option value="LOW_P3">P3 - Low</option>
            </select>

            {/* Risk Dropdown */}
            <select
              value={riskFilter}
              onChange={(e) => {
                setRiskFilter(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white text-slate-700 font-medium focus:ring-2 focus:ring-sky-500"
            >
              <option value="">All Risk Levels</option>
              <option value="LOW">Low Risk</option>
              <option value="MEDIUM">Medium Risk</option>
              <option value="HIGH">High Risk</option>
              <option value="CRITICAL">Critical Risk</option>
            </select>

            {/* Owner Dropdown */}
            <select
              value={ownerFilter}
              onChange={(e) => {
                setOwnerFilter(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white text-slate-700 font-medium focus:ring-2 focus:ring-sky-500"
            >
              <option value="">All Owners</option>
              <option value="COOPERATIVE">Cooperative Owned</option>
              <option value="VILLAGE_SOCIETY">Village Society Owned</option>
              <option value="CONTRACTOR">Contractor / Third-Party</option>
            </select>

            {/* Location / Facility Quick Search */}
            <input
              type="text"
              value={locationFilter}
              onChange={(e) => {
                setLocationFilter(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              placeholder="Filter location..."
              className="w-32 px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white text-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-sky-500"
            />

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors"
              >
                Clear Filters
              </button>
            )}

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-white text-sky-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'table'
                    ? 'bg-white text-sky-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Table View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <LoadingSkeleton count={6} />
      ) : error ? (
        <ErrorState
          title="Failed to Load Asset Registry"
          message={error}
          onRetry={fetchAssets}
        />
      ) : assets.length === 0 ? (
        <EmptyState
          title="No Dairy Assets Found"
          message={
            hasActiveFilters
              ? 'No assets match the current filter criteria. Try resetting your search or filter selections.'
              : 'The asset registry is currently empty. Click below to register your first Bulk Milk Cooler, Pasteurizer, or Tanker.'
          }
          actionLabel={canRegister ? 'Register First Equipment' : undefined}
          onAction={canRegister ? () => setIsModalOpen(true) : undefined}
        />
      ) : viewMode === 'grid' ? (
        /* Card Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {assets.map((asset) => (
            <AssetCard key={asset._id || asset.assetTag} asset={asset} />
          ))}
        </div>
      ) : (
        /* Tabular View */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Asset Tag / Name</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Health Index</th>
                  <th className="py-3.5 px-4">Failure Risk</th>
                  <th className="py-3.5 px-4">Facility / Location</th>
                  <th className="py-3.5 px-4">Criticality</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {assets.map((asset) => (
                  <tr
                    key={asset._id || asset.assetTag}
                    onClick={() => navigate(`/assets/${asset.assetTag || asset._id}`)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-sky-700">{asset.assetTag}</div>
                      <div className="text-slate-900 font-semibold">{asset.name}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {asset.category?.replace(/_/g, ' ')}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={asset.currentStatus} />
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold">
                      <div className="flex items-center space-x-2">
                        <span>{asset.currentHealthScore ?? 100}%</span>
                        <div className="w-16 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              (asset.currentHealthScore ?? 100) < 50
                                ? 'bg-rose-500'
                                : (asset.currentHealthScore ?? 100) < 80
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${asset.currentHealthScore ?? 100}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                          asset.failureRiskLevel === 'CRITICAL' || asset.failureRiskLevel === 'HIGH'
                            ? 'bg-rose-100 text-rose-700'
                            : asset.failureRiskLevel === 'MEDIUM'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {asset.failureRiskLevel || 'LOW'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">
                      {asset.location?.facilityName || 'Unassigned'}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] font-semibold text-slate-700">
                      {asset.criticality}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/assets/${asset.assetTag || asset._id}`);
                        }}
                        className="p-1.5 text-sky-600 hover:text-sky-800 hover:bg-sky-50 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {pagination.total > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-slate-500">
          <p>
            Showing <span className="font-semibold text-slate-900">{assets.length}</span> of{' '}
            <span className="font-semibold text-slate-900">{pagination.total}</span> registered dairy
            assets
          </p>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
              disabled={pagination.page <= 1}
              className="p-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 font-semibold text-slate-700">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() =>
                setPagination((prev) => ({
                  ...prev,
                  page: Math.min(prev.totalPages, prev.page + 1)
                }))
              }
              disabled={pagination.page >= pagination.totalPages}
              className="p-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Registration Modal */}
      <AssetFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAssetSaved={handleAssetSaved}
      />
    </div>
  );
};

export default AssetDashboardPage;
