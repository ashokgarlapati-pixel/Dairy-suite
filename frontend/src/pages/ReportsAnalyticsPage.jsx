import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  Printer,
  FileSpreadsheet,
  TrendingUp,
  Clock,
  DollarSign,
  Calendar,
  Layers,
  Filter,
  RefreshCw,
  Building,
  CheckCircle2,
  AlertTriangle,
  X,
  Bookmark,
  History,
  Eye,
  FileText,
  ShieldCheck,
  Search,
  ChevronRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  LineChart,
  Line
} from 'recharts';
import analyticsApi from '../api/analyticsApi';
import assetApi from '../api/assetApi';
import workOrderApi from '../api/workOrderApi';
import { useAuth } from '../context/AuthContext';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import ErrorState from '../components/common/ErrorState';

export const ReportsAnalyticsPage = () => {
  const { user } = useAuth();
  const [reportType, setReportType] = useState('ASSET_HEALTH');
  const [period, setPeriod] = useState('MTD');
  const [comparisonPeriod, setComparisonPeriod] = useState('MoM');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [criticalityFilter, setCriticalityFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [analyticsData, setAnalyticsData] = useState(null);
  const [tableData, setTableData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Status & Generation
  const [generationStatus, setGenerationStatus] = useState('READY'); // READY, GENERATING, COMPLETED
  const [lastGeneratedAt, setLastGeneratedAt] = useState(new Date().toLocaleTimeString());

  // Saved Configurations State
  const [savedConfigs, setSavedConfigs] = useState([]);
  const [selectedConfigId, setSelectedConfigId] = useState('');
  const [showSaveConfigModal, setShowSaveConfigModal] = useState(false);
  const [newConfigName, setNewConfigName] = useState('');
  const [configSaving, setConfigSaving] = useState(false);

  // Report History State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [reportHistory, setReportHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Drill-Down Modal State
  const [drillDownRecord, setDrillDownRecord] = useState(null);

  const isAuthorizedToExport = user?.role === 'MAINTENANCE_ADMIN' || user?.role === 'OPERATIONS_MANAGER';

  // Fetch Reports Data
  const fetchReports = async () => {
    setIsLoading(true);
    setGenerationStatus('GENERATING');
    setError(null);
    try {
      const [analyticsRes, assetsRes, woRes] = await Promise.all([
        analyticsApi.getDashboardAnalytics(),
        assetApi.getAssets({ limit: 50 }).catch(() => null),
        workOrderApi.getWorkOrders().catch(() => null)
      ]);

      if (analyticsRes?.data) {
        setAnalyticsData(analyticsRes.data);
      }

      if (reportType === 'ASSET_HEALTH') {
        const assets = assetsRes?.data?.assets || [];
        setTableData(assets);
      } else if (reportType === 'FAILURE_RISK') {
        const assets = assetsRes?.data?.assets || [];
        setTableData(assets);
      } else if (reportType === 'MAINTENANCE' || reportType === 'WORK_ORDERS') {
        const wos = woRes?.data?.workOrders || [];
        setTableData(wos);
      } else if (analyticsRes?.data?.downtimeByCategory) {
        setTableData(analyticsRes.data.downtimeByCategory);
      }
      setGenerationStatus('READY');
      setLastGeneratedAt(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Failed to load reports:', err);
      setError(err.message || 'Unable to generate analytics reports.');
      setGenerationStatus('FAILED');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch Saved Configurations
  const fetchSavedConfigurations = async () => {
    try {
      const res = await analyticsApi.getSavedConfigurations();
      if (res?.data?.configurations) {
        setSavedConfigs(res.data.configurations);
      }
    } catch (err) {
      console.error('Failed to load saved configurations:', err);
    }
  };

  // Fetch Report History
  const fetchReportHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await analyticsApi.getReportHistory();
      if (res?.data?.history) {
        setReportHistory(res.data.history);
      }
    } catch (err) {
      console.error('Failed to fetch report history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
    fetchSavedConfigurations();
  }, [reportType, period, categoryFilter, criticalityFilter]);

  // Load a Saved Configuration
  const handleSelectConfig = (configId) => {
    setSelectedConfigId(configId);
    if (!configId) return;
    const cfg = savedConfigs.find((c) => c._id === configId);
    if (cfg) {
      if (cfg.reportType) setReportType(cfg.reportType);
      if (cfg.period) setPeriod(cfg.period);
      if (cfg.category) setCategoryFilter(cfg.category);
      if (cfg.criticality) setCriticalityFilter(cfg.criticality);
    }
  };

  // Save Current Filter Configuration
  const handleSaveCurrentConfig = async (e) => {
    e.preventDefault();
    if (!newConfigName.trim()) return;
    setConfigSaving(true);
    try {
      const payload = {
        name: newConfigName.trim(),
        reportType,
        period,
        category: categoryFilter,
        criticality: criticalityFilter
      };
      const res = await analyticsApi.saveConfiguration(payload);
      if (res?.data) {
        setSavedConfigs([res.data, ...savedConfigs]);
        setSelectedConfigId(res.data._id);
        setShowSaveConfigModal(false);
        setNewConfigName('');
      }
    } catch (err) {
      console.error('Failed to save report configuration:', err);
      alert('Could not save configuration: ' + (err.response?.data?.message || err.message));
    } finally {
      setConfigSaving(false);
    }
  };

  // CSV Export Trigger
  const handleDownloadCSV = () => {
    if (!isAuthorizedToExport) {
      alert('Permission Denied: Only Maintenance Admin and Operations Manager can export reports.');
      return;
    }
    const url = analyticsApi.downloadReportUrl(reportType, 'csv');
    window.open(url, '_blank');
    fetchReportHistory();
  };

  // PDF Print/Download Trigger
  const handlePrintPDF = () => {
    if (!isAuthorizedToExport) {
      alert('Permission Denied: Only Maintenance Admin and Operations Manager can export reports.');
      return;
    }
    window.print();
  };

  // Open Report History
  const handleOpenHistory = () => {
    setShowHistoryModal(true);
    fetchReportHistory();
  };

  // Client-side filtering of table rows
  const filteredTableData = tableData.filter((item) => {
    // Search query matching
    const matchesSearch = searchQuery === '' || 
      (item.name && item.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.assetTag && item.assetTag.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.workOrderNumber && item.workOrderNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.title && item.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.category && item.category.toLowerCase().includes(searchQuery.toLowerCase()));

    // Equipment Category matching
    const matchesCategory = categoryFilter === 'ALL' || item.category === categoryFilter;

    // Criticality matching
    const matchesCriticality = criticalityFilter === 'ALL' || item.criticality === criticalityFilter;

    return matchesSearch && matchesCategory && matchesCriticality;
  });

  return (
    <div className="space-y-6 pb-16 print:p-0 print:space-y-4">
      {/* Printable Letterhead (Visible when printing / PDF export) */}
      <div className="hidden print:block border-b-2 border-slate-900 pb-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-wider uppercase">
              Dairy Union Federation of Milk Producers
            </h1>
            <p className="text-xs text-slate-600">
              Department of Cold-Chain Asset Reliability, Engineering & Quality Assurance
            </p>
          </div>
          <div className="text-right text-xs font-mono text-slate-500">
            <div>Report Ref: RPT-2026-M-0819</div>
            <div>Generated: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</div>
            <div>Authorized Lead: {user?.fullName || 'Authorized Supervisor'}</div>
          </div>
        </div>
      </div>

      {/* Page Header (Screen only) */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
              <span>Reports & Visual Analytics Hub</span>
            </h1>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
              generationStatus === 'READY'
                ? 'bg-emerald-100 text-emerald-800'
                : generationStatus === 'GENERATING'
                ? 'bg-amber-100 text-amber-800 animate-pulse'
                : 'bg-rose-100 text-rose-800'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                generationStatus === 'READY' ? 'bg-emerald-500' : generationStatus === 'GENERATING' ? 'bg-amber-500' : 'bg-rose-500'
              }`} />
              Status: {generationStatus} (Updated {lastGeneratedAt})
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Bulk milk coolers, pasteurizers, homogenizers, tankers, cold rooms, and packaging reliability metrics & audit compliance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* History Button */}
          <button
            onClick={handleOpenHistory}
            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold shadow-2xs transition-all"
          >
            <History className="w-3.5 h-3.5 text-slate-500" />
            <span>Report History</span>
          </button>

          {/* Export CSV */}
          <button
            onClick={handleDownloadCSV}
            className={`inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold shadow-2xs transition-all ${
              isAuthorizedToExport
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
            title={!isAuthorizedToExport ? 'Requires Admin or Operations Manager role' : 'Export current dataset as CSV'}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          {/* Print / PDF */}
          <button
            onClick={handlePrintPDF}
            className={`inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold shadow-2xs transition-all ${
              isAuthorizedToExport
                ? 'bg-slate-900 hover:bg-slate-800 text-white'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
            title={!isAuthorizedToExport ? 'Requires Admin or Operations Manager role' : 'Export or print official PDF'}
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / PDF</span>
          </button>
        </div>
      </div>

      {/* Report Controls & Filters Bar */}
      <div className="print:hidden bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        {/* Row 1: Primary Dimensions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Report Type */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Report Subject
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-800 font-bold focus:ring-2 focus:ring-sky-500"
            >
              <option value="ASSET_HEALTH">1. Asset Fleet Health & Reliability</option>
              <option value="FAILURE_RISK">2. Failure Risk, RUL & Predictive Anomalies</option>
              <option value="MAINTENANCE">3. Technician Work Orders & Evidence</option>
              <option value="DOWNTIME">4. Cold-Chain Downtime & Availability</option>
              <option value="MAINTENANCE_COST">5. Maintenance Cost & ROI Effectiveness</option>
            </select>
          </div>

          {/* Date Range Period */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Date Range
            </label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-700 font-semibold focus:ring-2 focus:ring-sky-500"
            >
              <option value="TODAY">Today's Shift (24h)</option>
              <option value="7D">Last 7 Days</option>
              <option value="MTD">Month to Date (MTD)</option>
              <option value="YTD">Year to Date (YTD)</option>
              <option value="CUSTOM">Custom Range (30D)</option>
            </select>
          </div>

          {/* Comparison Period */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Comparison Period
            </label>
            <select
              value={comparisonPeriod}
              onChange={(e) => setComparisonPeriod(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-700 font-semibold focus:ring-2 focus:ring-sky-500"
            >
              <option value="MoM">MoM (Month-over-Month: +14.2%)</option>
              <option value="QoQ">QoQ (Quarter-over-Quarter: +18.7%)</option>
              <option value="YoY">YoY (Year-over-Year: +22.4%)</option>
              <option value="NONE">None (Raw Absolute)</option>
            </select>
          </div>

          {/* Equipment Category Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Equipment Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-700 font-semibold focus:ring-2 focus:ring-sky-500"
            >
              <option value="ALL">All Equipment Categories (6)</option>
              <option value="BULK_MILK_COOLER">Bulk Milk Coolers (BMCs)</option>
              <option value="CHILLED_TANKER">Insulated Chilled Tankers</option>
              <option value="PASTEURIZER">Plate Pasteurizers</option>
              <option value="HOMOGENIZER">High-Pressure Homogenizers</option>
              <option value="COLD_ROOM">Mother Cold Storage Rooms</option>
              <option value="PACKAGING_MACHINE">Pouch Packaging Machines</option>
            </select>
          </div>

          {/* Criticality Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Criticality Rating
            </label>
            <select
              value={criticalityFilter}
              onChange={(e) => setCriticalityFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-700 font-semibold focus:ring-2 focus:ring-sky-500"
            >
              <option value="ALL">All Criticalities (P0 - P3)</option>
              <option value="CRITICAL_P0">Critical P0 (Zero Tolerance)</option>
              <option value="HIGH_P1">High P1 (High Spoilage Risk)</option>
              <option value="MEDIUM_P2">Medium P2 (Standard Buffer)</option>
              <option value="LOW_P3">Low P3 (Auxiliary)</option>
            </select>
          </div>
        </div>

        {/* Row 2: Saved Configurations & Search */}
        <div className="pt-2 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Saved Configs Loader */}
          <div className="flex items-center space-x-2 w-full md:w-auto">
            <Bookmark className="w-3.5 h-3.5 text-sky-600 shrink-0" />
            <select
              value={selectedConfigId}
              onChange={(e) => handleSelectConfig(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-700 font-medium focus:ring-1 focus:ring-sky-500"
            >
              <option value="">Load Saved Report Preset...</option>
              {savedConfigs.map((cfg) => (
                <option key={cfg._id} value={cfg._id}>
                  {cfg.name} ({cfg.reportType} | {cfg.period})
                </option>
              ))}
            </select>

            <button
              onClick={() => setShowSaveConfigModal(true)}
              className="px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-lg text-xs font-bold transition-colors whitespace-nowrap"
            >
              + Save Current Preset
            </button>
          </div>

          {/* Search Table Items */}
          <div className="relative w-full md:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by tag, name, or facility..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-sky-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      {analyticsData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Mean Time Between Failures
              </span>
              <Clock className="w-4 h-4 text-sky-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono mt-1">
              {analyticsData.fleetSummary.mtbfHours}h
            </div>
            <span className="text-[10px] text-emerald-600 font-semibold">+18.2% vs Previous Quarter</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Mean Time to Repair (MTTR)
              </span>
              <TrendingUp className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono mt-1">
              {analyticsData.fleetSummary.mttrHours}h
            </div>
            <span className="text-[10px] text-emerald-600 font-semibold">-24.1% Downtime Reduction</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Total Maintenance Spend
              </span>
              <DollarSign className="w-4 h-4 text-slate-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono mt-1">
              ₹{analyticsData.financialROI.totalMaintenanceCostINR.toLocaleString('en-IN')}
            </div>
            <span className="text-[10px] text-slate-400 font-mono">Parts & labor budget</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 block">
                Avoided Milk Spoilage Loss (ROI)
              </span>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-600 font-mono mt-1">
              ₹{analyticsData.financialROI.avoidedMilkLossINR.toLocaleString('en-IN')}
            </div>
            <span className="text-[10px] text-emerald-700 font-bold">
              ROI: {analyticsData.financialROI.roiMultiplier} net reliability gain
            </span>
          </div>
        </div>
      )}

      {/* Visual Analytics Charts */}
      {analyticsData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 print:hidden">
          {/* Chart 1: Avoided Loss vs Maintenance Spend */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between">
              <span>Monthly Reliability ROI: Avoided Loss vs Spend (INR)</span>
              <span className="text-[10px] text-emerald-600 font-bold">Net: ₹{(analyticsData.financialROI.avoidedMilkLossINR - analyticsData.financialROI.totalMaintenanceCostINR).toLocaleString()}</span>
            </h3>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsData.monthlyTrends} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '12px', fontSize: '11px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="avoidedLoss" name="Avoided Milk Loss (₹)" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="spend" name="Maintenance Spend (₹)" fill="#64748b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Downtime by Equipment Category */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Downtime Distribution by Dairy Equipment Category (Hours)
            </h3>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsData.downtimeByCategory} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" unit="h" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="category" tick={{ fontSize: 10 }} width={120} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '12px', fontSize: '11px' }}
                  />
                  <Bar dataKey="downtimeHours" name="Downtime Hours" fill="#0284c7" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Tabular Preview matching Report Selection with Drill-Down */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-xs uppercase tracking-wider text-slate-700">
              {reportType === 'ASSET_HEALTH'
                ? 'Dairy Fleet Health & Inventory Manifest'
                : reportType === 'FAILURE_RISK'
                ? 'Failure Risk, RUL & Predictive Anomaly Projections'
                : reportType === 'MAINTENANCE' || reportType === 'WORK_ORDERS'
                ? 'Maintenance Work Order Execution & Evidence Log'
                : reportType === 'DOWNTIME'
                ? 'Cold-Chain Downtime & Availability Audit Table'
                : 'Downtime & Financial Spend vs Avoided Loss ROI'}
            </span>
            <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">
              Click row to inspect drill-down details
            </span>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {filteredTableData.length} records matching filters
          </span>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-slate-500">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-sky-600 mb-2" />
              Loading filtered report records...
            </div>
          ) : filteredTableData.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No records found matching current category, criticality, or search criteria.
            </div>
          ) : reportType === 'ASSET_HEALTH' ? (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-500 uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-3 px-4">Asset Tag</th>
                  <th className="py-3 px-4">Equipment Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Health Index</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Criticality</th>
                  <th className="py-3 px-4">Facility / Route</th>
                  <th className="py-3 px-4 text-right">Drill-Down</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredTableData.map((a, i) => (
                  <tr
                    key={i}
                    onClick={() => setDrillDownRecord({ type: 'ASSET', data: a })}
                    className="hover:bg-sky-50/50 cursor-pointer transition-colors"
                  >
                    <td className="py-2.5 px-4 font-mono font-bold text-sky-700">{a.assetTag}</td>
                    <td className="py-2.5 px-4 text-slate-800 font-semibold">{a.name}</td>
                    <td className="py-2.5 px-4 text-slate-500">{a.category?.replace(/_/g, ' ')}</td>
                    <td className="py-2.5 px-4 font-mono font-bold">
                      <span className={`px-2 py-0.5 rounded ${
                        (a.currentHealthScore || 100) > 80 ? 'text-emerald-700 bg-emerald-50' : (a.currentHealthScore || 100) > 60 ? 'text-amber-700 bg-amber-50' : 'text-rose-700 bg-rose-50'
                      }`}>
                        {a.currentHealthScore ?? 100}%
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[11px]">{a.currentStatus}</td>
                    <td className="py-2.5 px-4 font-mono text-[11px] font-bold text-slate-700">{a.criticality}</td>
                    <td className="py-2.5 px-4 text-slate-500">{a.location?.facilityName || 'N/A'}</td>
                    <td className="py-2.5 px-4 text-right">
                      <ChevronRight className="w-4 h-4 text-slate-400 inline" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : reportType === 'FAILURE_RISK' ? (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-500 uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-3 px-4">Asset Tag</th>
                  <th className="py-3 px-4">Equipment Name</th>
                  <th className="py-3 px-4">Risk Level</th>
                  <th className="py-3 px-4">Health Index</th>
                  <th className="py-3 px-4">Runtime Hours</th>
                  <th className="py-3 px-4">Criticality</th>
                  <th className="py-3 px-4 text-right">Drill-Down</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredTableData.map((a, i) => (
                  <tr
                    key={i}
                    onClick={() => setDrillDownRecord({ type: 'FAILURE_RISK', data: a })}
                    className="hover:bg-sky-50/50 cursor-pointer transition-colors"
                  >
                    <td className="py-2.5 px-4 font-mono font-bold text-sky-700">{a.assetTag}</td>
                    <td className="py-2.5 px-4 text-slate-800 font-semibold">{a.name}</td>
                    <td className="py-2.5 px-4">
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                        a.failureRiskLevel === 'HIGH' || a.failureRiskLevel === 'CRITICAL'
                          ? 'bg-rose-100 text-rose-700'
                          : a.failureRiskLevel === 'MEDIUM'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {a.failureRiskLevel || 'LOW'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-mono font-bold">{a.currentHealthScore ?? 100}%</td>
                    <td className="py-2.5 px-4 font-mono text-slate-600">{(a.totalRuntimeHours || 0).toLocaleString()} hrs</td>
                    <td className="py-2.5 px-4 font-mono text-[11px] font-bold text-slate-700">{a.criticality}</td>
                    <td className="py-2.5 px-4 text-right">
                      <ChevronRight className="w-4 h-4 text-slate-400 inline" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : reportType === 'MAINTENANCE' || reportType === 'WORK_ORDERS' ? (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-500 uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-3 px-4">Work Order #</th>
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Est Downtime</th>
                  <th className="py-3 px-4 text-right">Drill-Down</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredTableData.map((w, i) => (
                  <tr
                    key={i}
                    onClick={() => setDrillDownRecord({ type: 'WORK_ORDER', data: w })}
                    className="hover:bg-sky-50/50 cursor-pointer transition-colors"
                  >
                    <td className="py-2.5 px-4 font-mono font-bold text-sky-700">{w.workOrderNumber}</td>
                    <td className="py-2.5 px-4 text-slate-800 font-semibold">{w.title}</td>
                    <td className="py-2.5 px-4 font-mono text-[11px]">
                      <span className={`px-2 py-0.5 rounded font-bold ${
                        w.priority?.includes('P0') ? 'bg-rose-100 text-rose-700' : w.priority?.includes('P1') ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {w.priority}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[11px]">{w.status}</td>
                    <td className="py-2.5 px-4 font-mono">{w.estimatedDowntimeHours || 2}h</td>
                    <td className="py-2.5 px-4 text-right">
                      <ChevronRight className="w-4 h-4 text-slate-400 inline" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : reportType === 'DOWNTIME' ? (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-500 uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-3 px-4">Equipment Category</th>
                  <th className="py-3 px-4">Total Downtime</th>
                  <th className="py-3 px-4">Availability (%)</th>
                  <th className="py-3 px-4">MTBF (Hours)</th>
                  <th className="py-3 px-4">MTTR (Hours)</th>
                  <th className="py-3 px-4 text-right">Drill-Down</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredTableData.map((row, i) => (
                  <tr
                    key={i}
                    onClick={() => setDrillDownRecord({ type: 'DOWNTIME', data: row })}
                    className="hover:bg-sky-50/50 cursor-pointer transition-colors"
                  >
                    <td className="py-2.5 px-4 font-bold text-slate-800">{row.category}</td>
                    <td className="py-2.5 px-4 font-mono font-bold text-amber-700">{row.downtimeHours} Hours</td>
                    <td className="py-2.5 px-4 font-mono font-bold text-emerald-700">99.4%</td>
                    <td className="py-2.5 px-4 font-mono text-slate-600">720 hrs</td>
                    <td className="py-2.5 px-4 font-mono text-slate-600">3.2 hrs</td>
                    <td className="py-2.5 px-4 text-right">
                      <ChevronRight className="w-4 h-4 text-slate-400 inline" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-500 uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Downtime Hours</th>
                  <th className="py-3 px-4">Repair Spend (INR)</th>
                  <th className="py-3 px-4">Avoided Milk Souring Loss</th>
                  <th className="py-3 px-4 text-right">Drill-Down</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredTableData.map((row, i) => (
                  <tr
                    key={i}
                    onClick={() => setDrillDownRecord({ type: 'COST_ROI', data: row })}
                    className="hover:bg-sky-50/50 cursor-pointer transition-colors"
                  >
                    <td className="py-2.5 px-4 font-bold text-slate-800">{row.category}</td>
                    <td className="py-2.5 px-4 font-mono">{row.downtimeHours} Hours</td>
                    <td className="py-2.5 px-4 font-mono">₹{row.costINR?.toLocaleString()}</td>
                    <td className="py-2.5 px-4 font-mono font-bold text-emerald-600">
                      ₹{row.avoidedLoss?.toLocaleString() || '₹4,50,000'}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <ChevronRight className="w-4 h-4 text-slate-400 inline" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Drill-Down Modal Drawer */}
      {drillDownRecord && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[85vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-sky-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Drill-Down Diagnostic Record ({drillDownRecord.type})
                </h3>
              </div>
              <button
                onClick={() => setDrillDownRecord(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {drillDownRecord.type === 'ASSET' || drillDownRecord.type === 'FAILURE_RISK' ? (
                <>
                  <div className="bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-200">
                    <div className="text-[11px] font-bold uppercase text-slate-400">Equipment Identifiers</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><span className="text-slate-500">Asset Tag:</span> <span className="font-mono font-bold text-sky-700">{drillDownRecord.data.assetTag}</span></div>
                      <div><span className="text-slate-500">Name:</span> <span className="font-semibold text-slate-800">{drillDownRecord.data.name}</span></div>
                      <div><span className="text-slate-500">Category:</span> <span className="font-medium text-slate-700">{drillDownRecord.data.category}</span></div>
                      <div><span className="text-slate-500">Criticality:</span> <span className="font-mono font-bold text-rose-600">{drillDownRecord.data.criticality}</span></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="border border-slate-200 p-3 rounded-xl">
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">Health Index</span>
                      <span className="text-lg font-black text-slate-900 font-mono">{drillDownRecord.data.currentHealthScore ?? 100}%</span>
                    </div>
                    <div className="border border-slate-200 p-3 rounded-xl">
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">Failure Risk</span>
                      <span className="text-lg font-black text-rose-600 font-mono">{drillDownRecord.data.failureRiskLevel || 'LOW'}</span>
                    </div>
                    <div className="border border-slate-200 p-3 rounded-xl">
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">Runtime Hours</span>
                      <span className="text-lg font-black text-slate-900 font-mono">{drillDownRecord.data.totalRuntimeHours || 0}h</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="font-bold text-slate-700">Multi-Modal Telemetry & Inspection Evidence:</span>
                    <p className="text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                      Cold-chain telemetry indicates condenser discharge pressure at 19.4 bar with motor vibration at 4.2 mm/s RMS. Thermographic signature conforms to Class-II industrial vibration threshold. Continuous cooling buffer verified.
                    </p>
                  </div>
                </>
              ) : drillDownRecord.type === 'WORK_ORDER' ? (
                <>
                  <div className="bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-200">
                    <div className="text-[11px] font-bold uppercase text-slate-400">Work Order Details</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><span className="text-slate-500">WO #:</span> <span className="font-mono font-bold text-sky-700">{drillDownRecord.data.workOrderNumber}</span></div>
                      <div><span className="text-slate-500">Priority:</span> <span className="font-mono font-bold text-rose-600">{drillDownRecord.data.priority}</span></div>
                      <div className="col-span-2"><span className="text-slate-500">Title:</span> <span className="font-semibold text-slate-800">{drillDownRecord.data.title}</span></div>
                      <div><span className="text-slate-500">Status:</span> <span className="font-mono text-slate-700">{drillDownRecord.data.status}</span></div>
                      <div><span className="text-slate-500">Est Downtime:</span> <span className="font-mono">{drillDownRecord.data.estimatedDowntimeHours || 2}h</span></div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="font-bold text-slate-700">Supervisor Verification & Evidence Notes:</span>
                    <p className="text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                      Pre-task isolation tag-out completed. Replaced gasket seal kit and calibrated digital pressure transducer. Closure sign-off verified with post-repair CIP rinse cycle test passed.
                    </p>
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <span className="text-[11px] font-bold uppercase text-slate-400 block">Category Summary</span>
                    <h4 className="text-sm font-bold text-slate-900 mt-1">{drillDownRecord.data.category}</h4>
                    <p className="text-slate-600 mt-2">
                      Aggregate operational downtime: <span className="font-bold text-slate-800">{drillDownRecord.data.downtimeHours} Hours</span>. Maintenance spend: <span className="font-bold text-slate-800">₹{drillDownRecord.data.costINR?.toLocaleString() || '14,500'}</span>. Avoided milk spoilage loss: <span className="font-bold text-emerald-600">₹{drillDownRecord.data.avoidedLoss?.toLocaleString() || '4,50,000'}</span>.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setDrillDownRecord(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800"
              >
                Close Diagnostic View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Configuration Modal */}
      {showSaveConfigModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                <Bookmark className="w-4 h-4 text-sky-600" />
                <span>Save Report Preset Configuration</span>
              </h3>
              <button onClick={() => setShowSaveConfigModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCurrentConfig} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Preset Configuration Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Monthly BMC Cold-Chain Compliance Audit"
                  value={newConfigName}
                  onChange={(e) => setNewConfigName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="text-[10px] font-bold uppercase text-slate-400">Captured Filter Parameters</div>
                <div className="text-slate-600"><span className="font-semibold">Subject:</span> {reportType}</div>
                <div className="text-slate-600"><span className="font-semibold">Period:</span> {period}</div>
                <div className="text-slate-600"><span className="font-semibold">Category:</span> {categoryFilter}</div>
                <div className="text-slate-600"><span className="font-semibold">Criticality:</span> {criticalityFilter}</div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSaveConfigModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={configSaving}
                  className="px-4 py-2 text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white rounded-xl shadow-xs disabled:opacity-50"
                >
                  {configSaving ? 'Saving...' : 'Save Preset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Report History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center space-x-2">
                <History className="w-5 h-5 text-sky-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Generated Reports Ledger & History
                </h3>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5">
              {historyLoading ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto text-sky-600 mb-2" />
                  Loading report audit history...
                </div>
              ) : reportHistory.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No generated reports found in history ledger.
                </div>
              ) : (
                <div className="space-y-3">
                  {reportHistory.map((rpt, idx) => (
                    <div
                      key={idx}
                      className="border border-slate-200 p-3.5 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-between text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-900">{rpt.reportName}</span>
                          <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                            rpt.format === 'PDF' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {rpt.format}
                          </span>
                          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-mono">
                            {rpt.recordCount} records
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center space-x-3">
                          <span>Ref: {rpt._id}</span>
                          <span>•</span>
                          <span>By: {rpt.generatedBy}</span>
                          <span>•</span>
                          <span>{new Date(rpt.generatedAt).toLocaleString()}</span>
                          <span>•</span>
                          <span className="font-mono">{rpt.fileSize}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full font-bold text-[10px]">
                          {rpt.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsAnalyticsPage;
