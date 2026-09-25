// The SAP design uses real SAP UI5 Web Components (theme assets, ShellBar, side navigation …)
// and the SAP icon set — about 1 MB — so all of it is downloaded only when someone actually
// uses the SAP design (same idea as lib/iosIcons.ts).
let ready = false;
let loading: Promise<void> | null = null;
let glyphs: Record<string, string> | null = null;

export function loadSap(): Promise<void> {
  if (ready) return Promise.resolve();
  if (!loading) {
    loading = Promise.all([
      import("../sap/sapIconData").then((m) => {
        glyphs = m.SAP_GLYPHS;
      }),
      import("../sap/runtime"),
    ])
      .then(() => {
        ready = true;
      })
      .catch(() => {
        loading = null; // allow a retry; the design just falls back to plain Minimal meanwhile
      });
  }
  return loading;
}

// SAP icon path for a Lucide icon name (all SAP glyphs share this viewBox)
export const getSapGlyph = (name: string): string | undefined => glyphs?.[name];
export const SAP_VIEWBOX = "0 0 16 16";
