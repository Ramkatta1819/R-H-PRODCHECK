import React, { useEffect, useState, useTransition } from 'react';
import { DataProvider, useData, SECTION_GROUPS } from './context/DataContext';
import Layout from './components/Layout';
import BavyaSpinner from './components/BavyaSpinner';
import BulkUploadModal from './components/BulkUploadModal';
import { useLocation } from 'react-router-dom';

// Pages
// Lazy Load Pages for Performance
const Login = React.lazy(() => import('./pages/Login'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const ProjectAnalyticsDashboard = React.lazy(() => import('./pages/ProjectAnalyticsDashboard'));
const OrganizationLevels = React.lazy(() => import('./pages/OrganizationLevels'));
const Offices = React.lazy(() => import('./pages/Offices'));
const FacilityTypes = React.lazy(() => import('./pages/FacilityTypes'));
const Departments = React.lazy(() => import('./pages/Departments'));
const Sections = React.lazy(() => import('./pages/Sections'));
const Employees = React.lazy(() => import('./pages/Employees'));
const WorkforceTracker = React.lazy(() => import('./pages/WorkforceTracker'));
const PositionEmployeeMapping = React.lazy(() => import('./pages/PositionEmployeeMapping'));
const Positions = React.lazy(() => import('./pages/Positions'));
const PositionAssignments = React.lazy(() => import('./pages/PositionAssignments'));
const PositionLevels = React.lazy(() => import('./pages/PositionLevels'));
const PositionTypes = React.lazy(() => import('./pages/PositionTypes'));
const PositionTypeMapping = React.lazy(() => import('./pages/PositionTypeMapping'));
const Shifts = React.lazy(() => import('./pages/Shifts'));
const PositionShiftRoster = React.lazy(() => import('./pages/PositionShiftRoster'));
const ManagerScreenMapping = React.lazy(() => import('./pages/ManagerScreenMapping'));
const PositionScreenMapping = React.lazy(() => import('./pages/PositionScreenMapping'));
const Projects = React.lazy(() => import('./pages/Projects'));
const FacilityMasters = React.lazy(() => import('./pages/FacilityMasters'));
const FacilityDeploymentModes = React.lazy(() => import('./pages/FacilityDeploymentModes'));
const FacilityClasses = React.lazy(() => import('./pages/FacilityClasses'));
const FacilitySubClasses = React.lazy(() => import('./pages/FacilitySubClasses'));
const JobFamilies = React.lazy(() => import('./pages/JobFamilies'));
const RoleTypes = React.lazy(() => import('./pages/RoleTypes'));
const Roles = React.lazy(() => import('./pages/Roles'));
const RoleSubGroups = React.lazy(() => import('./pages/RoleSubGroups'));
const Jobs = React.lazy(() => import('./pages/Jobs'));
const Tasks = React.lazy(() => import('./pages/Tasks'));
const TaskUrlMapping = React.lazy(() => import('./pages/TaskUrlMapping'));
const GeoLocations = React.lazy(() => import('./pages/Locations'));
const UserManagement = React.lazy(() => import('./pages/UserManagement'));
const AccessDenied = React.lazy(() => import('./pages/AccessDenied'));
const Organization = React.lazy(() => import('./pages/Organization'));
const APIKeyManagement = React.lazy(() => import('./pages/APIKeyManagement'));
const Reactivations = React.lazy(() => import('./pages/Reactivations'));
const Profile = React.lazy(() => import('./pages/Profile'));
const PositionActivityLogs = React.lazy(() => import('./pages/PositionActivityLogs'));
const AuditLogs = React.lazy(() => import('./pages/AuditLogs'));
const LoginHistory = React.lazy(() => import('./pages/LoginHistory'));
const VehicleSwaps = React.lazy(() => import('./pages/VehicleSwaps'));
const VehicleSwapRequests = React.lazy(() => import('./pages/VehicleSwapRequests'));
const ShiftChangeRequests = React.lazy(() => import('./pages/ShiftChangeRequests'));

import { Routes, Route, Navigate } from 'react-router-dom';

const ProtectedRoute = ({ section, children }) => {
  const { canView, user } = useData();
  // Superuser has unconditional access to all modules
  if (user?.is_superuser) {
    return children;
  }
  // Profile is universally viewable for authenticated users
  if (section === 'profile') {
    return children;
  }

  // Check dynamic position permission strictly
  if (!canView(section)) {
    return <AccessDenied />;
  }

  return children;
};

// Smart Home Redirect: If user has dashboard view permission or is superuser, show Dashboard.
// Otherwise, smoothly redirect to their first permitted screen (e.g. /position-employee-mapping).
const HomeRedirect = () => {
  const { canView, user } = useData();
  if (user?.is_superuser || canView('dashboard')) {
    return <Dashboard />;
  }
  for (const group of SECTION_GROUPS) {
    for (const itemId of group.items) {
      if (canView(itemId)) {
        return <Navigate to={`/${itemId}`} replace />;
      }
    }
  }
  return <AccessDenied />;
};


// Global page transition overlay — provides instant micro-feedback on route change
const PageTransitionOverlay = () => {
  const location = useLocation();
  const [show, setShow] = useState(false);
  const prevPath = React.useRef(location.pathname);

  useEffect(() => {
    if (location.pathname !== prevPath.current) {
      prevPath.current = location.pathname;
      setShow(true);
      const t = setTimeout(() => setShow(false), 150); // Instant 150ms micro-transition
      return () => clearTimeout(t);
    }
  }, [location.pathname]);

  if (!show) return null;
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: '3px',
      background: 'linear-gradient(90deg, #4f46e5, #ec4899, #4f46e5)',
      zIndex: 99999, animation: 'pulse 1s infinite'
    }} />
  );
};

