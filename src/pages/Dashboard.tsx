import React from "react";

const Dashboard = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Přehled
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Vítejte zpět! Zde je přehled vašich pacientů pro dnešní den.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            title: "Celkem pacientů",
            value: "1,248",
            change: "+12%",
            trend: "up",
          },
          { title: "Dnešní návštěvy", value: "24", change: "+4", trend: "up" },
          {
            title: "Čekající dokumenty",
            value: "8",
            change: "-2",
            trend: "down",
          },
          {
            title: "Laboratorní výsledky",
            value: "5",
            change: "0%",
            trend: "neutral",
          },
        ].map((stat, index) => (
          <div key={index} className="card p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {stat.title}
              </span>
              <span
                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  stat.trend === "up"
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                    : stat.trend === "down"
                    ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                    : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                }`}
              >
                {stat.change}
              </span>
            </div>
            <div className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">
          Nedávná aktivita
        </h2>
        <div className="mt-4 space-y-4">
          {[
            {
              id: 1,
              name: "Jan Novák",
              time: "Před 5 minutami",
              action: "Přidána nová zpráva",
            },
            {
              id: 2,
              name: "Petr Svoboda",
              time: "Před 15 minutami",
              action: "Aktualizován zdravotní záznam",
            },
            {
              id: 3,
              name: "Anna Dvořáková",
              time: "Před 30 minutami",
              action: "Naplánována kontrola",
            },
          ].map((activity) => (
            <div key={activity.id} className="flex items-start">
              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <span className="text-blue-600 dark:text-blue-300 font-medium">
                  {activity.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {activity.name}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {activity.action} · {activity.time}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
