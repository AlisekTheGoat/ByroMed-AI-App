import "./styles.css"; // vytvoříme v dalším kroku alias
import "../../styles/index.css"; // tvůj Tailwind vstup

import React from "react";
import { createRoot } from "react-dom/client";
import App from "./app";

createRoot(document.getElementById("root")!).render(<App />);
