import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  Clock,
  MapPin,
  ChevronRight,
  Activity,
  Layers,
  Thermometer,
  Truck,
  Box,
  Flame,
  Snowflake
} from 'lucide-react';
import StatusBadge from '../common/StatusBadge';

// Helper to pick category icon
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

// Category friendly labels
const getCategoryLabel = (category) => {
  switch (category) {
    case 'BULK_MILK_COOLER':
      return 'Bulk Milk Cooler';
    case 'CHILLED_TANKER':
      return 'Chilled Tanker';
    case 'PASTEURIZER':
      return 'Plate Pasteurizer';
    case 'HOMOGENIZER':
      return 'Homogenizer';
    case 'COLD_ROOM':
      return 'Cold Storage Room';
    case 'PACKAGING_MACHINE':
      return 'Packaging Line';
    default:
      return category?.replace(/_/g, ' ') || 'Asset';
  }
};

export const AssetCard = ({ asset }) => {
  const navigate = useNavigate();
  const IconComponent = getCategoryIcon(asset.category);

  // Health Score color coding
  const healthScore = asset.currentHealthScore ?? 100;
  let healthColor = 'bg-emerald-500 text-emerald-700';
  let healthBg = 'bg-emerald-50 border-emerald-200';
  if (healthScore < 50) {
    healthColor = 'bg-rose-500 text-rose-700';
    healthBg = 'bg-rose-50 border-rose-200';
  } else if (healthScore < 80) {
    healthColor = 'bg-amber-500 text-amber-700';
    healthBg = 'bg-amber-50 border-amber-200';
  }

  // Risk styling
  const isHighRisk = asset.failureRiskLevel === 'HIGH' || asset.failureRiskLevel === 'CRITICAL';

  return (
    <div
      onClick={() => navigate(`/assets/${asset.assetTag || asset._id}`)}
      className="group relative bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-sky-300 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between"
    >
      {/* Top Banner with Category & Status */}
      <div className="p-5 pb-3">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="p-2.5 bg-slate-100 group-hover:bg-sky-50 text-slate-700 group-hover:text-sky-600 rounded-xl border border-slate-200/80 transition-colors shrink-0">
              <IconComponent className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="font-mono text-xs font-bold text-sky-700 uppercase tracking-wider block truncate">
                {asset.assetTag}
              </span>
              <h3 className="font-bold text-slate-900 group-hover:text-sky-900 text-base leading-tight truncate">
                {asset.name}
              </h3>
            </div>
          </div>
          <StatusBadge status={asset.currentStatus} />
        </div>

        {/* Location & Details */}
        <div className="space-y-1 text-xs text-slate-500 mt-2">
          <div className="flex items-center space-x-1.5 truncate">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{asset.location?.facilityName || 'Facility Unassigned'}</span>
          </div>
          {asset.ratedCapacity && (
            <div className="flex items-center space-x-1.5 text-slate-600 font-medium truncate">
              <span className="text-[11px] font-semibold text-slate-400">Capacity:</span>
              <span className="truncate">{asset.ratedCapacity}</span>
            </div>
          )}
        </div>
      </div>

      {/* Middle: Health Score & Risk Meter */}
      <div className="px-5 py-3 bg-slate-50/70 border-y border-slate-100">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="font-semibold text-slate-600 flex items-center space-x-1">
            <Activity className="w-3.5 h-3.5 text-slate-400" />
            <span>Fleet Health Index</span>
          </span>
          <span className="font-mono font-bold text-slate-800">{healthScore}%</span>
        </div>

        {/* Health Bar */}
        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              healthScore < 50
                ? 'bg-rose-500'
                : healthScore < 80
                ? 'bg-amber-500'
                : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.max(5, healthScore)}%` }}
          />
        </div>

        {/* Risk & Runtime stats */}
        <div className="flex items-center justify-between mt-3 text-xs">
          <div className="flex items-center space-x-1">
            <span className="text-slate-400">Risk:</span>
            <span
              className={`font-semibold px-2 py-0.5 rounded-md text-[11px] ${
                isHighRisk
                  ? 'bg-rose-100 text-rose-700 font-bold'
                  : asset.failureRiskLevel === 'MEDIUM'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {asset.failureRiskLevel || 'LOW'}
            </span>
          </div>

          <div className="flex items-center space-x-1 text-slate-500 font-mono text-[11px]">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>{(asset.totalRuntimeHours || 0).toLocaleString()} hrs</span>
          </div>
        </div>
      </div>

      {/* Footer / CTA */}
      <div className="px-5 py-3 flex items-center justify-between text-xs text-sky-600 font-semibold group-hover:text-sky-700 transition-colors">
        <span>{getCategoryLabel(asset.category)}</span>
        <div className="flex items-center space-x-1 group-hover:translate-x-1 transition-transform">
          <span>View Asset Profile</span>
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
};

export default AssetCard;

