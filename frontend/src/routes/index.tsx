import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppLayout } from '@/layouts/AppLayout';
import { useAuth } from '@/contexts/AuthContext';

const LandingPage = lazy(() =>
  import('@/pages/LandingPage').then((m) => ({ default: m.LandingPage }))
);
const LoginPage = lazy(() => import('@/pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const LabRecordWorkspacePage = lazy(() =>
  import('@/pages/LabRecordWorkspacePage').then((m) => ({ default: m.LabRecordWorkspacePage }))
);
const RecordPreviewPage = lazy(() =>
  import('@/pages/RecordPreviewPage').then((m) => ({ default: m.RecordPreviewPage }))
);
const HistoryPage = lazy(() =>
  import('@/pages/HistoryPage').then((m) => ({ default: m.HistoryPage }))
);
const SettingsPage = lazy(() =>
  import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage }))
);
const NotFoundPage = lazy(() =>
  import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage }))
);

function RedirectToRecord() {
  const { id } = useParams();
  return <Navigate to={`/records/${id}`} replace />;
}

function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
    </div>
  );
}

function RootRoute() {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (user) return <Navigate to="/records/new" replace />;
  return <LandingPage />;
}

export function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<RootRoute />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Navigate to="/records/new" replace />} />
          <Route path="/records/new" element={<LabRecordWorkspacePage />} />
          <Route path="/records/:id" element={<LabRecordWorkspacePage />} />
          <Route path="/records/:id/preview" element={<RecordPreviewPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/subjects/new" element={<Navigate to="/records/new" replace />} />
          <Route path="/subjects/:id/experiments" element={<RedirectToRecord />} />
          <Route path="/subjects/:id/preview" element={<RedirectToRecord />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
