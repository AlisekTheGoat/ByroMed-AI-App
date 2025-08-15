import React from "react";

const ByroAgent = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            ByroAgent
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Váš asistent pro správu lékařské dokumentace
          </p>
        </div>
      </div>

      <div className="card p-5">
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-800/30 mb-6 p-2">
            <img
              src="/images/byro-agent.png"
              alt="Byro AI Assistant"
              className="w-full h-full object-contain animate-float"
              style={{ animation: "float 2s ease-in-out infinite" }}
            />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            Vítejte v ByroAgent
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-lg mx-auto text-lg">
            Jsem váš virtuální asistent. Zeptejte se na cokoliv ohledně
            dokumentace, pacientů nebo lékařských záznamů.
          </p>

          <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center">
              <input
                type="text"
                className="flex-1 bg-transparent border-0 focus:ring-0 text-gray-900 dark:text-white placeholder-gray-400"
                placeholder="Zadejte dotaz..."
              />
              <button className="ml-2 p-2 rounded-full text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="card p-5">
          <h3 className="font-medium text-gray-900 dark:text-white mb-3">
            Rychlé akce
          </h3>
          <div className="space-y-2">
            <button className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md">
              Vytvořit novou zprávu
            </button>
            <button className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md">
              Zkontrolovat dokumenty
            </button>
            <button className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md">
              Zobrazit plán na dnešek
            </button>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="font-medium text-gray-900 dark:text-white mb-3">
            Nedávné dotazy
          </h3>
          <div className="space-y-3">
            {[
              {
                id: 1,
                query: "Zobraz mi pacienty na dnešek",
                time: "Před 10 minutami",
              },
              {
                id: 2,
                query: "Kdy má příští kontrolu Jan Novák?",
                time: "Včera",
              },
              { id: 3, query: "Kolik mám zítra pacientů?", time: "Před 2 dny" },
            ].map((item) => (
              <div key={item.id} className="text-sm">
                <p className="text-gray-900 dark:text-white">{item.query}</p>
                <p className="text-gray-500 dark:text-gray-400 text-xs">
                  {item.time}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ByroAgent;
