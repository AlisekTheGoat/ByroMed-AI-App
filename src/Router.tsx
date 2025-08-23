import {
  HashRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import { lazy, Suspense } from "react";
import Layout from "./components/Layout";

// Lazy load all pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ByroAgent = lazy(() => import("./pages/ByroAgent"));
const Calendar = lazy(() => import("./pages/Calendar"));
const Documents = lazy(() => import("./pages/Documents"));
const Patients = lazy(() => import("./pages/Patients"));
const Settings = lazy(() => import("./pages/Settings"));
const Profile = lazy(() => import("./pages/Profile"));

// Layout wrapper component with loading state
const LayoutWrapper = () => (
  <Layout>
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-12 w-12 bg-blue-200 dark:bg-blue-800 rounded-full mb-4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
          </div>
        </div>
      }
    >
      <Outlet />
    </Suspense>
  </Layout>
);

// No auth guard; routes are always accessible

const AppRouter = () => {
  return (
    <Router>
      <Routes>
        <Route element={<LayoutWrapper />}>
          <Route index element={<Dashboard />} />
          <Route path="byroagent" element={<ByroAgent />} />
          <Route path="kalendar" element={<Calendar />} />
          <Route path="dokumenty" element={<Documents />} />
          <Route path="pacienti" element={<Patients />} />
          <Route path="nastaveni" element={<Settings />} />
          <Route path="profil" element={<Profile />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default AppRouter;
