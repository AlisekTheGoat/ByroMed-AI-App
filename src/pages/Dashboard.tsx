import React, { useEffect, useMemo, useState } from "react";

type Todo = {
  id: string;
  title: string;
  patient?: string;
  priority: 'high' | 'medium' | 'low';
  done?: boolean;
};

const LS_KEY = 'dashboard_todos_v1';

const Dashboard = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState('');
  const [patient, setPatient] = useState('');
  const [priority, setPriority] = useState<Todo['priority']>('medium');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setTodos(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(todos));
    } catch {}
  }, [todos]);

  const addTodo = () => {
    if (!title.trim()) return;
    const t: Todo = { id: crypto.randomUUID(), title: title.trim(), patient: patient.trim() || undefined, priority };
    setTodos((prev) => [t, ...prev]);
    setTitle('');
    setPatient('');
    setPriority('medium');
  };

  const markDone = (id: string) => {
    // mark done for animation, then remove after fade-out
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, done: true } : t)));
    setTimeout(() => setTodos((prev) => prev.filter((t) => t.id !== id)), 450);
  };

  const sorted = useMemo(() => {
    const order = { high: 0, medium: 1, low: 2 } as const;
    return [...todos].sort((a, b) => order[a.priority] - order[b.priority]);
  }, [todos]);

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
        <div className="flex items-center gap-2">
          <button className="btn" title="Nový pacient">
            <i className="bi bi-person-plus mr-2" /> Nový pacient
          </button>
          <button className="btn btn-secondary" title="Nová událost">
            <i className="bi bi-calendar-plus mr-2" /> Nová událost
          </button>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Úkoly (TODO)</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Název úkolu"
              className="md:col-span-3"
            />
            <input
              value={patient}
              onChange={(e) => setPatient(e.target.value)}
              placeholder="Pacient (volitelné)"
              className="md:col-span-2"
            />
            <select value={priority} onChange={(e) => setPriority(e.target.value as Todo['priority'])}>
              <option value="high">Vysoká</option>
              <option value="medium">Střední</option>
              <option value="low">Nízká</option>
            </select>
          </div>
          <div className="mt-3 flex justify-end">
            <button onClick={addTodo} className="btn">
              <i className="bi bi-plus-lg mr-2" /> Přidat úkol
            </button>
          </div>
          <div className="mt-4 divide-y divide-gray-100 dark:divide-gray-800">
            {sorted.map((t) => (
              <div
                key={t.id}
                className={`flex items-center gap-3 py-3 transition-all duration-300 ${t.done ? 'opacity-0 line-through' : 'opacity-100'}`}
              >
                <button
                  onClick={() => markDone(t.id)}
                  className="h-8 w-8 flex items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                  title="Dokončit"
                >
                  <i className="bi bi-check2" />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        t.priority === 'high'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'
                          : t.priority === 'medium'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200'
                      }`}
                    >
                      {t.priority === 'high' ? 'Vysoká' : t.priority === 'medium' ? 'Střední' : 'Nízká'}
                    </span>
                    <span className="font-medium truncate text-gray-900 dark:text-white">{t.title}</span>
                  </div>
                  {t.patient && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Pacient: {t.patient}</div>
                  )}
                </div>
              </div>
            ))}
            {sorted.length === 0 && (
              <div className="py-6 text-sm text-gray-500 dark:text-gray-400">Žádné úkoly. Přidejte první úkol výše.</div>
            )}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Rychlé akce</h2>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { icon: 'calendar-event', label: 'Naplánovat' },
              { icon: 'file-earmark-plus', label: 'Nový záznam' },
              { icon: 'envelope-paper', label: 'Poslat zprávu' },
              { icon: 'clipboard2-pulse', label: 'Objednat lab' },
              { icon: 'person-video2', label: 'Telemedicína' },
              { icon: 'bell', label: 'Připomenutí' },
            ].map((a) => (
              <button key={a.label} className="btn">
                <i className={`bi bi-${a.icon} mr-2`} /> {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
