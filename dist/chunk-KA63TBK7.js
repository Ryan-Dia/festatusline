#!/usr/bin/env node

// node_modules/chalk/source/vendor/ansi-styles/index.js
var ANSI_BACKGROUND_OFFSET = 10;
var wrapAnsi16 = (offset = 0) => (code) => `\x1B[${code + offset}m`;
var wrapAnsi256 = (offset = 0) => (code) => `\x1B[${38 + offset};5;${code}m`;
var wrapAnsi16m = (offset = 0) => (red, green, blue) => `\x1B[${38 + offset};2;${red};${green};${blue}m`;
var styles = {
  modifier: {
    reset: [0, 0],
    // 21 isn't widely supported and 22 does the same thing
    bold: [1, 22],
    dim: [2, 22],
    italic: [3, 23],
    underline: [4, 24],
    overline: [53, 55],
    inverse: [7, 27],
    hidden: [8, 28],
    strikethrough: [9, 29]
  },
  color: {
    black: [30, 39],
    red: [31, 39],
    green: [32, 39],
    yellow: [33, 39],
    blue: [34, 39],
    magenta: [35, 39],
    cyan: [36, 39],
    white: [37, 39],
    // Bright color
    blackBright: [90, 39],
    gray: [90, 39],
    // Alias of `blackBright`
    grey: [90, 39],
    // Alias of `blackBright`
    redBright: [91, 39],
    greenBright: [92, 39],
    yellowBright: [93, 39],
    blueBright: [94, 39],
    magentaBright: [95, 39],
    cyanBright: [96, 39],
    whiteBright: [97, 39]
  },
  bgColor: {
    bgBlack: [40, 49],
    bgRed: [41, 49],
    bgGreen: [42, 49],
    bgYellow: [43, 49],
    bgBlue: [44, 49],
    bgMagenta: [45, 49],
    bgCyan: [46, 49],
    bgWhite: [47, 49],
    // Bright color
    bgBlackBright: [100, 49],
    bgGray: [100, 49],
    // Alias of `bgBlackBright`
    bgGrey: [100, 49],
    // Alias of `bgBlackBright`
    bgRedBright: [101, 49],
    bgGreenBright: [102, 49],
    bgYellowBright: [103, 49],
    bgBlueBright: [104, 49],
    bgMagentaBright: [105, 49],
    bgCyanBright: [106, 49],
    bgWhiteBright: [107, 49]
  }
};
var modifierNames = Object.keys(styles.modifier);
var foregroundColorNames = Object.keys(styles.color);
var backgroundColorNames = Object.keys(styles.bgColor);
var colorNames = [...foregroundColorNames, ...backgroundColorNames];
function assembleStyles() {
  const codes = /* @__PURE__ */ new Map();
  for (const [groupName, group] of Object.entries(styles)) {
    for (const [styleName, style] of Object.entries(group)) {
      styles[styleName] = {
        open: `\x1B[${style[0]}m`,
        close: `\x1B[${style[1]}m`
      };
      group[styleName] = styles[styleName];
      codes.set(style[0], style[1]);
    }
    Object.defineProperty(styles, groupName, {
      value: group,
      enumerable: false
    });
  }
  Object.defineProperty(styles, "codes", {
    value: codes,
    enumerable: false
  });
  styles.color.close = "\x1B[39m";
  styles.bgColor.close = "\x1B[49m";
  styles.color.ansi = wrapAnsi16();
  styles.color.ansi256 = wrapAnsi256();
  styles.color.ansi16m = wrapAnsi16m();
  styles.bgColor.ansi = wrapAnsi16(ANSI_BACKGROUND_OFFSET);
  styles.bgColor.ansi256 = wrapAnsi256(ANSI_BACKGROUND_OFFSET);
  styles.bgColor.ansi16m = wrapAnsi16m(ANSI_BACKGROUND_OFFSET);
  Object.defineProperties(styles, {
    rgbToAnsi256: {
      value(red, green, blue) {
        if (red === green && green === blue) {
          if (red < 8) {
            return 16;
          }
          if (red > 248) {
            return 231;
          }
          return Math.round((red - 8) / 247 * 24) + 232;
        }
        return 16 + 36 * Math.round(red / 255 * 5) + 6 * Math.round(green / 255 * 5) + Math.round(blue / 255 * 5);
      },
      enumerable: false
    },
    hexToRgb: {
      value(hex) {
        const matches = /[a-f\d]{6}|[a-f\d]{3}/i.exec(hex.toString(16));
        if (!matches) {
          return [0, 0, 0];
        }
        let [colorString] = matches;
        if (colorString.length === 3) {
          colorString = [...colorString].map((character) => character + character).join("");
        }
        const integer = Number.parseInt(colorString, 16);
        return [
          /* eslint-disable no-bitwise */
          integer >> 16 & 255,
          integer >> 8 & 255,
          integer & 255
          /* eslint-enable no-bitwise */
        ];
      },
      enumerable: false
    },
    hexToAnsi256: {
      value: (hex) => styles.rgbToAnsi256(...styles.hexToRgb(hex)),
      enumerable: false
    },
    ansi256ToAnsi: {
      value(code) {
        if (code < 8) {
          return 30 + code;
        }
        if (code < 16) {
          return 90 + (code - 8);
        }
        let red;
        let green;
        let blue;
        if (code >= 232) {
          red = ((code - 232) * 10 + 8) / 255;
          green = red;
          blue = red;
        } else {
          code -= 16;
          const remainder = code % 36;
          red = Math.floor(code / 36) / 5;
          green = Math.floor(remainder / 6) / 5;
          blue = remainder % 6 / 5;
        }
        const value = Math.max(red, green, blue) * 2;
        if (value === 0) {
          return 30;
        }
        let result = 30 + (Math.round(blue) << 2 | Math.round(green) << 1 | Math.round(red));
        if (value === 2) {
          result += 60;
        }
        return result;
      },
      enumerable: false
    },
    rgbToAnsi: {
      value: (red, green, blue) => styles.ansi256ToAnsi(styles.rgbToAnsi256(red, green, blue)),
      enumerable: false
    },
    hexToAnsi: {
      value: (hex) => styles.ansi256ToAnsi(styles.hexToAnsi256(hex)),
      enumerable: false
    }
  });
  return styles;
}
var ansiStyles = assembleStyles();
var ansi_styles_default = ansiStyles;

