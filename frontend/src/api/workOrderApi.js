import axiosClient from './axiosClient';

export const workOrderApi = {
  /**
   * Get all work orders with filters
   */
  getWorkOrders: async (params = {}) => {
    return await axiosClient.get('/work-orders', { params });
  },

  /**
   * Get work order by ID or number
   */
  getWorkOrderById: async (id) => {
    return await axiosClient.get(`/work-orders/${id}`);
  },

  /**
   * Create a new work order
   */
  createWorkOrder: async (data) => {
    return await axiosClient.post('/work-orders', data);
  },

  /**
   * Update work order status state machine
   */
  updateStatus: async (id, status, reason = '', notes = '') => {
    return await axiosClient.patch(`/work-orders/${id}/status`, { status, reason, notes });
  },

  /**
   * Edit work order details, reassign, escalate, override, or defer
   */
  updateWorkOrder: async (id, data) => {
    return await axiosClient.patch(`/work-orders/${id}`, data);
  },

  /**
   * Field technician evidence upload (checklist, photos, audio notes, GPS)
   */
  uploadEvidence: async (id, evidenceData) => {
    return await axiosClient.post(`/work-orders/${id}/evidence`, evidenceData);
  },

  /**
   * Multi-tier supervisor closure sign-off
   */
  verifyClosure: async (id, verificationData) => {
    return await axiosClient.post(`/work-orders/${id}/verify`, verificationData);
  }
};

export default workOrderApi;

