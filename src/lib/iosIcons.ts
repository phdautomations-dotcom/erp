// The iOS glyph data (~80 KB) is only downloaded when someone actually uses the iOS theme.
let data: Record<string, string> | null = null;
let loading: Promise<void> | null = null;

export function loadIosIcons(): Promise<void> {
  if (data) return Promise.resolve();
  if (!loading) {
    loading = import("./iosIconData")
      .then((m) => {
        data = m.IOS_GLYPHS;
      })
      .catch(() => {
        loading = null; // allow a retry; icons just fall back to Lucide meanwhile
      });
  }
  return loading;
}

export const getIosGlyph = (name: string): string | undefined => data?.[name];