// node_modules/chalk/source/vendor/supports-color/index.js
import process2 from "process";
import os from "os";
import tty from "tty";
function hasFlag(flag, argv = globalThis.Deno ? globalThis.Deno.args : process2.argv) {
  const prefix = flag.startsWith("-") ? "" : flag.length === 1 ? "-" : "--";
  const position = argv.indexOf(prefix + flag);
  const terminatorPosition = argv.indexOf("--");
  return position !== -1 && (terminatorPosition === -1 || position < terminatorPosition);
}
var { env } = process2;
var flagForceColor;
if (hasFlag("no-color") || hasFlag("no-colors") || hasFlag("color=false") || hasFlag("color=never")) {
  flagForceColor = 0;
} else if (hasFlag("color") || hasFlag("colors") || hasFlag("color=true") || hasFlag("color=always")) {
  flagForceColor = 1;
}
function envForceColor() {
  if ("FORCE_COLOR" in env) {
    if (env.FORCE_COLOR === "true") {
      return 1;
    }
    if (env.FORCE_COLOR === "false") {
      return 0;
    }
    return env.FORCE_COLOR.length === 0 ? 1 : Math.min(Number.parseInt(env.FORCE_COLOR, 10), 3);
  }
}
function translateLevel(level) {
  if (level === 0) {
    return false;
  }
  return {
    level,
    hasBasic: true,
    has256: level >= 2,
    has16m: level >= 3
  };
}
function _supportsColor(haveStream, { streamIsTTY, sniffFlags = true } = {}) {
  const noFlagForceColor = envForceColor();
  if (noFlagForceColor !== void 0) {
    flagForceColor = noFlagForceColor;
  }
  const forceColor = sniffFlags ? flagForceColor : noFlagForceColor;
  if (forceColor === 0) {
    return 0;
  }
  if (sniffFlags) {
    if (hasFlag("color=16m") || hasFlag("color=full") || hasFlag("color=truecolor")) {
      return 3;
    }
    if (hasFlag("color=256")) {
      return 2;
    }
  }
  if ("TF_BUILD" in env && "AGENT_NAME" in env) {
    return 1;
  }
  if (haveStream && !streamIsTTY && forceColor === void 0) {
    return 0;
  }
  const min = forceColor || 0;
  if (env.TERM === "dumb") {
    return min;
  }
  if (process2.platform === "win32") {
    const osRelease = os.release().split(".");
    if (Number(osRelease[0]) >= 10 && Number(osRelease[2]) >= 10586) {
      return Number(osRelease[2]) >= 14931 ? 3 : 2;
    }
    return 1;
  }
  if ("CI" in env) {
    if (["GITHUB_ACTIONS", "GITEA_ACTIONS", "CIRCLECI"].some((key) => key in env)) {
      return 3;
    }
    if (["TRAVIS", "APPVEYOR", "GITLAB_CI", "BUILDKITE", "DRONE"].some((sign) => sign in env) || env.CI_NAME === "codeship") {
      return 1;
    }
    return min;
  }
  if ("TEAMCITY_VERSION" in env) {
    return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(env.TEAMCITY_VERSION) ? 1 : 0;
  }
  if (env.COLORTERM === "truecolor") {
    return 3;
  }
  if (env.TERM === "xterm-kitty") {
    return 3;
  }
  if (env.TERM === "xterm-ghostty") {
    return 3;
  }
  if (env.TERM === "wezterm") {
    return 3;
  }
  if ("TERM_PROGRAM" in env) {
    const version = Number.parseInt((env.TERM_PROGRAM_VERSION || "").split(".")[0], 10);
    switch (env.TERM_PROGRAM) {
      case "iTerm.app": {
        return version >= 3 ? 3 : 2;
      }
      case "Apple_Terminal": {
        return 2;
      }
    }
  }
  if (/-256(color)?$/i.test(env.TERM)) {
    return 2;
  }
  if (/^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(env.TERM)) {
    return 1;
  }
  if ("COLORTERM" in env) {
    return 1;
  }
  return min;
}
function createSupportsColor(stream, options = {}) {
  const level = _supportsColor(stream, {
    streamIsTTY: stream && stream.isTTY,
    ...options
  });
  return translateLevel(level);
}
var supportsColor = {
  stdout: createSupportsColor({ isTTY: tty.isatty(1) }),
  stderr: createSupportsColor({ isTTY: tty.isatty(2) })
};
var supports_color_default = supportsColor;

