import React, { ChangeEvent, useState } from "react";
import { useTheme, Theme } from "../hooks/useTheme";

const Settings = () => {
  const { theme, setTheme, fontSize, setFontSize, fontFamily, setFontFamily } =
    useTheme();
  const [formData, setFormData] = useState({
    name: "MUDr. Jan Novotný",
    email: "jan.novotny@byromed.cz",
    phone: "+420 123 456 789",
    specialization: "Praktický lékař",
    language: "cs",
    notifications: {
      email: true,
      sms: false,
      push: true,
    },
    theme: theme as string,
  });

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      setFormData((prev) => ({
        ...prev,
        notifications: {
          ...prev.notifications,
          [name]: (e.target as HTMLInputElement).checked,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission
    alert("Nastavení bylo úspěšně uloženo");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Nastavení
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Spravujte si své osobní a pracovní nastavení
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="card p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
              Osobní údaje
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                <div className="sm:col-span-6">
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Celé jméno
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      name="name"
                      id="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                </div>

                <div className="sm:col-span-4">
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    E-mailová adresa
                  </label>
                  <div className="mt-1">
                    <input
                      type="email"
                      name="email"
                      id="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="phone"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Telefonní číslo
                  </label>
                  <div className="mt-1">
                    <input
                      type="tel"
                      name="phone"
                      id="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                </div>

                <div className="sm:col-span-3">
                  <label
                    htmlFor="specialization"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Odbornost
                  </label>
                  <div className="mt-1">
                    <select
                      id="specialization"
                      name="specialization"
                      value={formData.specialization}
                      onChange={handleChange}
                      className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-800 dark:text-white"
                    >
                      <option>Praktický lékař</option>
                      <option>Internista</option>
                      <option>Chirurg</option>
                      <option>Pediatr</option>
                      <option>Gynekolog</option>
                    </select>
                  </div>
                </div>

                <div className="sm:col-span-3">
                  <label
                    htmlFor="language"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Jazyk
                  </label>
                  <div className="mt-1">
                    <select
                      id="language"
                      name="language"
                      value={formData.language}
                      onChange={handleChange}
                      className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-800 dark:text-white"
                    >
                      <option value="cs">Čeština</option>
                      <option value="en">English</option>
                      <option value="de">Deutsch</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-5">
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="ml-3 inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Uložit změny
                  </button>
                </div>
              </div>
            </form>
          </div>

          <div className="card p-6 mt-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
              Nastavení soukromí
            </h2>

            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex h-5 items-center">
                  <input
                    id="email-notifications"
                    name="email"
                    type="checkbox"
                    checked={formData.notifications.email}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label
                    htmlFor="email-notifications"
                    className="font-medium text-gray-700 dark:text-gray-300"
                  >
                    E-mailová upozornění
                  </label>
                  <p className="text-gray-500 dark:text-gray-400">
                    Dostávejte důležitá upozornění na e-mail
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex h-5 items-center">
                  <input
                    id="sms-notifications"
                    name="sms"
                    type="checkbox"
                    checked={formData.notifications.sms}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label
                    htmlFor="sms-notifications"
                    className="font-medium text-gray-700 dark:text-gray-300"
                  >
                    SMS upozornění
                  </label>
                  <p className="text-gray-500 dark:text-gray-400">
                    Dostávejte důležitá upozornění přes SMS
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex h-5 items-center">
                  <input
                    id="push-notifications"
                    name="push"
                    type="checkbox"
                    checked={formData.notifications.push}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label
                    htmlFor="push-notifications"
                    className="font-medium text-gray-700 dark:text-gray-300"
                  >
                    Push notifikace
                  </label>
                  <p className="text-gray-500 dark:text-gray-400">
                    Povolit oznámení v prohlížeči
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="card p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
              Vzhled
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Motiv
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: "light", name: "Světlý", icon: "☀️" },
                    { id: "dark", name: "Tmavý", icon: "🌙" },
                    { id: "system", name: "Systém", icon: "💻" },
                  ].map((opt) => (
                    <div key={opt.id} className="relative">
                      <input
                        type="radio"
                        id={`theme-${opt.id}`}
                        name="theme"
                        value={opt.id}
                        checked={theme === (opt.id as Theme)}
                        onChange={() => setTheme(opt.id as Theme)}
                        className="peer hidden"
                      />
                      <label
                        htmlFor={`theme-${opt.id}`}
                        className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                          theme === (opt.id as Theme)
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
                            : "border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                        }`}
                      >
                        <span className="text-2xl mb-1">{opt.icon}</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {opt.name}
                        </span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Velikost písma
                </h3>
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="font-size"
                      className="block text-sm text-gray-600 dark:text-gray-400 mb-1"
                    >
                      Velikost písma:{" "}
                      <span className="font-medium">{fontSize}px</span>
                    </label>
                    <input
                      id="font-size"
                      type="range"
                      min={14}
                      max={24}
                      step={2}
                      value={fontSize}
                      onChange={(e) =>
                        setFontSize(parseInt(e.target.value, 10))
                      }
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="font-family"
                      className="block text-sm text-gray-600 dark:text-gray-400 mb-1"
                    >
                      Typ písma
                    </label>
                    <select
                      id="font-family"
                      value={fontFamily}
                      onChange={(e) => setFontFamily(e.target.value as any)}
                      className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-800 dark:text-white"
                    >
                      <option value="Montserrat">Montserrat</option>
                      <option value="Tinos">Tinos</option>
                      <option value="Sensation">Sensation</option>
                      <option value="Roboto">Roboto</option>
                      <option value="Arial">Arial</option>
                      <option value="Inter">Inter</option>
                      <option value="Public Sans">Public Sans</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Nebezpečná zóna
                </h3>
                <div className="space-y-2">
                  <button className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 rounded-md">
                    Smazat účet
                  </button>
                  <button className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 rounded-md">
                    Odhlásit se ze všech zařízení
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
