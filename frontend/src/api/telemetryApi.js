import axiosClient from './axiosClient';

export const telemetryApi = {
  /**
   * Ingest single or bulk sensor telemetry
   */
  ingest: async (telemetryData) => {
    return await axiosClient.post('/telemetry/ingest', telemetryData);
  },

  /**
   * Get recent readings for an asset with staleness detector
   */
  getAssetTelemetry: async (assetId, params = {}) => {
    return await axiosClient.get(`/telemetry/asset/${assetId}`, { params });
  },

  /**
   * Get 24-hour time-series trends formatted for Recharts components
   */
  getSensorTrends: async (assetId) => {
    return await axiosClient.get(`/telemetry/asset/${assetId}/trends`);
  }
};

export default telemetryApi;