// node_modules/chalk/source/utilities.js
function stringReplaceAll(string, substring, replacer) {
  let index = string.indexOf(substring);
  if (index === -1) {
    return string;
  }
  const substringLength = substring.length;
  let endIndex = 0;
  let returnValue = "";
  do {
    returnValue += string.slice(endIndex, index) + substring + replacer;
    endIndex = index + substringLength;
    index = string.indexOf(substring, endIndex);
  } while (index !== -1);
  returnValue += string.slice(endIndex);
  return returnValue;
}
function stringEncaseCRLFWithFirstIndex(string, prefix, postfix, index) {
  let endIndex = 0;
  let returnValue = "";
  do {
    const gotCR = string[index - 1] === "\r";
    returnValue += string.slice(endIndex, gotCR ? index - 1 : index) + prefix + (gotCR ? "\r\n" : "\n") + postfix;
    endIndex = index + 1;
    index = string.indexOf("\n", endIndex);
  } while (index !== -1);
  returnValue += string.slice(endIndex);
  return returnValue;
}

// node_modules/chalk/source/index.js
var { stdout: stdoutColor, stderr: stderrColor } = supports_color_default;
var GENERATOR = /* @__PURE__ */ Symbol("GENERATOR");
var STYLER = /* @__PURE__ */ Symbol("STYLER");
var IS_EMPTY = /* @__PURE__ */ Symbol("IS_EMPTY");
var levelMapping = [
  "ansi",
  "ansi",
  "ansi256",
  "ansi16m"
];
var styles2 = /* @__PURE__ */ Object.create(null);
var applyOptions = (object, options = {}) => {
  if (options.level && !(Number.isInteger(options.level) && options.level >= 0 && options.level <= 3)) {
    throw new Error("The `level` option should be an integer from 0 to 3");
  }
  const colorLevel = stdoutColor ? stdoutColor.level : 0;
  object.level = options.level === void 0 ? colorLevel : options.level;
};
var chalkFactory = (options) => {
  const chalk2 = (...strings) => strings.join(" ");
  applyOptions(chalk2, options);
  Object.setPrototypeOf(chalk2, createChalk.prototype);
  return chalk2;
};
function createChalk(options) {
  return chalkFactory(options);
}
Object.setPrototypeOf(createChalk.prototype, Function.prototype);
for (const [styleName, style] of Object.entries(ansi_styles_default)) {
  styles2[styleName] = {
    get() {
      const builder = createBuilder(this, createStyler(style.open, style.close, this[STYLER]), this[IS_EMPTY]);
      Object.defineProperty(this, styleName, { value: builder });
      return builder;
    }
  };
}
styles2.visible = {
  get() {
    const builder = createBuilder(this, this[STYLER], true);
    Object.defineProperty(this, "visible", { value: builder });
    return builder;
  }
};
var getModelAnsi = (model, level, type, ...arguments_) => {
  if (model === "rgb") {
    if (level === "ansi16m") {
      return ansi_styles_default[type].ansi16m(...arguments_);
    }
    if (level === "ansi256") {
      return ansi_styles_default[type].ansi256(ansi_styles_default.rgbToAnsi256(...arguments_));
    }
    return ansi_styles_default[type].ansi(ansi_styles_default.rgbToAnsi(...arguments_));
  }
  if (model === "hex") {
    return getModelAnsi("rgb", level, type, ...ansi_styles_default.hexToRgb(...arguments_));
  }
  return ansi_styles_default[type][model](...arguments_);
};
var usedModels = ["rgb", "hex", "ansi256"];
for (const model of usedModels) {
  styles2[model] = {
    get() {
      const { level } = this;
      return function(...arguments_) {
        const styler = createStyler(getModelAnsi(model, levelMapping[level], "color", ...arguments_), ansi_styles_default.color.close, this[STYLER]);
        return createBuilder(this, styler, this[IS_EMPTY]);
      };
    }
  };
  const bgModel = "bg" + model[0].toUpperCase() + model.slice(1);
  styles2[bgModel] = {
    get() {
      const { level } = this;
      return function(...arguments_) {
        const styler = createStyler(getModelAnsi(model, levelMapping[level], "bgColor", ...arguments_), ansi_styles_default.bgColor.close, this[STYLER]);
        return createBuilder(this, styler, this[IS_EMPTY]);
      };
    }
  };
}
var proto = Object.defineProperties(() => {
}, {
  ...styles2,
  level: {
    enumerable: true,
    get() {
      return this[GENERATOR].level;
    },
    set(level) {
      this[GENERATOR].level = level;
    }
  }
});
var createStyler = (open, close, parent) => {
  let openAll;
  let closeAll;
  if (parent === void 0) {
    openAll = open;
    closeAll = close;
  } else {
    openAll = parent.openAll + open;
    closeAll = close + parent.closeAll;
  }
  return {
    open,
    close,
    openAll,
    closeAll,
    parent
  };
};
var createBuilder = (self, _styler, _isEmpty) => {
  const builder = (...arguments_) => applyStyle(builder, arguments_.length === 1 ? "" + arguments_[0] : arguments_.join(" "));
  Object.setPrototypeOf(builder, proto);
  builder[GENERATOR] = self;
  builder[STYLER] = _styler;
  builder[IS_EMPTY] = _isEmpty;
  return builder;
};
var applyStyle = (self, string) => {
  if (self.level <= 0 || !string) {
    return self[IS_EMPTY] ? "" : string;
  }
  let styler = self[STYLER];
  if (styler === void 0) {
    return string;
  }
  const { openAll, closeAll } = styler;
  if (string.includes("\x1B")) {
    while (styler !== void 0) {
      string = stringReplaceAll(string, styler.close, styler.open);
      styler = styler.parent;
    }
  }
  const lfIndex = string.indexOf("\n");
  if (lfIndex !== -1) {
    string = stringEncaseCRLFWithFirstIndex(string, closeAll, openAll, lfIndex);
  }
  return openAll + string + closeAll;
};
Object.defineProperties(createChalk.prototype, styles2);
var chalk = createChalk();
var chalkStderr = createChalk({ level: stderrColor ? stderrColor.level : 0 });
var source_default = chalk;

