import type { Config } from "tailwindcss";

// Material 3 color roles exposed as utilities (bg-surface-container,
// text-on-surface-variant, border-outline-variant, …). The values are HSL
// channel triplets defined in src/index.css so light/dark can swap them.
const md = (role: string) => `hsl(var(--md-${role}))`;

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },

        // ── Material 3 roles ──
        surface: md("surface"),
        "surface-dim": md("surface-dim"),
        "surface-bright": md("surface-bright"),
        "surface-container-lowest": md("surface-container-lowest"),
        "surface-container-low": md("surface-container-low"),
        "surface-container": md("surface-container"),
        "surface-container-high": md("surface-container-high"),
        "surface-container-highest": md("surface-container-highest"),
        "on-surface": md("on-surface"),
        "on-surface-variant": md("on-surface-variant"),
        outline: md("outline"),
        "outline-variant": md("outline-variant"),
        "primary-container": md("primary-container"),
        "on-primary-container": md("on-primary-container"),
        "secondary-container": md("secondary-container"),
        "on-secondary-container": md("on-secondary-container"),
        tertiary: md("tertiary"),
        "on-tertiary": md("on-tertiary"),
        "tertiary-container": md("tertiary-container"),
        "on-tertiary-container": md("on-tertiary-container"),
        "error-container": md("error-container"),
        "on-error-container": md("on-error-container"),
        "inverse-surface": md("inverse-surface"),
        "inverse-on-surface": md("inverse-on-surface"),
        "inverse-primary": md("inverse-primary"),
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      // Fonts, elevation and motion come from CSS variables so the two UI
      // themes (Material / Minimal — see src/lib/uiTheme.ts) can each define them.
      fontFamily: {
        display: "var(--font-display)",
        sans: "var(--font-sans)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        DEFAULT: "var(--shadow)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
        "2xl": "var(--shadow-2xl)",
      },
      transitionTimingFunction: {
        DEFAULT: "var(--ease-default)",
        standard: "cubic-bezier(0.2, 0, 0, 1)",
        emphasized: "cubic-bezier(0.2, 0, 0, 1)",
      },
      transitionDuration: {
        DEFAULT: "var(--dur-default)",
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        "fade-in": { "0%": { opacity: "0", transform: "translateY(10px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        "fade-up": { "0%": { opacity: "0", transform: "translateY(24px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        "scale-in": { "0%": { opacity: "0", transform: "scale(0.96)" }, "100%": { opacity: "1", transform: "scale(1)" } },
        "float-slow": { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-12px)" } },
        "spin-slow": { to: { transform: "rotate(360deg)" } },
        "shimmer": { "100%": { transform: "translateX(100%)" } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.5s var(--ease-out-expo, cubic-bezier(0.2,0,0,1)) both",
        "fade-up": "fade-up 0.7s var(--ease-out-expo, cubic-bezier(0.2,0,0,1)) both",
        "scale-in": "scale-in 0.4s ease-out both",
        "float-slow": "float-slow 6s ease-in-out infinite",
        "spin-slow": "spin-slow 30s linear infinite",
        "shimmer": "shimmer 1.4s linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
