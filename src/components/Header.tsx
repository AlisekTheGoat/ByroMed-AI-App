import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

type ProfilePayload = {
  id: string;
  authSub: string;
  email?: string | null;
  name?: string | null;
  clinicName?: string | null;
  specialty?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  preferences?: Record<string, unknown> | null;
  createdAt: string | Date;
  updatedAt: string | Date;
};

export default function Header() {
  const navigate = useNavigate();
  const [greeting, setGreeting] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const p = await window.api.profile.getSelf();
        if (!mounted || !p) return;
        const prefs = (p.preferences ?? {}) as Record<string, unknown>;
        const prefGreeting =
          typeof (prefs as any).greetingName === "string"
            ? ((prefs as any).greetingName as string)
            : undefined;
        const prefSpec =
          typeof (prefs as any).specialization === "string"
            ? ((prefs as any).specialization as string)
            : undefined;

        const rawName = prefGreeting || p.name || "Doctor";
        const displayName = /^\s*dr\.?/i.test(rawName)
          ? rawName
          : `MUDr. ${rawName}`;
        const specialization = prefSpec || p.specialty || "";
        const text = `Dobrý den • ${displayName}${
          specialization ? ` • ${specialization}` : ""
        }`;
        setGreeting(text);
      } catch (err) {
        // fail silently; keep header minimal without blocking UI
      }
    })();
    const unsubscribe = window.api.profile.onChanged((p: ProfilePayload) => {
      if (!mounted || !p) return;
      const prefs = (p.preferences ?? {}) as Record<string, unknown>;
      const prefGreeting =
        typeof (prefs as any).greetingName === "string"
          ? ((prefs as any).greetingName as string)
          : undefined;
      const prefSpec =
        typeof (prefs as any).specialization === "string"
          ? ((prefs as any).specialization as string)
          : undefined;

      const rawName = prefGreeting || p.name || "Doctor";
      const displayName = /^\s*dr\.?/i.test(rawName)
        ? rawName
        : `MUDr. ${rawName}`;
      const specialization = prefSpec || p.specialty || "";
      const text = `Dobrý den • ${displayName}${
        specialization ? ` • ${specialization}` : ""
      }`;
      setGreeting(text);
    });
    return () => {
      mounted = false;
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  return (
    <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <div className="flex items-center space-x-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 text-primary-600 dark:bg-primary-900/50 dark:text-primary-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            ByroMed{" "}
            <span className="text-primary-600 dark:text-primary-400">AI</span>
          </h1>
        </div>
        {/* Right side controls */}
        <div className="flex items-center space-x-3">
          {greeting && (
            <div className="hidden sm:block text-sm text-gray-600 dark:text-gray-300 select-none">
              {greeting}
            </div>
          )}
          <button
            type="button"
            onClick={() => navigate("/profil")}
            aria-label="Můj profil"
            className="flex items-center rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            title="Můj profil"
          >
            <div className="h-8 w-8 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
              <svg
                className="h-full w-full text-gray-400"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
}