// src/theme/themes.ts
var themes = {
  default: {
    name: "default",
    fg: "#ffffff",
    bg: "#1e1e2e",
    accent: "#89b4fa",
    warn: "#f9e2af",
    danger: "#f38ba8",
    muted: "#6c7086",
    separator: "\u2502"
  },
  dracula: {
    name: "dracula",
    fg: "#f8f8f2",
    bg: "#282a36",
    accent: "#bd93f9",
    warn: "#f1fa8c",
    danger: "#ff5555",
    muted: "#6272a4",
    separator: ""
  },
  nord: {
    name: "nord",
    fg: "#eceff4",
    bg: "#2e3440",
    accent: "#88c0d0",
    warn: "#ebcb8b",
    danger: "#bf616a",
    muted: "#4c566a",
    separator: ""
  },
  gruvbox: {
    name: "gruvbox",
    fg: "#ebdbb2",
    bg: "#282828",
    accent: "#83a598",
    warn: "#fabd2f",
    danger: "#fb4934",
    muted: "#928374",
    separator: ""
  },
  "tokyo-night": {
    name: "tokyo-night",
    fg: "#a9b1d6",
    bg: "#1a1b26",
    accent: "#7aa2f7",
    warn: "#e0af68",
    danger: "#f7768e",
    muted: "#565f89",
    separator: ""
  }
};
var THEME_NAMES = Object.keys(themes);

