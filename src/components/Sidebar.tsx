import { NavLink } from "react-router-dom";
import { useTheme } from "../hooks/useTheme";

const navigation = [
  {
    name: "Dashboard",
    icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
    path: "/",
  },
  {
    name: "ByroAgent",
    icon: "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z",
    path: "/byroagent",
  },
  {
    name: "Pacienti",
    icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
    path: "/pacienti",
  },
  {
    name: "Kalendář",
    icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    path: "/kalendar",
  },
  {
    name: "Dokumenty",
    icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    path: "/dokumenty",
  },
];

export default function Sidebar() {
  const { isDark } = useTheme();

  return (
    <div className="hidden w-20 flex-col border-r border-gray-200 bg-white py-6 dark:border-gray-800 dark:bg-gray-900 md:flex lg:w-64">
      <div className="flex flex-1 flex-col overflow-y-auto">
        <nav className="flex-1 space-y-1 px-2">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={(isActive) =>
                isActive
                  ? "group flex items-center rounded-lg p-3 text-sm font-medium transition-colors bg-primary-50 text-primary-700 dark:bg-gray-800 dark:text-primary-400"
                  : "group flex items-center rounded-lg p-3 text-sm font-medium transition-colors text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
              }
            >
              <svg
                className={`h-6 w-6 flex-shrink-0 transition-colors ${
                  isDark ? "text-primary-400" : "text-primary-600"
                }`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={item.icon}
                />
              </svg>
              <span className="ml-3 hidden lg:inline">{item.name}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Bottom section for user/settings and profile */}
      <div className="mt-auto px-2 space-y-1">
        <NavLink
          to="/profil"
          className={({ isActive }) =>
            `group flex items-center rounded-lg p-3 text-sm font-medium transition-colors
            ${
              isActive
                ? "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
            }`
          }
        >
          <svg
            className="h-6 w-6 flex-shrink-0 text-gray-400 group-hover:text-gray-500 dark:text-gray-500 dark:group-hover:text-gray-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
          <span className="ml-3 hidden lg:inline">Můj profil</span>
        </NavLink>

        <NavLink
          to="/nastaveni"
          className={({ isActive }) =>
            `group flex items-center rounded-lg p-3 text-sm font-medium transition-colors
            ${
              isActive
                ? "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
            }`
          }
        >
          <svg
            className="h-6 w-6 flex-shrink-0 text-gray-400 group-hover:text-gray-500 dark:text-gray-500 dark:group-hover:text-gray-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <span className="ml-3 hidden lg:inline">Nastavení</span>
        </NavLink>
      </div>
    </div>
  );
}
