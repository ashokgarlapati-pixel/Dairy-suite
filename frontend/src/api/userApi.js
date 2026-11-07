import axiosClient from './axiosClient';

export const userApi = {
  getUsers: async (params = {}) => {
    return await axiosClient.get('/users', { params });
  },

  getUserById: async (id) => {
    return await axiosClient.get(`/users/${id}`);
  },

  createUser: async (userData) => {
    return await axiosClient.post('/users', userData);
  },

  updateUser: async (id, userData) => {
    return await axiosClient.put(`/users/${id}`, userData);
  },

  toggleStatus: async (id, status, reason = '') => {
    return await axiosClient.patch(`/users/${id}/status`, { status, reason });
  },

  getRolePermissions: async () => {
    return await axiosClient.get('/users/roles/permissions');
  },

  updateRolePermissions: async (role, permissions) => {
    return await axiosClient.put('/users/roles/permissions', { role, permissions });
  }
};

export default userApi;
