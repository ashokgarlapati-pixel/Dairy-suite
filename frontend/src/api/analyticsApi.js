import axiosClient from './axiosClient';

export const analyticsApi = {
  getDashboardAnalytics: async () => {
    return await axiosClient.get('/analytics/dashboard');
  },

  getReportHistory: async () => {
    return await axiosClient.get('/analytics/reports/history');
  },

  getSavedConfigurations: async () => {
    return await axiosClient.get('/analytics/reports/saved-configurations');
  },

  saveConfiguration: async (configData) => {
    return await axiosClient.post('/analytics/reports/saved-configurations', configData);
  },

  downloadReportUrl: (reportType = 'ASSET_HEALTH', format = 'csv') => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
    return `${baseUrl}/analytics/export?reportType=${reportType}&format=${format}`;
  },

  exportReport: async (reportType = 'ASSET_HEALTH', format = 'csv') => {
    return await axiosClient.get(`/analytics/export?reportType=${reportType}&format=${format}`, {
      responseType: format === 'pdf' ? 'text' : 'blob'
    });
  }
};

export default analyticsApi;
