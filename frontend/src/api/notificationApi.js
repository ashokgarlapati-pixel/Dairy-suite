import axiosClient from './axiosClient';

export const notificationApi = {
  getNotifications: async (params = {}) => {
    return await axiosClient.get('/notifications', { params });
  },

  markAsRead: async (id) => {
    return await axiosClient.patch(`/notifications/${id}/read`);
  },

  markAllAsRead: async () => {
    return await axiosClient.post('/notifications/mark-all-read');
  },

  clearNotification: async (id) => {
    return await axiosClient.delete(`/notifications/${id}`);
  },

  clearAllNotifications: async (data = { readOnly: false }) => {
    return await axiosClient.post('/notifications/clear-all', data);
  },

  getPreferences: async () => {
    return await axiosClient.get('/notifications/preferences');
  },

  updatePreferences: async (preferences) => {
    return await axiosClient.put('/notifications/preferences', preferences);
  }
};

export default notificationApi;
