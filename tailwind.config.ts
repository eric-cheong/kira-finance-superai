import daisyui from "daisyui";
import type { Config } from "tailwindcss";

type DaisyUITheme = Record<string, Record<string, string>>;

type ConfigWithDaisyUI = Config & {
  daisyui?: {
    themes?: Array<string | DaisyUITheme>;
    darkTheme?: string;
    base?: boolean;
    styled?: boolean;
    utils?: boolean;
    prefix?: string;
    logs?: boolean;
    themeRoot?: string;
  };
};

const config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--bg) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        "surface-2": "rgb(var(--surface-2) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)",
        "border-strong": "rgb(var(--border-strong) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        "ink-2": "rgb(var(--ink-2) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        faint: "rgb(var(--faint) / <alpha-value>)",
        brand: "rgb(var(--brand) / <alpha-value>)",
        "brand-soft": "rgb(var(--brand-soft) / <alpha-value>)",
        "pos-fg": "rgb(var(--pos-fg) / <alpha-value>)",
        "pos-bg": "rgb(var(--pos-bg) / <alpha-value>)",
        "warn-fg": "rgb(var(--warn-fg) / <alpha-value>)",
        "warn-bg": "rgb(var(--warn-bg) / <alpha-value>)",
        "crit-fg": "rgb(var(--crit-fg) / <alpha-value>)",
        "crit-bg": "rgb(var(--crit-bg) / <alpha-value>)",
        "info-fg": "rgb(var(--info-fg) / <alpha-value>)",
        "info-bg": "rgb(var(--info-bg) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
      borderRadius: {
        xl: "14px",
        lg: "10px",
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "0.875rem" }],
      },
      boxShadow: {
        card: "0 1px 1px rgb(15 23 42 / 0.04), 0 18px 34px -28px rgb(15 23 42 / 0.24)",
        pop: "0 24px 56px -30px rgb(15 23 42 / 0.32)",
      },
      maxWidth: {
        content: "1180px",
      },
    },
  },
  plugins: [daisyui],
  daisyui: {
    themes: [
      {
        kira: {
          "color-scheme": "light",
          primary: "#0e1218",
          "primary-content": "#ffffff",
          secondary: "#0e1218",
          "secondary-content": "#ffffff",
          accent: "#2f5f98",
          "accent-content": "#ffffff",
          neutral: "#0e1218",
          "neutral-content": "#ffffff",
          "base-100": "#ffffff",
          "base-200": "#f3f6fa",
          "base-300": "#d9e1ea",
          "base-content": "#0e1218",
          info: "#2f5f98",
          "info-content": "#ffffff",
          success: "#2f5f98",
          "success-content": "#ffffff",
          warning: "#2f5f98",
          "warning-content": "#ffffff",
          error: "#b01b2e",
          "error-content": "#ffffff",
          "--rounded-box": "0.75rem",
          "--rounded-btn": "0.5rem",
          "--rounded-badge": "999px",
          "--animation-btn": "0.15s",
          "--btn-focus-scale": "0.98",
          "--border-btn": "1px",
        },
      },
    ],
    darkTheme: "kira",
    base: true,
    styled: true,
    utils: true,
    logs: false,
  },
} satisfies ConfigWithDaisyUI;

export default config;
