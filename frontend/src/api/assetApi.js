import axiosClient from './axiosClient';

export const assetApi = {
  /**
   * Get paginated and filtered assets
   */
  getAssets: async (params = {}) => {
    return await axiosClient.get('/assets', { params });
  },

  /**
   * Get fleet health statistics and KPIs
   */
  getAssetStats: async () => {
    return await axiosClient.get('/assets/stats');
  },

  /**
   * Get single asset by ID or assetTag
   */
  getAssetById: async (id) => {
    return await axiosClient.get(`/assets/${id}`);
  },

  /**
   * Register a new dairy equipment asset
   */
  createAsset: async (assetData) => {
    return await axiosClient.post('/assets', assetData);
  },

  /**
   * Update an existing asset
   */
  updateAsset: async (id, assetData) => {
    return await axiosClient.patch(`/assets/${id}`, assetData);
  },

  /**
   * Soft-delete / decommission an asset
   */
  deleteAsset: async (id, reason = '') => {
    return await axiosClient.delete(`/assets/${id}`, { data: { reason } });
  }
};

export default assetApi;

