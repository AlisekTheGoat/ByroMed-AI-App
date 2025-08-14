import { useEffect, useState } from "react";
import { setDarkMode } from "../Theme";

export default function ThemeToggle() {
  const [dark, setDark] = useState(
    typeof localStorage !== "undefined" &&
      localStorage.getItem("theme") === "dark"
  );

  useEffect(() => {
    setDarkMode(dark);
  }, [dark]);

  return (
    <button
      className="button-secondary text-sm"
      onClick={() => setDark((d) => !d)}
      aria-label="Přepnout téma"
      title="Přepnout světlý/tmavý režim"
    >
      {dark ? "🌙 Dark" : "🌞 Light"}
    </button>
  );
}
