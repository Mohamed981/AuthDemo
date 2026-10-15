import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { userFacingError } from '../lib/errorMessage';

export function AppPage() {
  const { user, signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    setError(null);
    try {
      await signOut();
    } catch (err) {
      setError(userFacingError(err, 'sign out'));
      setIsSigningOut(false);
    }
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <span className="brand">AuthDemo</span>
        <div className="topbar-user">
          <span>{user?.name}</span>
          <button type="button" className="button button-secondary" onClick={handleSignOut} disabled={isSigningOut}>
            {isSigningOut ? 'Logging out…' : 'Logout'}
          </button>
        </div>
      </header>
      {error && (
        <div className="form-error banner" role="alert">
          {error}
        </div>
      )}
      <main className="page">
        <h1 className="welcome">Welcome to the application.</h1>
      </main>
    </div>
  );
}
