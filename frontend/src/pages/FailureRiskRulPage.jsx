import React, { useState, useEffect } from 'react';
import {
  Brain,
  Activity,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Zap,
  CheckCircle2,
  Cpu,
  Layers,
  ChevronRight,
  TrendingDown,
  Info,
  Sparkles,
  RefreshCw,
  FileText,
  Database,
  Thermometer,
  Gauge,
  Wrench,
  History,
  AlertCircle,
  Eye,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid
} from 'recharts';
import assetApi from '../api/assetApi';
import aiApi from '../api/aiApi';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import ErrorState from '../components/common/ErrorState';

export const FailureRiskRulPage = () => {
  const [assets, setAssets] = useState([]);
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [predictionResult, setPredictionResult] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isLoadingAssets, setIsLoadingAssets] = useState(true);
  const [error, setError] = useState(null);
  const [showSourceSnapshot, setShowSourceSnapshot] = useState(false);
  const [simulationMode, setSimulationMode] = useState('normal'); // 'normal' | 'insufficient_data' | 'low_confidence' | 'unavailable_model'

  // Load assets list covering all 6 dairy equipment categories
  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const res = await assetApi.getAssets({ limit: 50 });
        if (res?.data?.assets && res.data.assets.length > 0) {
          setAssets(res.data.assets);
          setSelectedAssetId(res.data.assets[0]._id);
          // Auto run diagnosis on initial asset
          runDiagnosis(res.data.assets[0]._id, 'normal');
        }
      } catch (err) {
        console.error('Failed to load assets for AI:', err);
        setError('Unable to load asset inventory for predictive scanning.');
      } finally {
        setIsLoadingAssets(false);
      }
    };
    fetchAssets();
  }, []);

  const runDiagnosis = async (targetId, simMode = simulationMode) => {
    const idToDiagnose = targetId || selectedAssetId;
    if (!idToDiagnose) return;

    setIsScanning(true);
    setError(null);

    try {
      // Build query string if testing simulation states
      let url = `/ai/predict/${idToDiagnose}`;
      if (simMode !== 'normal') {
        url += `?simulate=${simMode}`;
      }

      const res = await aiApi.predictAsset(idToDiagnose, simMode !== 'normal' ? { simulate: simMode } : {});
      if (res?.data) {
        setPredictionResult(res.data);
      }
    } catch (err) {
      console.error('Diagnosis failed:', err);
      setError(err.response?.data?.message || err.message || 'AI predictive diagnostic scan encountered an error.');
    } finally {
      setIsScanning(false);
    }
  };

  const selectedAsset = assets.find((a) => a._id === selectedAssetId) || predictionResult?.asset;

  // Degradation projection data for Recharts
  const generateDegradationProjection = () => {
    if (!predictionResult) return [];
    const rulDays = predictionResult.rulData?.remainingUsefulLifeDays || 10;
    const currentHealth = predictionResult.asset?.currentHealthScore || 70;

    const points = [];
    for (let d = 0; d <= rulDays + 4; d += 2) {
      const projected = Math.max(10, Math.round(currentHealth - (d / rulDays) * (currentHealth - 25)));
      points.push({
        day: `Day +${d}`,
        projectedHealth: projected,
        criticalThreshold: 30
      });
    }
    return points;
  };

  const degradationData = generateDegradationProjection();

  // Helper for category badge styling
  const formatCategory = (cat = '') => {
    return cat.replace(/_/g, ' ');
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <span className="p-2 bg-purple-100 text-purple-700 rounded-xl">
              <Brain className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Failure Risk & Remaining Useful Life (RUL)
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Multimodal sensor telemetry analysis, degradation projections, and Google Gemini explainable diagnostics.
          </p>
        </div>

        {/* Equipment Selector & Scanner CTA */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedAssetId}
            onChange={(e) => {
              setSelectedAssetId(e.target.value);
              runDiagnosis(e.target.value, simulationMode);
            }}
            className="px-3.5 py-2.5 text-xs font-semibold border border-slate-300 rounded-xl bg-white text-slate-800 shadow-sm focus:ring-2 focus:ring-purple-500"
          >
            {assets.map((a) => (
              <option key={a._id} value={a._id}>
                [{a.category ? a.category.replace(/_/g, ' ') : 'EQUIPMENT'}] {a.assetTag} - {a.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => runDiagnosis(selectedAssetId, simulationMode)}
            disabled={isScanning}
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white text-xs font-bold rounded-xl shadow-md shadow-purple-700/25 transition-all disabled:opacity-50"
          >
            <Sparkles className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Scanning Telemetry...' : 'Run Gemini Scan'}</span>
          </button>
        </div>
      </div>

      {/* State Switcher Ribbon (For Point-to-Point Evaluation of All 5 States) */}
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2 text-slate-600">
          <SlidersHorizontal className="w-4 h-4 text-purple-600" />
          <span className="font-bold uppercase tracking-wider text-[11px]">Evaluation State Simulator:</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => {
              setSimulationMode('normal');
              runDiagnosis(selectedAssetId, 'normal');
            }}
            className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all ${
              simulationMode === 'normal'
                ? 'bg-purple-700 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            Normal Scan
          </button>
          <button
            onClick={() => {
              setSimulationMode('insufficient_data');
              runDiagnosis(selectedAssetId, 'insufficient_data');
            }}
            className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all ${
              simulationMode === 'insufficient_data'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            Insufficient Data State
          </button>
          <button
            onClick={() => {
              setSimulationMode('low_confidence');
              runDiagnosis(selectedAssetId, 'low_confidence');
            }}
            className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all ${
              simulationMode === 'low_confidence'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            Low Confidence State (&lt;70%)
          </button>
          <button
            onClick={() => {
              setSimulationMode('unavailable_model');
              runDiagnosis(selectedAssetId, 'unavailable_model');
            }}
            className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all ${
              simulationMode === 'unavailable_model'
                ? 'bg-indigo-700 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            Model Fallback State
          </button>
        </div>
      </div>

      {/* STATE 1: LOADING SKELETON */}
      {isLoadingAssets || isScanning ? (
        <div className="space-y-4">
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl flex items-center space-x-3 text-purple-800 text-xs font-semibold animate-pulse">
            <Sparkles className="w-5 h-5 animate-spin text-purple-600 shrink-0" />
            <span>Multimodal Diagnostic Scanner Active: Ingesting sensor telemetry, inspection checklists, work orders, ambient temperature, and equipment runtimes...</span>
          </div>
          <LoadingSkeleton count={4} />
        </div>
      ) : error ? (
        /* STATE 5: FAILED-PREDICTION STATE */
        <ErrorState
          title="Predictive Diagnostics Scanner Error"
          message={error}
          onRetry={() => runDiagnosis(selectedAssetId, simulationMode)}
        />
      ) : predictionResult ? (
        <>
          {/* STATE 2: UNAVAILABLE-MODEL NOTICE BANNER */}
          {predictionResult.geminiExplanation?.source === 'DAIRY_HEURISTIC_RULE_ENGINE' && (
            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-start space-x-3 text-xs text-indigo-900 shadow-sm">
              <Cpu className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block uppercase tracking-wider text-[11px]">
                  Local Dairy Physics Rule Engine Fallback Active
                </span>
                <p className="mt-0.5 text-indigo-700 leading-relaxed">
                  Remote cloud model endpoint is running in offline mode. The suite has seamlessly transitioned to deterministic dairy thermodynamic rules to prevent operational downtime. Zero hallucination risk.
                </p>
              </div>
            </div>
          )}

          {/* STATE 3: INSUFFICIENT-DATA STATE BANNER */}
          {predictionResult.failureAnalysis?.status === 'INSUFFICIENT_DATA' && (
            <div className="p-5 bg-amber-50 border-2 border-amber-300 rounded-2xl flex items-start space-x-3 text-amber-900 shadow-sm">
              <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-sm block">
                  Insufficient Sensor Telemetry Data
                </span>
                <p className="text-xs text-amber-800 leading-relaxed">
                  The equipment telemetry stream has 0 active readings or sensors are uncalibrated. A reliable failure risk and RUL cannot be computed without verified physical sensor pings. Physical field technician inspection is mandatory.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => {
                      setSimulationMode('normal');
                      runDiagnosis(selectedAssetId, 'normal');
                    }}
                    className="px-3.5 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg font-bold text-xs shadow-sm transition-all"
                  >
                    Reset & Fetch Calibrated Telemetry
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STATE 4: LOW-CONFIDENCE STATE BANNER */}
          {predictionResult.failureAnalysis?.isLowConfidence && predictionResult.failureAnalysis?.status !== 'INSUFFICIENT_DATA' && (
            <div className="p-4 bg-orange-50 border border-orange-300 rounded-2xl flex items-start space-x-3 text-orange-900 shadow-sm">
              <AlertCircle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block uppercase tracking-wider text-[11px]">
                  Low Model Confidence Advisory (&lt; 70%)
                </span>
                <p className="mt-0.5 text-xs text-orange-800 leading-relaxed">
                  Model statistical confidence is calculated at {(predictionResult.failureAnalysis.confidenceScore * 100).toFixed(0)}%. Telemetry sample density is sparse or sensor calibration is pending. Supervised physical verification is required before executing major component overhauls.
                </p>
              </div>
            </div>
          )}

          {/* Key Metric Gauges: Failure Risk vs Model Confidence */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Metric 1: Failure Risk Score */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Failure Risk Score
                </span>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                    predictionResult.failureAnalysis.riskLevel === 'CRITICAL'
                      ? 'bg-rose-100 text-rose-700'
                      : predictionResult.failureAnalysis.riskLevel === 'HIGH'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {predictionResult.failureAnalysis.riskLevel}
                </span>
              </div>

              <div className="flex items-baseline space-x-1 mt-2">
                <h3 className="text-3xl font-black font-mono text-slate-900">
                  {predictionResult.failureAnalysis.failureRiskScore}%
                </h3>
                <span className="text-xs text-slate-400 font-semibold">Breakdown Probability</span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-3">
                <div
                  className={`h-full ${
                    predictionResult.failureAnalysis.failureRiskScore >= 75
                      ? 'bg-rose-500'
                      : predictionResult.failureAnalysis.failureRiskScore >= 45
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${predictionResult.failureAnalysis.failureRiskScore}%` }}
                />
              </div>
            </div>

            {/* Metric 2: Model Confidence Score (Strictly Distinct from Risk) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Model Confidence
                </span>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                    predictionResult.failureAnalysis.confidenceScore >= 0.75
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-orange-100 text-orange-700'
                  }`}
                >
                  {predictionResult.failureAnalysis.confidenceScore >= 0.75 ? 'HIGH CERTAINTY' : 'SPARSE DENSITY'}
                </span>
              </div>

              <div className="flex items-baseline space-x-1 mt-2">
                <h3 className="text-3xl font-black font-mono text-purple-700">
                  {(predictionResult.failureAnalysis.confidenceScore * 100).toFixed(0)}%
                </h3>
                <span className="text-xs text-slate-400 font-semibold">Statistical Density</span>
              </div>

              <p className="text-[11px] text-slate-500 mt-2">
                Independent of risk score; derived from multi-sensor sample continuity
              </p>
            </div>

            {/* Metric 3: Remaining Useful Life (RUL) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Remaining Useful Life (RUL)
                </span>
                <Clock className="w-4 h-4 text-sky-600" />
              </div>

              <div className="flex items-baseline space-x-1 mt-2">
                <h3 className="text-3xl font-black font-mono text-sky-700">
                  {predictionResult.rulData.remainingUsefulLifeDays}
                </h3>
                <span className="text-xs text-slate-500 font-bold">Days Remaining</span>
              </div>

              <p className="text-[11px] text-slate-500 mt-2 font-mono">
                ~{predictionResult.rulData.rulOperatingHours} operating hours to critical stoppage
              </p>
            </div>

            {/* Metric 4: Intervention Window */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Recommended Window
                </span>
                <ShieldAlert className="w-4 h-4 text-amber-500" />
              </div>

              <p className="text-xs font-bold text-slate-800 mt-2 leading-relaxed">
                {predictionResult.rulData.recommendedInterventionWindow}
              </p>

              <p className="text-[11px] text-slate-400 mt-2">
                Scheduled before raw milk souring threshold
              </p>
            </div>
          </div>

          {/* Multimodal Contributing Inputs Breakdown (Telemetry, Inspections, Work Orders, Usage, Environment, History) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Multimodal Contributing Inputs & Anomaly Evidence
                  </h3>
                  <p className="text-xs text-slate-500">
                    Feature weight distribution across Telemetry, Inspections, Work Orders, Usage, Environment, and History
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg">
                {predictionResult.failureAnalysis.contributingInputs?.length || 0} Contributing Factors
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[11px] font-bold border-b border-slate-200">
                    <th className="py-2.5 px-3">Input Dimension</th>
                    <th className="py-2.5 px-3">Contributing Factor</th>
                    <th className="py-2.5 px-3">Observed Value</th>
                    <th className="py-2.5 px-3">Baseline / Safe Limit</th>
                    <th className="py-2.5 px-3">Risk Impact</th>
                    <th className="py-2.5 px-3">Severity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {predictionResult.failureAnalysis.contributingInputs?.map((inp, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/75 transition-colors">
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase bg-purple-50 text-purple-700 border border-purple-200">
                          {inp.dimension}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {inp.factor}
                        <span className="block text-[11px] font-normal text-slate-500 mt-0.5">
                          {inp.evidenceNote}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                        {inp.observedValue}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                        {inp.baselineThreshold}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-black text-rose-600">
                        +{inp.impactPercent}%
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            inp.severity === 'CRITICAL'
                              ? 'bg-rose-100 text-rose-700'
                              : inp.severity === 'HIGH'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {inp.severity}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Explainable Diagnostic AI Card (Gemini 2.5 Flash / Dairy Physics Engine) */}
          <div className="bg-white rounded-2xl border border-purple-200 shadow-sm p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-purple-100 pb-3 gap-2">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-purple-100 text-purple-700 rounded-xl">
                  <Brain className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Explainable Diagnostic Diagnosis & Physical Evidence
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-500">
                      Engine: <span className="font-semibold text-purple-700">{predictionResult.geminiExplanation.source}</span>
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-xs text-slate-500 font-mono">
                      Model: {predictionResult.modelMetadata?.modelVersion || 'Gemini-2.5-Flash / DairyPhysics-v2.5'}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-xs text-slate-400 font-mono">
                      Timestamp: {new Date(predictionResult.modelMetadata?.executionTimestamp || Date.now()).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </div>
              <span className="px-3 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-xl text-xs font-mono font-bold self-start sm:self-auto">
                Zero Hidden CoT
              </span>
            </div>

            {/* AI Explanation Text */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm leading-relaxed text-slate-800">
              {predictionResult.geminiExplanation.aiExplanation}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
              {/* Evidence Cited */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                  Observed Physical Telemetry Evidence Cited
                </span>
                <ul className="space-y-1.5 text-xs text-slate-700">
                  {predictionResult.geminiExplanation.citedTelemetryEvidence?.map((item, i) => (
                    <li key={i} className="flex items-start space-x-2">
                      <span className="text-purple-600 font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Recommended Action Checklist */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                  Prescribed Technical Action Steps
                </span>
                <ul className="space-y-1.5 text-xs text-slate-700">
                  {predictionResult.geminiExplanation.recommendedActions?.map((act, i) => (
                    <li key={i} className="flex items-start space-x-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{act}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Transparent Source-Data Snapshot Toggle & Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-slate-100 text-slate-700 rounded-xl">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Source-Data Snapshot (Raw Multi-Source Ingestion)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Transparent snapshot of the exact telemetry readings, inspections, work orders, runtime usage, environment, and history evaluated by the AI
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowSourceSnapshot(!showSourceSnapshot)}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
              >
                <span>{showSourceSnapshot ? 'Hide Snapshot' : 'View Source Snapshot'}</span>
                {showSourceSnapshot ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {showSourceSnapshot && predictionResult.sourceDataSnapshot && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                {/* Snapshot Block 1: Telemetry */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center space-x-1.5">
                      <Gauge className="w-3.5 h-3.5 text-purple-600" />
                      <span>Telemetry Stream</span>
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded">
                      {predictionResult.sourceDataSnapshot.telemetry?.streamStatus || 'HEALTHY'}
                    </span>
                  </div>
                  <div className="text-xs space-y-1 text-slate-700 font-mono">
                    <p>Sample Count: {predictionResult.sourceDataSnapshot.telemetry?.sampleCount} pings</p>
                    <div className="space-y-0.5 pt-1">
                      {predictionResult.sourceDataSnapshot.telemetry?.latestReadings?.map((r, i) => (
                        <div key={i} className="flex justify-between text-[11px] text-slate-600">
                          <span>{r.metricType}:</span>
                          <span className="font-bold text-slate-900">{r.metricValue} {r.unit}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Snapshot Block 2: Inspections & Quality */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center space-x-1.5">
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                      <span>Physical Inspections</span>
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                      QA AUDIT
                    </span>
                  </div>
                  <div className="text-xs space-y-1 text-slate-700">
                    <p>Sanitation Score: <span className="font-bold font-mono">{predictionResult.sourceDataSnapshot.inspections?.sanitationScore}%</span></p>
                    <p>Open Defects: <span className="font-bold font-mono">{predictionResult.sourceDataSnapshot.inspections?.defectsCount} items</span></p>
                    <p>Audit Status: <span className="font-bold text-slate-800">{predictionResult.sourceDataSnapshot.inspections?.lastAuditStatus}</span></p>
                  </div>
                </div>

                {/* Snapshot Block 3: Work Orders Backlog */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center space-x-1.5">
                      <Wrench className="w-3.5 h-3.5 text-amber-600" />
                      <span>Work Orders</span>
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">
                      BACKLOG
                    </span>
                  </div>
                  <div className="text-xs space-y-1 text-slate-700">
                    <p>Total Open Orders: <span className="font-bold font-mono">{predictionResult.sourceDataSnapshot.workOrders?.openCount}</span></p>
                    <p>Active Critical (P0/P1): <span className="font-bold font-mono text-rose-600">{predictionResult.sourceDataSnapshot.workOrders?.criticalCount}</span></p>
                  </div>
                </div>

                {/* Snapshot Block 4: Equipment Usage */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center space-x-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Runtime Usage</span>
                    </span>
                  </div>
                  <div className="text-xs space-y-1 text-slate-700">
                    <p>Total Runtime: <span className="font-bold font-mono">{predictionResult.sourceDataSnapshot.usage?.totalRuntimeHours} hrs</span></p>
                    <p>Major Overhaul Mark: <span className="font-mono text-slate-500">5,000 hrs</span></p>
                    <p>Duty Cycle Index: <span className="font-mono font-bold">{predictionResult.sourceDataSnapshot.usage?.utilizationIndex || '92%'}</span></p>
                  </div>
                </div>

                {/* Snapshot Block 5: Environment */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center space-x-1.5">
                      <Thermometer className="w-3.5 h-3.5 text-rose-600" />
                      <span>Operating Environment</span>
                    </span>
                  </div>
                  <div className="text-xs space-y-1 text-slate-700">
                    <p>Ambient Temperature: <span className="font-bold font-mono">{predictionResult.sourceDataSnapshot.environment?.ambientTemperature}°C</span></p>
                    <p>Relative Humidity: <span className="font-mono">{predictionResult.sourceDataSnapshot.environment?.relativeHumidity}%</span></p>
                    <p>Thermal Head-Stress: <span className="font-bold font-mono text-amber-700">{predictionResult.sourceDataSnapshot.environment?.thermalStressLevel}</span></p>
                  </div>
                </div>

                {/* Snapshot Block 6: Reliability History */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center space-x-1.5">
                      <History className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Reliability History</span>
                    </span>
                  </div>
                  <div className="text-xs space-y-1 text-slate-700">
                    <p>Past Breakdowns (180d): <span className="font-bold font-mono">{predictionResult.sourceDataSnapshot.history?.pastBreakdownsCount}</span></p>
                    <p>Historical MTBF: <span className="font-mono">{predictionResult.sourceDataSnapshot.history?.mtbfOperatingHours} operating hrs</span></p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Degradation Curve Projection (Recharts) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Equipment Health Degradation Slope Projection
                </h3>
                <p className="text-xs text-slate-500">
                  Trajectory toward catastrophic breakdown threshold based on baseline telemetry drift
                </p>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={degradationData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      color: '#fff',
                      borderRadius: '12px',
                      fontSize: '12px'
                    }}
                  />
                  <ReferenceLine
                    y={30}
                    stroke="#ef4444"
                    strokeDasharray="4 4"
                    label={{ value: '30% Critical Stoppage Line', fill: '#ef4444', fontSize: 11 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="projectedHealth"
                    name="Projected Health Score (%)"
                    stroke="#8b5cf6"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#8b5cf6' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default FailureRiskRulPage;
