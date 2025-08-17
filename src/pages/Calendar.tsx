import React, { FormEvent, useEffect, useMemo, useState } from "react";
import {
  useCalendar,
  CalendarColor,
  CalendarEvent,
} from "../hooks/useCalendar";

const Calendar = () => {
  const today = new Date();
  const [cursor, setCursor] = useState<Date>(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mode, setMode] = useState<"day" | "week" | "month" | "upcoming">(
    "month"
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{
    title: string;
    date: string;
    start: string;
    end: string;
    color: CalendarColor;
    notes: string;
  }>({
    title: "",
    date: toKey(today),
    start: "",
    end: "",
    color: "blue",
    notes: "",
  });
  const { addEvent, updateEvent, removeEvent, getEventsByDate, getUpcoming } =
    useCalendar();
  const [upcoming, setUpcoming] = useState<CalendarEvent[]>([]);
  useEffect(() => {
    if (mode === "upcoming") {
      (async () => setUpcoming(await getUpcoming(3)))();
    }
  }, [mode, getUpcoming]);

  const { monthLabel, weeks } = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    const startDay = (start.getDay() + 6) % 7; // ISO: Mon=0
    const totalDays = end.getDate();
    const days: Array<{ date: Date; inMonth: boolean; isToday: boolean }>[] =
      [];
    let week: Array<{ date: Date; inMonth: boolean; isToday: boolean }> = [];
    // leading blanks from previous month
    for (let i = 0; i < startDay; i++) {
      const d = new Date(year, month, i - startDay + 1);
      week.push({ date: d, inMonth: false, isToday: isSameDay(d, today) });
    }
    for (let d = 1; d <= totalDays; d++) {
      const date = new Date(year, month, d);
      week.push({ date, inMonth: true, isToday: isSameDay(date, today) });
      if (week.length === 7) {
        days.push(week);
        week = [];
      }
    }
    // trailing to fill last week
    if (week.length) {
      const last = week[week.length - 1].date;
      const need = 7 - week.length;
      for (let i = 1; i <= need; i++) {
        const d = new Date(last);
        d.setDate(d.getDate() + i);
        week.push({ date: d, inMonth: false, isToday: isSameDay(d, today) });
      }
      days.push(week);
    }
    const monthLabel = new Intl.DateTimeFormat("cs-CZ", {
      month: "long",
      year: "numeric",
    }).format(cursor);
    return { monthLabel, weeks: days };
  }, [cursor]);

  function isSameDay(a: Date, b: Date) {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  const prevMonth = () =>
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1));
  const nextMonth = () =>
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1));
  const goToday = () => {
    if (mode === "month") {
      setCursor(new Date(today.getFullYear(), today.getMonth(), 1));
    } else {
      setCursor(new Date(today));
    }
  };

  function toKey(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  const openCreate = (date?: Date) => {
    const defaultDate = date ? toKey(date) : toKey(today);
    setDraft({
      title: "",
      date: defaultDate,
      start: "",
      end: "",
      color: "blue",
      notes: "",
    });
    setEditingId(null);
    setIsModalOpen(true);
  };

  const submitCreate = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.title.trim()) return;
    if (editingId) {
      updateEvent(editingId, {
        title: draft.title.trim(),
        date: draft.date,
        start: draft.start || undefined,
        end: draft.end || undefined,
        color: draft.color,
        notes: draft.notes || undefined,
      });
    } else {
      addEvent({
        title: draft.title.trim(),
        date: draft.date,
        start: draft.start || undefined,
        end: draft.end || undefined,
        color: draft.color,
        notes: draft.notes || undefined,
      });
    }
    setIsModalOpen(false);
  };

  const openEdit = (ev: CalendarEvent) => {
    setEditingId(ev.id);
    setDraft({
      title: ev.title,
      date: ev.date,
      start: ev.start || "",
      end: ev.end || "",
      color: ev.color,
      notes: ev.notes || "",
    });
    setIsModalOpen(true);
  };

  const colorToClasses: Record<
    CalendarColor,
    { bg: string; text: string; ring: string }
  > = {
    blue: {
      bg: "bg-blue-100 dark:bg-blue-900/40",
      text: "text-blue-800 dark:text-blue-200",
      ring: "ring-blue-500/40",
    },
    green: {
      bg: "bg-green-100 dark:bg-green-900/40",
      text: "text-green-800 dark:text-green-200",
      ring: "ring-green-500/40",
    },
    red: {
      bg: "bg-red-100 dark:bg-red-900/40",
      text: "text-red-800 dark:text-red-200",
      ring: "ring-red-500/40",
    },
    yellow: {
      bg: "bg-yellow-100 dark:bg-yellow-900/40",
      text: "text-yellow-800 dark:text-yellow-200",
      ring: "ring-yellow-500/40",
    },
    purple: {
      bg: "bg-purple-100 dark:bg-purple-900/40",
      text: "text-purple-800 dark:text-purple-200",
      ring: "ring-purple-500/40",
    },
    gray: {
      bg: "bg-gray-200 dark:bg-gray-700",
      text: "text-gray-800 dark:text-gray-100",
      ring: "ring-gray-500/40",
    },
  };
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Kalendář
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Přehled vašich plánovaných návštěv a událostí
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => openCreate()}>
          <svg
            className="h-5 w-5 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          Nová událost
        </button>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={prevMonth}
              className="px-2 py-1 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
              aria-label="Předchozí období"
            >
              ←
            </button>
            <button
              onClick={goToday}
              className="px-2 py-1 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
              aria-label="Dnešní den"
            >
              Dnes
            </button>
            <button
              onClick={nextMonth}
              className="px-2 py-1 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
              aria-label="Další období"
            >
              →
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-300 select-none">
              {monthLabel}
            </div>
            <div className="inline-flex rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden">
              {["day", "week", "month", "upcoming"].map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m as any)}
                  className={`px-3 py-1 text-sm ${
                    mode === m
                      ? "bg-blue-600 text-white"
                      : "bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                >
                  {m === "day"
                    ? "Den"
                    : m === "week"
                    ? "Týden"
                    : m === "month"
                    ? "Měsíc"
                    : "Nadcházející"}
                </button>
              ))}
            </div>
          </div>
        </div>
        {mode === "month" && (
          <>
            <div className="grid grid-cols-7 text-xs text-gray-500 dark:text-gray-400 mb-1">
              {["Po", "Út", "St", "Čt", "Pá", "So", "Ne"].map((d) => (
                <div key={d} className="px-2 py-1">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-px rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
              {weeks.flat().map((cell, idx) => {
                const dayEvents = getEventsByDate(cell.date);
                const isTodayCell = cell.isToday;
                const todayCellClasses = isTodayCell
                  ? "bg-primary-600 text-white hover:bg-primary-700"
                  : "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700";
                return (
                  <div
                    key={idx}
                    className={`min-h-[104px] p-2 ${todayCellClasses} ${
                      cell.inMonth ? "" : "opacity-50"
                    } relative`}
                    onDoubleClick={() => openCreate(cell.date)}
                  >
                    <div className="flex items-center justify-between">
                      <div
                        className={`text-xs ${
                          isTodayCell
                            ? "text-white font-semibold"
                            : "text-gray-700 dark:text-gray-200"
                        }`}
                      >
                        {cell.date.getDate()}
                      </div>
                      {isTodayCell && (
                        <span className="inline-flex items-center rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium text-primary-700 shadow-sm">
                          Dnes
                        </span>
                      )}
                    </div>
                    <div className="mt-1 space-y-1">
                      {dayEvents.map((ev) => {
                        const c = colorToClasses[ev.color];
                        return (
                          <button
                            key={ev.id}
                            onClick={() => openEdit(ev)}
                            className={`w-full text-left group ${
                              isTodayCell
                                ? "bg-white/10 text-white ring-white/30"
                                : `${c.bg} ${c.text} ring-1 ${c.ring}`
                            } rounded-md px-2 py-1 text-xs leading-tight shadow-sm flex items-center gap-1`}
                          >
                            {ev.start && (
                              <span className="tabular-nums">{ev.start}</span>
                            )}
                            <span className="truncate">{ev.title}</span>
                          </button>
                        );
                      })}
                      {dayEvents.length === 0 && (
                        <button
                          onClick={() => openCreate(cell.date)}
                          className={`w-full text-[10px] ${
                            isTodayCell
                              ? "text-white/80 hover:text-white"
                              : "text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                          } text-left`}
                        >
                          + Přidat událost
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {mode === "week" &&
          (() => {
            // derive current week (Mon-Sun) from cursor
            const startOfWeek = new Date(cursor);
            const dow = (startOfWeek.getDay() + 6) % 7;
            startOfWeek.setDate(startOfWeek.getDate() - dow);
            const days = Array.from({ length: 7 }, (_, i) => {
              const d = new Date(startOfWeek);
              d.setDate(startOfWeek.getDate() + i);
              return d;
            });
            return (
              <div className="grid grid-cols-7 gap-px rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                {days.map((d, idx) => {
                  const dayEvents = getEventsByDate(d);
                  const isTodayCell = isSameDay(d, today);
                  const todayCellClasses = isTodayCell
                    ? "bg-primary-600 text-white hover:bg-primary-700"
                    : "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700";
                  return (
                    <div
                      key={idx}
                      className={`min-h-[140px] p-2 relative ${todayCellClasses}`}
                    >
                      <div className="flex items-center justify-between">
                        <div
                          className={`text-xs ${
                            isTodayCell
                              ? "text-white font-semibold"
                              : "text-gray-700 dark:text-gray-200"
                          }`}
                        >
                          {d.getDate()}.
                        </div>
                        {isTodayCell && (
                          <span className="inline-flex items-center rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium text-primary-700 shadow-sm">
                            Dnes
                          </span>
                        )}
                      </div>
                      <div className="mt-1 space-y-1">
                        {dayEvents.map((ev) => {
                          const c = colorToClasses[ev.color];
                          return (
                            <button
                              key={ev.id}
                              onClick={() => openEdit(ev)}
                              className={`w-full text-left group ${
                                isTodayCell
                                  ? "bg-white/10 text-white ring-white/30"
                                  : `${c.bg} ${c.text} ring-1 ${c.ring}`
                              } rounded-md px-2 py-1 text-xs leading-tight shadow-sm flex items-center gap-1`}
                            >
                              {ev.start && (
                                <span className="tabular-nums">{ev.start}</span>
                              )}
                              <span className="truncate">{ev.title}</span>
                            </button>
                          );
                        })}
                        {dayEvents.length === 0 && (
                          <button
                            onClick={() => openCreate(d)}
                            className={`w-full text-[10px] ${
                              isTodayCell
                                ? "text-white/80 hover:text-white"
                                : "text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                            } text-left`}
                          >
                            + Přidat událost
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

        {mode === "day" &&
          (() => {
            const d = new Date(cursor);
            const dayEvents = getEventsByDate(d);
            const isTodayCell = isSameDay(d, today);
            const hours = Array.from({ length: 24 }, (_, i) => i);
            const getHour = (t?: string) =>
              t ? parseInt(t.split(":")[0] || "0", 10) : null;
            return (
              <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 p-3">
                <div className="flex items-center justify-between">
                  <div
                    className={`text-sm ${
                      isTodayCell
                        ? "text-primary-700 dark:text-primary-300 font-semibold"
                        : "text-gray-700 dark:text-gray-200"
                    }`}
                  >
                    {new Intl.DateTimeFormat("cs-CZ", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    }).format(d)}
                  </div>
                  <div>
                    <button
                      onClick={() => openCreate(d)}
                      className="text-sm px-2 py-1 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      + Přidat
                    </button>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="grid grid-cols-[64px_1fr]">
                    {hours.map((h) => {
                      const atHour = dayEvents.filter(
                        (ev) => getHour(ev.start) === h
                      );
                      return (
                        <React.Fragment key={h}>
                          <div className="pr-3 py-2 text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                            {String(h).padStart(2, "0")}:00
                          </div>
                          <div className="py-1 border-b border-gray-100 dark:border-gray-800 min-h-[40px]">
                            <div className="space-y-1">
                              {atHour.map((ev) => {
                                const c = colorToClasses[ev.color];
                                return (
                                  <button
                                    key={ev.id}
                                    onClick={() => openEdit(ev)}
                                    className={`w-full text-left ${c.bg} ${c.text} rounded-md px-3 py-2 text-xs ring-1 ${c.ring} shadow-sm flex items-center gap-2`}
                                  >
                                    <span className="tabular-nums">
                                      {ev.start}
                                    </span>
                                    <span className="font-medium truncate">
                                      {ev.title}
                                    </span>
                                    {ev.end && (
                                      <span className="ml-auto opacity-70 tabular-nums">
                                        {ev.end}
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>
                  {dayEvents.filter((ev) => getHour(ev.start) == null).length >
                    0 && (
                    <div className="mt-4">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        Bez času
                      </div>
                      <div className="space-y-1">
                        {dayEvents
                          .filter((ev) => getHour(ev.start) == null)
                          .map((ev) => {
                            const c = colorToClasses[ev.color];
                            return (
                              <button
                                key={ev.id}
                                onClick={() => openEdit(ev)}
                                className={`w-full text-left ${c.bg} ${c.text} rounded-md px-3 py-2 text-xs ring-1 ${c.ring} shadow-sm`}
                              >
                                {ev.title}
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

        {mode === "upcoming" && (
          <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-800">
            {upcoming.map((ev) => {
              const c = colorToClasses[ev.color];
              const dt = new Date(`${ev.date}T${ev.start || "00:00"}:00`);
              return (
                <button
                  key={ev.id}
                  onClick={() => openEdit(ev)}
                  className={`w-full text-left px-4 py-3 ${c.bg} ${c.text} ring-1 ${c.ring}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium truncate">{ev.title}</div>
                    <div className="text-xs tabular-nums">
                      {new Intl.DateTimeFormat("cs-CZ", {
                        dateStyle: "medium",
                        timeStyle: ev.start ? "short" : (undefined as any),
                      }).format(dt)}
                    </div>
                  </div>
                  {ev.notes && (
                    <div className="text-xs mt-1 line-clamp-2 opacity-80">
                      {ev.notes}
                    </div>
                  )}
                </button>
              );
            })}
            {upcoming.length === 0 && (
              <div className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400">
                Žádné nadcházející události
              </div>
            )}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-20 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setIsModalOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {editingId ? "Upravit událost" : "Nová událost"}
            </h3>
            <form onSubmit={submitCreate} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                  Název
                </label>
                <input
                  value={draft.title}
                  onChange={(e) =>
                    setDraft({ ...draft, title: e.target.value })
                  }
                  className="w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                    Datum
                  </label>
                  <input
                    type="date"
                    value={draft.date}
                    onChange={(e) =>
                      setDraft({ ...draft, date: e.target.value })
                    }
                    className="w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                    Barva
                  </label>
                  <select
                    value={draft.color}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        color: e.target.value as CalendarColor,
                      })
                    }
                    className="w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="blue">Modrá</option>
                    <option value="green">Zelená</option>
                    <option value="red">Červená</option>
                    <option value="yellow">Žlutá</option>
                    <option value="purple">Fialová</option>
                    <option value="gray">Šedá</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                    Začátek
                  </label>
                  <input
                    type="time"
                    value={draft.start}
                    onChange={(e) =>
                      setDraft({ ...draft, start: e.target.value })
                    }
                    className="w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                    Konec
                  </label>
                  <input
                    type="time"
                    value={draft.end}
                    onChange={(e) =>
                      setDraft({ ...draft, end: e.target.value })
                    }
                    className="w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                  Poznámky
                </label>
                <textarea
                  value={draft.notes}
                  onChange={(e) =>
                    setDraft({ ...draft, notes: e.target.value })
                  }
                  className="w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  rows={3}
                />
              </div>
              <div className="flex justify-between gap-2 pt-2">
                {editingId ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (editingId) {
                        removeEvent(editingId);
                        setIsModalOpen(false);
                      }
                    }}
                    className="px-4 py-2 rounded-md border border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/30"
                  >
                    Smazat
                  </button>
                ) : (
                  <span />
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="px-4 py-2 rounded-md border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Zrušit
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Uložit
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;
