import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initUITheme, getUITheme } from "./lib/uiTheme";
import { loadIosIcons } from "./lib/iosIcons";
import { initRipple } from "./lib/ripple";

initUITheme();
initRipple();

const start = () => createRoot(document.getElementById("root")!).render(<App />);

// iOS theme swaps Lucide for SF-style glyphs — fetch them first so the first paint already has them
if (getUITheme() === "ios") loadIosIcons().finally(start);
else start();
