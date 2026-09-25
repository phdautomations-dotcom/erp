import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initUITheme, getUITheme, getUIDesign } from "./lib/uiTheme";
import { loadIosIcons } from "./lib/iosIcons";
import { loadSap } from "./lib/sapLoader";
import { initRipple } from "./lib/ripple";

initUITheme();
initRipple();

const start = () => createRoot(document.getElementById("root")!).render(<App />);

// iOS swaps Lucide for SF-style glyphs and SAP brings its UI5 runtime + icons — fetch them first so
// the first paint already has them
if (getUIDesign() === "sap") loadSap().finally(start);
else if (getUITheme() === "ios") loadIosIcons().finally(start);
else start();
