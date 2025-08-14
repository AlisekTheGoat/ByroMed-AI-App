import { ThemeProvider } from "./hooks/useTheme";
import Router from "./Router";

export default function App() {
  return (
    <ThemeProvider>
      <Router />
    </ThemeProvider>
  );
}
