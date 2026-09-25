// Loaded on demand by lib/sapLoader.ts. Brings in the SAP UI5 theme + i18n assets (Horizon is the
// default theme), the SAP icons we use, and the SAP design's stylesheet.
import "@ui5/webcomponents-fiori/dist/Assets.js";
import { setLanguage } from "@ui5/webcomponents-base/dist/config/Language.js";
import "./sapIcons";
import "./sap.css";

setLanguage("en");
