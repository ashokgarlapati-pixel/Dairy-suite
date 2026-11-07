import axiosClient from './axiosClient';

export const auditApi = {
  getAuditLogs: async (params = {}) => {
    return await axiosClient.get('/audit-logs', { params });
  },

  getSettings: async () => {
    return await axiosClient.get('/audit-logs/settings');
  },

  updateSettings: async (settingsData) => {
    return await axiosClient.patch('/audit-logs/settings', settingsData);
  },

  deleteAuditLog: async (id) => {
    return await axiosClient.delete(`/audit-logs/${id}`);
  }
};

export default auditApi;
