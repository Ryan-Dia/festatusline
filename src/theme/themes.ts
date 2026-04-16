export interface Theme {
  name: string;
  fg: string;
  bg: string;
  accent: string;
  warn: string;
  danger: string;
  muted: string;
  separator: string;
}

export const themes: Record<string, Theme> = {
  default: {
    name: "default",
    fg: "#ffffff",
    bg: "#1e1e2e",
    accent: "#89b4fa",
    warn: "#f9e2af",
    danger: "#f38ba8",
    muted: "#6c7086",
    separator: "│",
  },
  dracula: {
    name: "dracula",
    fg: "#f8f8f2",
    bg: "#282a36",
    accent: "#bd93f9",
    warn: "#f1fa8c",
    danger: "#ff5555",
    muted: "#6272a4",
    separator: "",
  },
  nord: {
    name: "nord",
    fg: "#eceff4",
    bg: "#2e3440",
    accent: "#88c0d0",
    warn: "#ebcb8b",
    danger: "#bf616a",
    muted: "#4c566a",
    separator: "",
  },
  gruvbox: {
    name: "gruvbox",
    fg: "#ebdbb2",
    bg: "#282828",
    accent: "#83a598",
    warn: "#fabd2f",
    danger: "#fb4934",
    muted: "#928374",
    separator: "",
  },
  "tokyo-night": {
    name: "tokyo-night",
    fg: "#a9b1d6",
    bg: "#1a1b26",
    accent: "#7aa2f7",
    warn: "#e0af68",
    danger: "#f7768e",
    muted: "#565f89",
    separator: "",
  },
};

export const THEME_NAMES = Object.keys(themes) as Array<keyof typeof themes>;
