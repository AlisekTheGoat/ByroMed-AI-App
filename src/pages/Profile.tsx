import React, { useEffect, useMemo, useState } from "react";
import Toast from "../components/Toast";

type Profile = {
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

const ProfilePage = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<null | {
    type: "success" | "error";
    message: string;
  }>(null);
  const initials = useMemo(() => {
    const n = (profile?.name || "").trim();
    if (!n) return "DR";
    const parts = n.split(/\s+/);
    return (
      parts
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase() || "")
        .join("") || "DR"
    );
  }, [profile?.name]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const p = await window.api.profile.getSelf();
        if (!mounted) return;
        setProfile(p);
      } catch (e) {
        console.error("Failed to load profile", e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    // subscribe to live profile changes
    const unsubscribe = window.api.profile.onChanged((p) => {
      setProfile(p);
    });
    return () => {
      mounted = false;
      try {
        unsubscribe?.();
      } catch {}
    };
  }, []);

  const onSave = async () => {
    setSaving(true);
    try {
      const updated = await window.api.profile.upsertSelf({
        name: profile?.name ?? null,
        email: profile?.email ?? null,
        clinicName: profile?.clinicName ?? null,
        specialty: profile?.specialty ?? null,
        phone: profile?.phone ?? null,
        address: profile?.address ?? null,
        city: profile?.city ?? null,
        country: profile?.country ?? null,
        preferences: profile?.preferences ?? null,
      });
      setProfile(updated);
      setToast({ type: "success", message: "Profil byl úspěšně uložen." });
    } catch (e) {
      console.error("Failed to save profile", e);
      setToast({ type: "error", message: "Uložení profilu se nezdařilo." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Načítám profil…
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          duration={3000}
          onClose={() => setToast(null)}
        />
      )}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Můj profil
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Spravujte svůj veřejný profil a osobní údaje
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <div className="card p-6">
            <div className="flex flex-col items-center">
              <div className="h-32 w-32 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-4xl font-bold text-blue-600 dark:text-blue-300 mb-4">
                {initials}
              </div>
              <input
                className="input w-full mb-2"
                placeholder="Jméno a příjmení"
                value={profile?.name || ""}
                onChange={(e) =>
                  setProfile((p) => ({
                    ...(p || ({} as Profile)),
                    name: e.target.value,
                  }))
                }
              />
              <input
                className="input w-full"
                placeholder="E-mail"
                type="email"
                value={profile?.email || ""}
                onChange={(e) =>
                  setProfile((p) => ({
                    ...(p || ({} as Profile)),
                    email: e.target.value,
                  }))
                }
              />

              <div className="mt-6 w-full space-y-3">
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                  <svg
                    className="h-5 w-5 text-gray-400 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  {profile?.email || "—"}
                </div>
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                  <svg
                    className="h-5 w-5 text-gray-400 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                  <input
                    className="input flex-1"
                    placeholder="Telefon"
                    value={profile?.phone || ""}
                    onChange={(e) =>
                      setProfile((p) => ({
                        ...(p || ({} as Profile)),
                        phone: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                  <svg
                    className="h-5 w-5 text-gray-400 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  <input
                    className="input flex-1"
                    placeholder="Specializace"
                    value={profile?.specialty || ""}
                    onChange={(e) =>
                      setProfile((p) => ({
                        ...(p || ({} as Profile)),
                        specialty: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="flex items-start text-sm text-gray-600 dark:text-gray-300">
                  <svg
                    className="h-5 w-5 text-gray-400 mr-2 mt-0.5 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <input
                    className="input flex-1"
                    placeholder="Adresa"
                    value={profile?.address || ""}
                    onChange={(e) =>
                      setProfile((p) => ({
                        ...(p || ({} as Profile)),
                        address: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="mt-6 w-full">
                <button
                  onClick={onSave}
                  disabled={saving}
                  className="btn btn-primary w-full"
                >
                  {saving ? "Ukládám…" : "Uložit profil"}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
              Dostupnost
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Integrace kalendáře bude přidána později.
            </p>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                Ověření
              </h2>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                Ověřeno
              </span>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                    <svg
                      className="h-5 w-5 text-green-600 dark:text-green-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                      E-mailová adresa
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      E-mail: {profile?.email || "—"}
                    </p>
                  </div>
                </div>
                <button className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                  Změnit
                </button>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                    <svg
                      className="h-5 w-5 text-green-600 dark:text-green-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                      Telefonní číslo
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Telefon: {profile?.phone || "—"}
                    </p>
                  </div>
                </div>
                <button className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                  Změnit
                </button>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                    <svg
                      className="h-5 w-5 text-yellow-500 dark:text-yellow-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                      Ověření totožnosti
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Čeká na ověření
                    </p>
                  </div>
                </div>
                <button className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                  Ověřit
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
