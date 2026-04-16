export { themes, THEME_NAMES, type Theme } from "./themes.js";

import { themes, type Theme } from "./themes.js";

export function getTheme(name: string): Theme {
  return themes[name] ?? themes["default"]!;
}
