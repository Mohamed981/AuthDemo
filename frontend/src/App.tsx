import { Navigate, Outlet, Route, Routes } from 'react-router';
import { useAuth } from './auth/AuthContext';
import { AppPage } from './pages/AppPage';
import { SignInPage } from './pages/SignInPage';
import { SignUpPage } from './pages/SignUpPage';

function RequireAuth() {
  const { status } = useAuth();
  if (status === 'loading') return <p className="loading">Loading…</p>;
  return status === 'authenticated' ? <Outlet /> : <Navigate to="/signin" replace />;
}

function RequireGuest() {
  const { status } = useAuth();
  if (status === 'loading') return <p className="loading">Loading…</p>;
  return status === 'anonymous' ? <Outlet /> : <Navigate to="/" replace />;
}

export function App() {
  return (
    <Routes>
      <Route element={<RequireAuth />}>
        <Route path="/" element={<AppPage />} />
      </Route>
      <Route element={<RequireGuest />}>
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/signup" element={<SignUpPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
