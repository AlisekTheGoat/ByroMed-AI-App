import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/Auth";

export default function Login() {
  const { isAuthenticated, loading, login } = useAuth();
  const location = useLocation() as any;
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const from = location.state?.from?.pathname || "/";

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, loading, from, navigate]);

  const onLogin = async () => {
    setError(null);
    try {
      await login();
      // Navigation will be handled by the useEffect above when state updates
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Sign in to ByroMed</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Secure login with Auth0</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-200">
            {error}
          </div>
        )}

        <button
          onClick={onLogin}
          disabled={loading}
          className="w-full inline-flex items-center justify-center px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium transition"
        >
          {loading ? "Signing in…" : "Sign in with Auth0"}
        </button>

        <p className="mt-4 text-xs text-center text-gray-500 dark:text-gray-400">
          You must sign in to use the application.
        </p>
      </div>
    </div>
  );
}
