import { useCallback, useEffect, useMemo, useState } from "react";

export type CalendarColor =
  | "blue"
  | "green"
  | "red"
  | "yellow"
  | "purple"
  | "gray";

export type CalendarEvent = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  start?: string; // HH:mm
  end?: string;   // HH:mm
  color: CalendarColor;
  notes?: string;
};

function toKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const LS_KEY = "calendarEvents";

function loadLocal(): CalendarEvent[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? (arr as CalendarEvent[]) : [];
  } catch {
    return [];
  }
}

function saveLocal(list: CalendarEvent[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(list));
  } catch {}
}

export function useCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const hasIPC = !!window.api?.calendar?.list;
      if (hasIPC) {
        try {
          const list = await window.api?.calendar?.list?.();
          if (mounted && Array.isArray(list)) setEvents(list);
        } catch (e) {
          console.warn("Failed to load calendar events (IPC)", e);
          // fallback to local
          if (mounted) setEvents(loadLocal());
        }
      } else {
        // local fallback
        if (mounted) setEvents(loadLocal());
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const addEvent = useCallback((ev: Omit<CalendarEvent, "id">) => {
    (async () => {
      if (window.api?.calendar?.add) {
        try {
          const created = await window.api.calendar.add(ev);
          if (created) setEvents((prev) => [...prev, created]);
        } catch (e) {
          console.warn("addEvent failed (IPC)", e);
        }
      } else {
        // local fallback
        const created: CalendarEvent = { id: crypto.randomUUID?.() || `${Date.now()}_${Math.random()}`, ...ev };
        setEvents((prev) => {
          const next = [...prev, created];
          saveLocal(next);
          return next;
        });
      }
    })();
  }, []);

  const removeEvent = useCallback((id: string) => {
    (async () => {
      if (window.api?.calendar?.delete) {
        try {
          const ok = await window.api.calendar.delete(id);
          if (ok) setEvents((prev) => prev.filter((e) => e.id !== id));
        } catch (e) {
          console.warn("removeEvent failed (IPC)", e);
        }
      } else {
        setEvents((prev) => {
          const next = prev.filter((e) => e.id !== id);
          saveLocal(next);
          return next;
        });
      }
    })();
  }, []);

  const updateEvent = useCallback((id: string, patch: Partial<CalendarEvent>) => {
    (async () => {
      if (window.api?.calendar?.update) {
        try {
          const updated = await window.api.calendar.update(id, patch);
          if (updated)
            setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, ...updated } : e)));
        } catch (e) {
          console.warn("updateEvent failed (IPC)", e);
        }
      } else {
        setEvents((prev) => {
          const next = prev.map((e) => (e.id === id ? { ...e, ...patch } : e));
          saveLocal(next);
          return next;
        });
      }
    })();
  }, []);

  const getEventsByDate = useCallback(
    (d: Date) => {
      const key = toKey(d);
      return events
        .filter((e) => e.date === key)
        .sort((a, b) => (a.start || "") > (b.start || "") ? 1 : -1);
    },
    [events]
  );

  const allDatesMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of events) map.set(e.date, (map.get(e.date) || 0) + 1);
    return map;
  }, [events]);

  const getUpcoming = useCallback(async (maxCount: number = 3) => {
    if (window.api?.calendar?.upcoming) {
      try {
        const up = await window.api.calendar.upcoming(maxCount);
        return Array.isArray(up) ? up : [];
      } catch (e) {
        console.warn("getUpcoming failed (IPC)", e);
        return [];
      }
    }
    // local fallback
    const now = new Date();
    return loadLocal()
      .map((e) => ({ e, dt: new Date(`${e.date}T${e.start || "00:00"}:00`) }))
      .filter((x) => !isNaN(x.dt.getTime()) && x.dt >= now)
      .sort((a, b) => a.dt.getTime() - b.dt.getTime())
      .slice(0, Math.max(1, maxCount))
      .map((x) => x.e);
  }, []);

  const googleSync = useCallback(async (options?: { direction?: "push" | "pull" | "two-way" }) => {
    try {
      const res = await window.api?.calendar?.googleSync?.(options);
      return res ?? { ok: false, message: "googleSync unavailable" };
    } catch (e) {
      console.warn("googleSync failed", e);
      return { ok: false, message: "googleSync error" } as const;
    }
  }, []);

  return { events, addEvent, removeEvent, updateEvent, getEventsByDate, allDatesMap, getUpcoming, googleSync };
}
