import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import LoginPage from '../pages/LoginPage';
import AssetDashboardPage from '../pages/AssetDashboardPage';
import AssetDetailPage from '../pages/AssetDetailPage';
import MaintenanceCalendarPage from '../pages/MaintenanceCalendarPage';
import MaintenancePlanningPage from '../pages/MaintenancePlanningPage';
import FailureRiskRulPage from '../pages/FailureRiskRulPage';
import MaintenanceRecommendationsPage from '../pages/MaintenanceRecommendationsPage';
import NotificationsPage from '../pages/NotificationsPage';
import UserManagementPage from '../pages/UserManagementPage';
import AuditLogsSettingsPage from '../pages/AuditLogsSettingsPage';
import MLOpsPerformancePage from '../pages/MLOpsPerformancePage';
import ReportsAnalyticsPage from '../pages/ReportsAnalyticsPage';
import ProtectedRoute from '../components/common/ProtectedRoute';

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Module 01: Secure Login Page */}
      <Route path="/login" element={<LoginPage />} />

      {/* Main Application Layout (Protected via JWT & RBAC) */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        {/* Default Landing Page */}
        <Route index element={<Navigate to="/assets" replace />} />

        {/* Module 02: Asset Registry & Health Dashboard (All Roles) */}
        <Route path="/assets" element={<AssetDashboardPage />} />

        {/* Module 03: Asset Detail & Maintenance History (All Roles) */}
        <Route path="/assets/:assetId" element={<AssetDetailPage />} />

        {/* Module 04: Maintenance Calendar & Technician Queue (All Roles, Tech default) */}
        <Route path="/calendar" element={<MaintenanceCalendarPage />} />

        {/* Module 05: Maintenance Planning & Closure Verification (All Roles) */}
        <Route path="/planning" element={<MaintenancePlanningPage />} />

        {/* Module 06: Failure Risk & Remaining Useful Life (RUL) (All Roles) */}
        <Route path="/predictions/rul" element={<FailureRiskRulPage />} />

        {/* Module 07: Maintenance Recommendations (Admin & Ops Manager only) */}
        <Route
          path="/recommendations"
          element={
            <ProtectedRoute allowedRoles={['MAINTENANCE_ADMIN', 'OPERATIONS_MANAGER']}>
              <MaintenanceRecommendationsPage />
            </ProtectedRoute>
          }
        />

        {/* Module 08: Reliability & Model Performance (Admin & Ops Manager only) */}
        <Route
          path="/mlops-performance"
          element={
            <ProtectedRoute allowedRoles={['MAINTENANCE_ADMIN', 'OPERATIONS_MANAGER']}>
              <MLOpsPerformancePage />
            </ProtectedRoute>
          }
        />

        {/* Module 09: Reports & Visual Analytics (All Roles) */}
        <Route path="/analytics-reports" element={<ReportsAnalyticsPage />} />

        {/* Module 10: Notifications Center (All Roles) */}
        <Route path="/notifications" element={<NotificationsPage />} />

        {/* Module 11: User & Role Management (Maintenance Admin ONLY) */}
        <Route
          path="/users"
          element={
            <ProtectedRoute allowedRoles={['MAINTENANCE_ADMIN']}>
              <UserManagementPage />
            </ProtectedRoute>
          }
        />

        {/* Module 12: Audit Logs & Master Settings (Admin & Operations Manager) */}
        <Route
          path="/audit-settings"
          element={
            <ProtectedRoute allowedRoles={['MAINTENANCE_ADMIN', 'OPERATIONS_MANAGER']}>
              <AuditLogsSettingsPage />
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/assets" replace />} />
      </Route>
    </Routes>
  );
};

export default AppRoutes;
