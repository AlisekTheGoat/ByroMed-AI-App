import { ThemeProvider } from "./hooks/useTheme";
import Router from "./Router";
import { AuthProvider } from "./auth/Auth";

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router />
      </AuthProvider>
    </ThemeProvider>
  );
}
