import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
  CartesianGrid
} from 'recharts';
import { Activity, AlertTriangle, CheckCircle2, Clock, RefreshCw } from 'lucide-react';
import telemetryApi from '../../api/telemetryApi';

export const TelemetryTrendsChart = ({ assetId, category, assetName }) => {
  const [trendsData, setTrendsData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTrends = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await telemetryApi.getSensorTrends(assetId);
      if (res?.data?.trends) {
        setTrendsData(res.data.trends);
      }
    } catch (err) {
      console.error('Failed to fetch sensor trends:', err);
      setError('Unable to stream sensor telemetry history.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (assetId) {
      fetchTrends();
    }
  }, [assetId]);

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center h-72">
        <div className="w-8 h-8 border-3 border-sky-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-semibold text-slate-500">Streaming Telemetry Readings...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center h-72 text-center">
        <AlertTriangle className="w-8 h-8 text-amber-500 mb-2" />
        <p className="text-sm font-bold text-slate-800">{error}</p>
        <button
          onClick={fetchTrends}
          className="mt-3 px-3 py-1.5 text-xs font-bold text-sky-600 hover:text-sky-700 bg-sky-50 rounded-lg"
        >
          Retry Stream
        </button>
      </div>
    );
  }

  const isBmcOrColdRoom = category === 'BULK_MILK_COOLER' || category === 'COLD_ROOM';
  const isPasteurizer = category === 'PASTEURIZER';
  const isHomogenizer = category === 'HOMOGENIZER';

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-sky-600" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              {isBmcOrColdRoom
                ? 'Chilling & Suction Pressure Sensor Stream'
                : isPasteurizer
                ? 'Thermal Pasteurization & CIP Flow Telemetry'
                : isHomogenizer
                ? 'Plunger Vibration RMS & Hydraulic Pressure'
                : 'Condition Monitoring Telemetry Stream'}
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            24-hour continuous sensor time-series against dairy quality thresholds
          </p>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <div className="flex items-center space-x-1.5 text-emerald-600 font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Telemetry Online</span>
          </div>

          <button
            onClick={fetchTrends}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            title="Refresh Sensors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Chart Display */}
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {isBmcOrColdRoom ? (
            <LineChart data={trendsData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="timeLabel" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis
                yAxisId="temp"
                domain={[0, 10]}
                unit="°C"
                tick={{ fontSize: 11, fill: '#64748b' }}
              />
              <YAxis
                yAxisId="press"
                orientation="right"
                domain={[0, 4]}
                unit=" bar"
                tick={{ fontSize: 11, fill: '#64748b' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  color: '#fff',
                  borderRadius: '12px',
                  border: 'none',
                  fontSize: '12px'
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <ReferenceLine
                yAxisId="temp"
                y={4.0}
                stroke="#ef4444"
                strokeDasharray="4 4"
                label={{ value: '4°C Max Souring Limit', fill: '#ef4444', fontSize: 10 }}
              />
              <ReferenceLine
                yAxisId="press"
                y={2.2}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                label={{ value: '2.2 Bar Suction Baseline', fill: '#f59e0b', fontSize: 10 }}
              />
              <Line
                yAxisId="temp"
                type="monotone"
                dataKey="temperature"
                name="Milk Temperature (°C)"
                stroke="#0284c7"
                strokeWidth={2.5}
                dot={false}
              />
              <Line
                yAxisId="press"
                type="monotone"
                dataKey="suctionPressure"
                name="Suction Pressure (bar)"
                stroke="#10b981"
                strokeWidth={2}
                strokeDasharray="2 2"
                dot={false}
              />
            </LineChart>
          ) : isPasteurizer ? (
            <LineChart data={trendsData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="timeLabel" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis
                yAxisId="temp"
                domain={[68, 76]}
                unit="°C"
                tick={{ fontSize: 11, fill: '#64748b' }}
              />
              <YAxis
                yAxisId="flow"
                orientation="right"
                domain={[80, 160]}
                unit=" L/m"
                tick={{ fontSize: 11, fill: '#64748b' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  color: '#fff',
                  borderRadius: '12px',
                  border: 'none',
                  fontSize: '12px'
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <ReferenceLine
                yAxisId="temp"
                y={72.0}
                stroke="#ef4444"
                strokeDasharray="4 4"
                label={{ value: '72°C Pasteurization Ceiling', fill: '#ef4444', fontSize: 10 }}
              />
              <ReferenceLine
                yAxisId="flow"
                y={120.0}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                label={{ value: '120 L/min CIP Minimum', fill: '#f59e0b', fontSize: 10 }}
              />
              <Line
                yAxisId="temp"
                type="monotone"
                dataKey="holdingTemperature"
                name="Holding Tube Temp (°C)"
                stroke="#ea580c"
                strokeWidth={2.5}
                dot={false}
              />
              <Line
                yAxisId="flow"
                type="monotone"
                dataKey="cipFlowRate"
                name="CIP Flow (L/min)"
                stroke="#06b6d4"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          ) : (
            <LineChart data={trendsData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="timeLabel" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis
                yAxisId="vib"
                domain={[0, 8]}
                unit=" mm/s"
                tick={{ fontSize: 11, fill: '#64748b' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  color: '#fff',
                  borderRadius: '12px',
                  border: 'none',
                  fontSize: '12px'
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <ReferenceLine
                yAxisId="vib"
                y={3.8}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                label={{ value: '3.8 mm/s Warning Limit', fill: '#f59e0b', fontSize: 10 }}
              />
              <Line
                yAxisId="vib"
                type="monotone"
                dataKey="vibrationRms"
                name="Plunger Vibration RMS (mm/s)"
                stroke="#8b5cf6"
                strokeWidth={2.5}
                dot={false}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TelemetryTrendsChart;