const AppContent = () => {
  const { activeSection, isAuthenticated, notification, isBulkUploadOpen, setIsBulkUploadOpen } = useData();

  return (
    <>
      {/* Global Services - Modals, etc */}
      <BulkUploadModal
        isOpen={isBulkUploadOpen}
        onClose={(reason) => {
          console.log('🔴 [AppContent] Closing BulkUploadModal globally. Reason:', reason);
          setIsBulkUploadOpen(false);
        }}
        section={activeSection}
      />

      {/* Global Notifications - Shows on BOTH Login and Main Layout */}
      {notification.show && (
        <div className={`notification ${notification.type} show`} style={{ zIndex: 10000 }}>
          {notification.message}
        </div>
      )}

      {/* Global page transition overlay — prevents freeze on navigation */}
      {isAuthenticated && <PageTransitionOverlay />}

      {!isAuthenticated ? (
        <Login />
      ) : (
        <Layout>
          <Routes>
            <Route path="/" element={<HomeRedirect />} />
            <Route path="/dashboard" element={<ProtectedRoute section="dashboard"><Dashboard /></ProtectedRoute>} />

            <Route path="/project-analytics" element={<ProtectedRoute section="dashboard"><ProjectAnalyticsDashboard /></ProtectedRoute>} />

            {/* Core Management */}
            <Route path="/users/*" element={<ProtectedRoute section="users"><UserManagement /></ProtectedRoute>} />
            <Route path="/api-keys/*" element={<ProtectedRoute section="api-keys"><APIKeyManagement /></ProtectedRoute>} />
            <Route path="/reactivations/*" element={<ProtectedRoute section="reactivations"><Reactivations /></ProtectedRoute>} />
            <Route path="/audit-logs/*" element={<ProtectedRoute section="audit-logs"><AuditLogs /></ProtectedRoute>} />
            <Route path="/login-history/*" element={<ProtectedRoute section="login-history"><LoginHistory /></ProtectedRoute>} />
            <Route path="/profile" element={<Profile />} />

            {/* Organization */}
            <Route path="/organization/*" element={<ProtectedRoute section="organization"><Organization /></ProtectedRoute>} />
            <Route path="/organization-levels/*" element={<ProtectedRoute section="organization-levels"><OrganizationLevels /></ProtectedRoute>} />
            <Route path="/offices/*" element={<ProtectedRoute section="offices"><Offices /></ProtectedRoute>} />
            <Route path="/office-types/*" element={<ProtectedRoute section="office-types"><FacilityTypes /></ProtectedRoute>} />
            <Route path="/vehicle-swaps/*" element={<ProtectedRoute section="vehicle-swaps"><VehicleSwaps /></ProtectedRoute>} />
            <Route path="/vehicle-swap-requests/*" element={<ProtectedRoute section="vehicle-swap-requests"><VehicleSwapRequests /></ProtectedRoute>} />
            <Route path="/shift-change-requests/*" element={<ProtectedRoute section="shift-change-requests"><ShiftChangeRequests /></ProtectedRoute>} />
            <Route path="/departments/*" element={<ProtectedRoute section="departments"><Departments /></ProtectedRoute>} />
            <Route path="/sections/*" element={<ProtectedRoute section="sections"><Sections /></ProtectedRoute>} />
            <Route path="/facility-masters/*" element={<ProtectedRoute section="facility-masters"><FacilityMasters /></ProtectedRoute>} />
            <Route path="/facility-deployment-modes/*" element={<ProtectedRoute section="facility-deployment-modes"><FacilityDeploymentModes /></ProtectedRoute>} />
            <Route path="/facility-classes/*" element={<ProtectedRoute section="facility-classes"><FacilityClasses /></ProtectedRoute>} />
            <Route path="/facility-sub-classes/*" element={<ProtectedRoute section="facility-sub-classes"><FacilitySubClasses /></ProtectedRoute>} />

            {/* Job Structure */}
            <Route path="/job-families/*" element={<ProtectedRoute section="job-families"><JobFamilies /></ProtectedRoute>} />
            <Route path="/role-types/*" element={<ProtectedRoute section="role-types"><RoleTypes /></ProtectedRoute>} />
            <Route path="/roles/*" element={<ProtectedRoute section="roles"><Roles /></ProtectedRoute>} />
            <Route path="/role-sub-groups/*" element={<ProtectedRoute section="role-sub-groups"><RoleSubGroups /></ProtectedRoute>} />
            <Route path="/jobs/*" element={<ProtectedRoute section="jobs"><Jobs /></ProtectedRoute>} />
            <Route path="/tasks/*" element={<ProtectedRoute section="tasks"><Tasks /></ProtectedRoute>} />
            <Route path="/task-urls/*" element={<ProtectedRoute section="task-urls"><TaskUrlMapping /></ProtectedRoute>} />

            {/* Workforce */}
            <Route path="/employees/*" element={<ProtectedRoute section="employees"><Employees /></ProtectedRoute>} />
            <Route path="/workforce-tracker/*" element={<ProtectedRoute section="workforce-tracker"><WorkforceTracker /></ProtectedRoute>} />
            <Route path="/position-employee-mapping/*" element={<ProtectedRoute section="position-employee-mapping"><PositionEmployeeMapping /></ProtectedRoute>} />
            <Route path="/positions/*" element={<ProtectedRoute section="positions"><Positions /></ProtectedRoute>} />
            <Route path="/position-assignments/*" element={<ProtectedRoute section="position-assignments"><PositionAssignments /></ProtectedRoute>} />
            <Route path="/position-levels/*" element={<ProtectedRoute section="position-levels"><PositionLevels /></ProtectedRoute>} />
            <Route path="/position-types/*" element={<ProtectedRoute section="position-types"><PositionTypes /></ProtectedRoute>} />
            <Route path="/position-role-mappings/*" element={<ProtectedRoute section="position-role-mappings"><PositionTypeMapping /></ProtectedRoute>} />
            <Route path="/shifts/*" element={<ProtectedRoute section="shifts"><Shifts /></ProtectedRoute>} />
            <Route path="/position-shift-rosters/*" element={<ProtectedRoute section="position-shift-rosters"><PositionShiftRoster /></ProtectedRoute>} />
            <Route path="/manager-screen-mappings/*" element={<ProtectedRoute section="manager-screen-mappings"><ManagerScreenMapping /></ProtectedRoute>} />
            <Route path="/position-screen-mappings/*" element={<ProtectedRoute section="position-screen-mappings"><PositionScreenMapping /></ProtectedRoute>} />
            <Route path="/projects/*" element={<ProtectedRoute section="projects"><Projects /></ProtectedRoute>} />
            <Route path="/position-activity-logs/*" element={<ProtectedRoute section="position-activity-logs"><PositionActivityLogs /></ProtectedRoute>} />

            {/* Employee Sub-Records (modal-based, routes needed to prevent wildcard match) */}
            <Route path="/employee-documents/*" element={<ProtectedRoute section="employees"><Employees /></ProtectedRoute>} />
            <Route path="/employee-education/*" element={<ProtectedRoute section="employees"><Employees /></ProtectedRoute>} />
            <Route path="/employee-experience/*" element={<ProtectedRoute section="employees"><Employees /></ProtectedRoute>} />
            <Route path="/employee-employment-history/*" element={<ProtectedRoute section="employees"><Employees /></ProtectedRoute>} />
            <Route path="/employee-bank-details/*" element={<ProtectedRoute section="employees"><Employees /></ProtectedRoute>} />
            <Route path="/employee-epfo-details/*" element={<ProtectedRoute section="employees"><Employees /></ProtectedRoute>} />
            <Route path="/employee-health-details/*" element={<ProtectedRoute section="employees"><Employees /></ProtectedRoute>} />
            <Route path="/employee-salary-details/*" element={<ProtectedRoute section="employees"><Employees /></ProtectedRoute>} />

            {/* Geo Locations */}
            <Route path="/geo-continents/*" element={<ProtectedRoute section="geo-continents"><GeoLocations /></ProtectedRoute>} />
            <Route path="/geo-countries/*" element={<ProtectedRoute section="geo-countries"><GeoLocations /></ProtectedRoute>} />
            <Route path="/geo-states/*" element={<ProtectedRoute section="geo-states"><GeoLocations /></ProtectedRoute>} />
            <Route path="/geo-districts/*" element={<ProtectedRoute section="geo-districts"><GeoLocations /></ProtectedRoute>} />
            <Route path="/geo-mandals/*" element={<ProtectedRoute section="geo-mandals"><GeoLocations /></ProtectedRoute>} />
            <Route path="/geo-clusters/*" element={<ProtectedRoute section="geo-clusters"><GeoLocations /></ProtectedRoute>} />
            <Route path="/visiting-locations/*" element={<ProtectedRoute section="visiting-locations"><GeoLocations /></ProtectedRoute>} />
            <Route path="/landmarks/*" element={<ProtectedRoute section="landmarks"><GeoLocations /></ProtectedRoute>} />

            <Route path="*" element={
              <div style={{ padding: '4rem', textAlign: 'center' }}>
                <h2 style={{ color: '#94a3b8' }}>Module Under Construction</h2>
                <p style={{ color: '#cbd5e1' }}>This section is currently being modularized.</p>
              </div>
            } />
          </Routes>
        </Layout>
      )}
    </>
  );
};

function App() {
  return (
    <DataProvider>
      <React.Suspense fallback={
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99999,
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <BavyaSpinner label="Loading module..." />
        </div>
      }>
        <AppContent />
      </React.Suspense>
    </DataProvider>
  );
}

export default App;