// src/theme/index.ts
function getTheme(name) {
  return themes[name] ?? themes.default;
}

// src/widgets/Model.ts
var EFFORT_LABELS = {
  low: "low",
  normal: "normal",
  high: "high",
  "max-tokens": "max"
};
function shortName(raw) {
  const stripped = raw.replace(/^Claude\s+/i, "");
  if (stripped !== raw) return stripped;
  const withoutPrefix = raw.replace(/^claude-/i, "");
  const match = withoutPrefix.match(/^([a-z]+(?:-[a-z]+)*)-(\d+)-(\d+)(?:-\d+)*$/i);
  if (match) {
    const name = match[1].replace(/-/g, " ");
    return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${match[2]}.${match[3]}`;
  }
  return withoutPrefix;
}
var ModelWidget = {
  id: "model",
  labelKey: "widget.model",
  render(ctx, _cfg) {
    const rawName = ctx.stdin.model?.display_name ?? ctx.stdin.model?.id ?? ctx.usage?.lastModel ?? null;
    if (!rawName) return "?";
    const name = shortName(rawName);
    const effort = ctx.effortLevel;
    if (effort && effort !== "normal") {
      const label = EFFORT_LABELS[effort] ?? effort;
      return `${name} [${label}]`;
    }
    return name;
  }
};

// src/utils/bar.ts
var BAR_WIDTH = 10;
var DIM_FACTOR = 0.35;
function dimColor(hex) {
  const r = Math.round(parseInt(hex.slice(1, 3), 16) * DIM_FACTOR).toString(16).padStart(2, "0");
  const g = Math.round(parseInt(hex.slice(3, 5), 16) * DIM_FACTOR).toString(16).padStart(2, "0");
  const b = Math.round(parseInt(hex.slice(5, 7), 16) * DIM_FACTOR).toString(16).padStart(2, "0");
  return `#${r}${g}${b}`;
}
function buildBar(pct, color, width = BAR_WIDTH) {
  const clamped = Math.max(0, Math.min(100, pct));
  const filled = Math.round(clamped / 100 * width);
  const filledStr = source_default.hex(color)("\u25A0".repeat(filled));
  const emptyStr = source_default.hex(dimColor(color))("\u25A0".repeat(width - filled));
  return filledStr + emptyStr;
}
function fmtPct(pct) {
  return `${String(pct).padStart(3)}%`;
}

// src/utils/tokens.ts
function formatTokens(n) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${Math.round(n / 1e3)}K`;
  return String(n);
}

// src/widgets/Context.ts
var ContextWidget = {
  id: "context",
  labelKey: "widget.context",
  render(ctx, _cfg) {
    const cw = ctx.stdin.context_window;
    if (!cw?.context_window_size)
      return `Ctx ${buildBar(0, "#22d3ee")} ${fmtPct(0)} ${"(-/-)".padEnd(11)}`;
    const usage = cw.current_usage;
    const used = (usage?.input_tokens ?? 0) + (usage?.output_tokens ?? 0) + (usage?.cache_creation_input_tokens ?? 0) + (usage?.cache_read_input_tokens ?? 0);
    const max = cw.context_window_size;
    const pct = Math.round(cw.used_percentage ?? Math.min(100, used / max * 100));
    const tokenExpr = `(${formatTokens(used)}/${formatTokens(max)})`.padEnd(11);
    return `Ctx ${buildBar(pct, "#22d3ee")} ${fmtPct(pct)} ${tokenExpr}`;
  }
};

// src/widgets/types.ts
function staticLabel(id, labelKey, text) {
  return { id, labelKey, render: () => text };
}

// src/widgets/DailyUsage.ts
var DailyUsageWidget = staticLabel("dailyUsage", "widget.dailyUsage", "Daily  ");

// src/utils/duration.ts
function formatRemainingHM(ms) {
  const totalMins = Math.max(0, Math.ceil(ms / 6e4));
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  if (h >= 24) {
    const d = Math.floor(h / 24);
    const rh = h % 24;
    return `${d}d ${rh}h`;
  }
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
function formatAbsDatetime(unixSecs) {
  const d = new Date(unixSecs * 1e3);
  const M = String(d.getMonth() + 1).padStart(2, "0");
  const D = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${M}/${D} ${h}:${m}`;
}
function formatRemainingClock(ms) {
  const totalSecs = Math.max(0, Math.floor(ms / 1e3));
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor(totalSecs % 3600 / 60);
  if (h > 24) {
    const d = Math.floor(h / 24);
    const rh = h % 24;
    return `${d}d ${rh}h`;
  }
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// src/data/reset.ts
function getDailyReset(now = /* @__PURE__ */ new Date()) {
  const midnight = new Date(now);
  midnight.setDate(midnight.getDate() + 1);
  midnight.setHours(0, 0, 0, 0);
  const remainingMs = midnight.getTime() - now.getTime();
  return { remainingMs, label: formatRemainingClock(remainingMs) };
}
function getWeeklyReset(anchorDay, now = /* @__PURE__ */ new Date()) {
  let targetMs;
  if (anchorDay !== null) {
    const current = now.getDay();
    const daysUntil = (anchorDay - current + 7) % 7 || 7;
    const target = new Date(now);
    target.setDate(target.getDate() + daysUntil);
    target.setHours(0, 0, 0, 0);
    targetMs = target.getTime();
  } else {
    targetMs = now.getTime() + 7 * 24 * 60 * 60 * 1e3;
  }
  const remainingMs = targetMs - now.getTime();
  return { remainingMs, label: formatRemainingClock(remainingMs) };
}

// src/widgets/resetTimerFactory.ts
function createResetTimerWidget(params) {
  const { id, labelKey, prefix, getTimer } = params;
  return {
    id,
    labelKey,
    render(ctx, _cfg) {
      const timer = getTimer(ctx);
      return `${prefix} ${timer.label}`;
    }
  };
}

// src/widgets/DailyResetTimer.ts
var DailyResetTimerWidget = createResetTimerWidget({
  id: "dailyReset",
  labelKey: "widget.dailyReset",
  prefix: "\u21BA",
  getTimer: (ctx) => getDailyReset(ctx.now)
});

// src/widgets/WeeklyUsage.ts
var WeeklyUsageWidget = staticLabel("weeklyUsage", "widget.weeklyUsage", "Weekly ");

// src/widgets/WeeklyResetTimer.ts
var WeeklyResetTimerWidget = createResetTimerWidget({
  id: "weeklyReset",
  labelKey: "widget.weeklyReset",
  prefix: "\u21BA",
  getTimer: (ctx) => getWeeklyReset(ctx.weeklyAnchorDay, ctx.now)
});

// src/widgets/SonnetWeeklyUsage.ts
var SonnetWeeklyUsageWidget = {
  id: "sonnetWeeklyUsage",
  labelKey: "widget.sonnetWeeklyUsage",
  render(ctx, _cfg) {
    if (!ctx.usage) return null;
    return `S:${formatTokens(ctx.usage.sonnetWeeklyTokens)}`;
  }
};

// src/widgets/SonnetWeeklyResetTimer.ts
var SonnetWeeklyResetTimerWidget = createResetTimerWidget({
  id: "sonnetWeeklyReset",
  labelKey: "widget.sonnetWeeklyReset",
  prefix: "S\u21BA",
  getTimer: (ctx) => getWeeklyReset(ctx.weeklyAnchorDay, ctx.now)
});

// src/widgets/GptUsage.ts
var GptUsageWidget = {
  id: "gptUsage",
  labelKey: "widget.gptUsage",
  render(ctx, _cfg) {
    if (!ctx.codex?.available) return null;
    return `GPT:${ctx.codex.dailyRequests}req`;
  }
};

// src/widgets/rateLimitRenderer.ts
function renderRateLimitSlot(params) {
  const {
    prefix,
    color,
    usedPercent,
    resetsAtMs,
    now,
    timeFormat = "remaining",
    prefixWidth,
    timeExprWidth
  } = params;
  const paddedPrefix = prefixWidth != null ? prefix.padEnd(prefixWidth) : prefix;
  if (usedPercent == null || resetsAtMs == null) {
    return `${paddedPrefix} ${buildBar(0, color)}  ?%`;
  }
  const remainingMs = resetsAtMs - now;
  const pct = remainingMs <= 0 ? 0 : Math.round(usedPercent);
  let timeStr;
  if (remainingMs <= 0) {
    timeStr = "reset";
  } else if (timeFormat === "abs") {
    timeStr = formatAbsDatetime(resetsAtMs / 1e3);
  } else {
    timeStr = formatRemainingHM(remainingMs);
  }
  const timeExpr = timeExprWidth != null ? `(${timeStr})`.padEnd(timeExprWidth) : `(${timeStr})`;
  return `${paddedPrefix} ${buildBar(pct, color)} ${fmtPct(pct)} ${timeExpr}`;
}
function createRateLimitWidget(params) {
  const { id, labelKey, prefix, color, getSlot, timeFormat, prefixWidth, timeExprWidth } = params;
  return {
    id,
    labelKey,
    render(ctx, _cfg) {
      const slot = getSlot(ctx);
      return renderRateLimitSlot({
        prefix,
        color,
        usedPercent: slot?.usedPercent ?? null,
        resetsAtMs: slot?.resetsAt != null ? slot.resetsAt * 1e3 : null,
        now: ctx.now.getTime(),
        timeFormat,
        prefixWidth,
        timeExprWidth
      });
    }
  };
}

// src/widgets/RateLimit.ts
var SessionRateLimitWidget = createRateLimitWidget({
  id: "sessionRateLimit",
  labelKey: "widget.sessionRateLimit",
  prefix: "Session",
  color: "#ffd93d",
  getSlot: (ctx) => {
    const s = ctx.stdin.rate_limits?.five_hour;
    if (!s || s.resets_at == null) return null;
    return { usedPercent: s.used_percentage ?? 0, resetsAt: s.resets_at };
  }
});
var WeeklyRateLimitWidget = createRateLimitWidget({
  id: "weeklyRateLimit",
  labelKey: "widget.weeklyRateLimit",
  prefix: "7d",
  color: "#6bcb77",
  getSlot: (ctx) => {
    const s = ctx.stdin.rate_limits?.seven_day;
    if (!s || s.resets_at == null) return null;
    return { usedPercent: s.used_percentage ?? 0, resetsAt: s.resets_at };
  }
});

// src/widgets/CodexRateLimit.ts
var PREFIX_WIDTH = 3;
var TIME_EXPR_WIDTH = 11;
var CodexWeeklyRateLimitWidget = createRateLimitWidget({
  id: "codexWeeklyRateLimit",
  labelKey: "widget.codexWeeklyRateLimit",
  prefix: "7d",
  color: "#48dbfb",
  getSlot: (ctx) => ctx.codex?.rateLimits?.secondary ?? null,
  timeFormat: "remaining",
  prefixWidth: PREFIX_WIDTH,
  timeExprWidth: TIME_EXPR_WIDTH
});

// src/widgets/Spacer.ts
var SpacerWidget = {
  id: "spacer",
  labelKey: "widget.spacer",
  render(_ctx, _cfg) {
    return " ";
  }
};

// src/widgets/CodexModel.ts
var CodexModelWidget = {
  id: "codexModel",
  labelKey: "widget.codexModel",
  render(_ctx, _cfg) {
    return "Codex  ";
  }
};

// src/widgets/SessionCost.ts
function formatCost(usd) {
  if (usd >= 1) return `$${usd.toFixed(2)}`;
  if (usd >= 0.01) return `$${usd.toFixed(3)}`;
  return `$${usd.toFixed(4)}`;
}
var SessionCostWidget = {
  id: "sessionCost",
  labelKey: "widget.sessionCost",
  render(ctx, _cfg) {
    const cost = ctx.stdin.cost?.total_cost_usd;
    if (cost == null) return "$-";
    return formatCost(cost);
  }
};

// src/widgets/CacheHit.ts
var CacheHitWidget = {
  id: "cacheHit",
  labelKey: "widget.cacheHit",
  render(ctx, _cfg) {
    const usage = ctx.stdin.context_window?.current_usage;
    if (!usage) return null;
    const cached = usage.cache_read_input_tokens ?? 0;
    const input = usage.input_tokens ?? 0;
    const denom = input + cached;
    if (denom === 0) return null;
    const pct = Math.round(cached / denom * 100);
    return `\u26A1${pct}%`;
  }
};

// src/widgets/CacheTtl.ts
var CacheTtlWidget = {
  id: "cacheTtl",
  labelKey: "widget.cacheTtl",
  render(ctx, _cfg) {
    if (ctx.cacheTtlCreatedAt == null) return null;
    const remaining = ctx.cacheTtlCreatedAt + ctx.cacheTtlMs - ctx.now.getTime();
    if (remaining <= 0) return null;
    return `\u23F1 ${formatRemainingHM(remaining)}`;
  }
};

// src/widgets/GitInfo.ts
import { execFileSync } from "child_process";
import { basename } from "path";
function gitCommand(args, cwd) {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
  } catch {
    return null;
  }
}
var branchCache = /* @__PURE__ */ new Map();
function getCachedBranch(cwd) {
  const now = Date.now();
  const cached = branchCache.get(cwd);
  if (cached && now < cached.expiresAt) return cached.value;
  const value = gitCommand(["rev-parse", "--abbrev-ref", "HEAD"], cwd);
  branchCache.set(cwd, { value, expiresAt: now + 5e3 });
  return value;
}
var GitBranchWidget = {
  id: "gitBranch",
  labelKey: "widget.gitBranch",
  render(ctx, _cfg) {
    const cwd = ctx.stdin.cwd ?? process.cwd();
    return getCachedBranch(cwd);
  }
};
var GitRepoWidget = {
  id: "gitRepo",
  labelKey: "widget.gitRepo",
  render(ctx, _cfg) {
    const cwd = ctx.stdin.cwd ?? process.cwd();
    const topLevel = gitCommand(["rev-parse", "--show-toplevel"], cwd);
    if (!topLevel) return null;
    const repo = basename(topLevel);
    const branch = getCachedBranch(cwd);
    return branch ? `\u{1F4C1} ${repo}(${branch})` : `\u{1F4C1} ${repo}`;
  }
};

// src/widgets/index.ts
var ALL_WIDGETS = [
  ModelWidget,
  ContextWidget,
  SessionRateLimitWidget,
  WeeklyRateLimitWidget,
  DailyUsageWidget,
  DailyResetTimerWidget,
  WeeklyUsageWidget,
  WeeklyResetTimerWidget,
  SonnetWeeklyUsageWidget,
  SonnetWeeklyResetTimerWidget,
  GptUsageWidget,
  CodexWeeklyRateLimitWidget,
  SpacerWidget,
  CodexModelWidget,
  SessionCostWidget,
  CacheHitWidget,
  CacheTtlWidget,
  GitBranchWidget,
  GitRepoWidget
];
var registry = new Map(ALL_WIDGETS.map((w) => [w.id, w]));
function getWidget(id) {
  return registry.get(id);
}

export {
  source_default,
  themes,
  THEME_NAMES,
  getTheme,
  ALL_WIDGETS,
  getWidget
};
//# sourceMappingURL=chunk-KA63TBK7.js.map