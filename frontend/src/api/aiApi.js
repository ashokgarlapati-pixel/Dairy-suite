import axiosClient from './axiosClient';

export const aiApi = {
  /**
   * Trigger AI predictive failure analysis & RUL calculation
   */
  predictAsset: async (assetId, params = {}) => {
    return await axiosClient.post(`/ai/predict/${assetId}`, {}, { params });
  },

  /**
   * Get recent predictions history
   */
  getPredictions: async () => {
    return await axiosClient.get('/ai/predictions');
  },

  /**
   * Get active recommendations pending human review
   */
  getRecommendations: async () => {
    return await axiosClient.get('/ai/recommendations');
  },

  /**
   * Submit Human-in-the-Loop review decision (Accept, Reject, Correct, Override)
   */
  reviewRecommendation: async (id, reviewData) => {
    return await axiosClient.post(`/ai/recommendations/${id}/review`, reviewData);
  },

  /**
   * Get MLOps accuracy, false alarm rates, and model drift
   */
  getMLOpsMetrics: async () => {
    return await axiosClient.get('/ai/mlops-metrics');
  },

  /**
   * Get user feedback stream on AI predictions
   */
  getFeedback: async () => {
    return await axiosClient.get('/ai/feedback');
  },

  /**
   * Submit technician or supervisor feedback on AI prediction accuracy
   */
  submitFeedback: async (feedbackData) => {
    return await axiosClient.post('/ai/feedback', feedbackData);
  }
};

export default aiApi;

