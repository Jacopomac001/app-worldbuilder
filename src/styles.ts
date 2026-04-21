import type React from "react";
import type { EntityType } from "./types";
import { getTypeColor } from "./utils/entity";

const DISPLAY_FONT =
  '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif';
const UI_FONT =
  '"Source Sans 3", "Inter", "Segoe UI", "Trebuchet MS", system-ui, sans-serif';

const CANVAS_DEEP = "#05070d";
const CANVAS_MID = "#0a0f18";
const CANVAS_GLOW = "#111826";

const SURFACE_0 = "rgba(255, 255, 255, 0.035)";
const SURFACE_1 = "rgba(255, 255, 255, 0.045)";
const SURFACE_2 = "rgba(255, 255, 255, 0.06)";
const SURFACE_3 = "rgba(255, 255, 255, 0.085)";

const INK_STRONG = "#f4f7ff";
const INK = "#d9dfeb";
const INK_MUTED = "#9aa5bb";
const INK_SOFT = "#768197";

const LINE_SOFT = "rgba(255, 255, 255, 0.08)";
const LINE_MID = "rgba(255, 255, 255, 0.12)";
const LINE_ACTIVE = "rgba(146, 182, 255, 0.26)";

const GOLD = "#d2b179";
const GOLD_SOFT = "#9d8053";
const BLUE = "#8eaefc";
const BLUE_STRONG = "#6f93f2";
const EMERALD = "#54c6ad";
const WINE = "#cf7383";

const SHADOW_PANEL =
  "0 14px 50px rgba(0,0,0,0.42), 0 0 30px rgba(100,150,255,0.08)";
const SHADOW_CARD =
  "0 10px 34px rgba(0,0,0,0.34), 0 0 24px rgba(100,150,255,0.05)";
const SHADOW_BUTTON =
  "0 8px 24px rgba(0,0,0,0.24), 0 0 20px rgba(100,150,255,0.06)";
const SHADOW_ACTIVE =
  "0 0 0 1px rgba(146,182,255,0.18), 0 18px 52px rgba(0,0,0,0.42), 0 0 34px rgba(100,150,255,0.12)";

const INTERACTIVE_TRANSITION =
  "border-color 180ms ease, box-shadow 180ms ease, background 180ms ease, transform 180ms ease, color 180ms ease, opacity 180ms ease";

function cinematicButtonBase(): React.CSSProperties {
  return {
    cursor: "pointer",
    fontFamily: UI_FONT,
    fontWeight: 700,
    letterSpacing: "0.01em",
    transition: INTERACTIVE_TRANSITION,
  };
}

export const cinematicTokens = {
  color: {
    canvasDeep: CANVAS_DEEP,
    canvasMid: CANVAS_MID,
    canvasGlow: CANVAS_GLOW,
    surface0: SURFACE_0,
    surface1: SURFACE_1,
    surface2: SURFACE_2,
    surface3: SURFACE_3,
    inkStrong: INK_STRONG,
    ink: INK,
    inkMuted: INK_MUTED,
    inkSoft: INK_SOFT,
    lineSoft: LINE_SOFT,
    lineMid: LINE_MID,
    lineActive: LINE_ACTIVE,
    gold: GOLD,
    goldSoft: GOLD_SOFT,
    blue: BLUE,
    blueStrong: BLUE_STRONG,
    emerald: EMERALD,
    wine: WINE,
  },
  radius: {
    sm: 12,
    md: 18,
    lg: 26,
    xl: 36,
    pill: 999,
  },
  space: {
    xs: 6,
    sm: 10,
    md: 14,
    lg: 20,
    xl: 28,
    xxl: 40,
  },
  shadow: {
    panel: SHADOW_PANEL,
    card: SHADOW_CARD,
    button: SHADOW_BUTTON,
    active: SHADOW_ACTIVE,
  },
  motion: {
    interactive: INTERACTIVE_TRANSITION,
    lift: "translateY(-2px)",
  },
};

export const pageStyle: React.CSSProperties = {
  fontFamily: UI_FONT,
  background:
    "radial-gradient(circle at 20% 30%, rgba(80,120,255,0.16), transparent 0, transparent 28%), radial-gradient(circle at 80% 70%, rgba(255,140,80,0.1), transparent 0, transparent 24%), radial-gradient(circle at 55% 0%, rgba(120,255,220,0.07), transparent 0, transparent 22%), linear-gradient(180deg, #05070d 0%, #080b12 42%, #0a0f18 100%)",
  color: INK_STRONG,
  minHeight: "100vh",
  padding: "24px",
  boxSizing: "border-box",
  letterSpacing: "-0.01em",
};

export const pageContainerStyle: React.CSSProperties = {
  maxWidth: "1560px",
  margin: "0 auto",
};

export const panelStyle: React.CSSProperties = {
  background: SURFACE_1,
  border: `1px solid ${LINE_SOFT}`,
  borderRadius: "28px",
  padding: "20px",
  boxShadow: SHADOW_PANEL,
  backdropFilter: "blur(24px)",
  WebkitBackdropFilter: "blur(24px)",
  transition: INTERACTIVE_TRANSITION,
};

export const cardStyle: React.CSSProperties = {
  background: SURFACE_0,
  border: `1px solid ${LINE_SOFT}`,
  borderRadius: "22px",
  padding: "16px",
  boxShadow: SHADOW_CARD,
  backdropFilter: "blur(22px)",
  WebkitBackdropFilter: "blur(22px)",
  transition: INTERACTIVE_TRANSITION,
};

export const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "13px 14px",
  borderRadius: "16px",
  border: `1px solid ${LINE_SOFT}`,
  background: "rgba(255,255,255,0.05)",
  color: INK_STRONG,
  boxSizing: "border-box",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
  outline: "none",
  fontFamily: UI_FONT,
  fontSize: "14px",
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",
  transition: INTERACTIVE_TRANSITION,
};

export const inputDarkStyle: React.CSSProperties = {
  ...inputStyle,
  background: "rgba(255,255,255,0.04)",
};

export const selectStyle: React.CSSProperties = {
  ...inputStyle,
};

export const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: "vertical",
  minHeight: "116px",
  lineHeight: 1.65,
};

export const primaryButtonStyle: React.CSSProperties = {
  ...cinematicButtonBase(),
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)",
  color: INK_STRONG,
  border: "1px solid rgba(146,182,255,0.2)",
  borderRadius: "16px",
  padding: "10px 14px",
  boxShadow: "0 10px 28px rgba(0,0,0,0.28), 0 0 24px rgba(100,150,255,0.12)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
};

export const primaryButtonLargeStyle: React.CSSProperties = {
  ...primaryButtonStyle,
  borderRadius: "18px",
  padding: "12px 18px",
  fontSize: "14px",
};

export const dangerButtonStyle: React.CSSProperties = {
  ...cinematicButtonBase(),
  background:
    "linear-gradient(180deg, rgba(207,115,131,0.14) 0%, rgba(255,255,255,0.04) 100%)",
  color: "#fff2f4",
  border: "1px solid rgba(255, 163, 178, 0.18)",
  borderRadius: "14px",
  padding: "8px 10px",
  fontSize: "12px",
  boxShadow: "0 8px 20px rgba(0,0,0,0.24), 0 0 18px rgba(207,115,131,0.1)",
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",
};

export const dangerButtonLargeStyle: React.CSSProperties = {
  ...dangerButtonStyle,
  borderRadius: "18px",
  padding: "12px 18px",
  fontSize: "14px",
};

export const successButtonLargeStyle: React.CSSProperties = {
  ...cinematicButtonBase(),
  background:
    "linear-gradient(180deg, rgba(84,198,173,0.14) 0%, rgba(255,255,255,0.04) 100%)",
  color: "#effffc",
  border: "1px solid rgba(84,198,173,0.18)",
  borderRadius: "18px",
  padding: "12px 18px",
  fontSize: "14px",
  boxShadow: "0 8px 22px rgba(0,0,0,0.24), 0 0 18px rgba(84,198,173,0.1)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
};

export const purpleButtonLargeStyle: React.CSSProperties = {
  ...cinematicButtonBase(),
  background:
    "linear-gradient(180deg, rgba(155,132,255,0.14) 0%, rgba(255,255,255,0.04) 100%)",
  color: "#f5f2ff",
  border: "1px solid rgba(190,176,255,0.18)",
  borderRadius: "18px",
  padding: "12px 18px",
  fontSize: "14px",
  boxShadow: "0 8px 22px rgba(0,0,0,0.24), 0 0 18px rgba(155,132,255,0.1)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
};

export const secondaryButtonLargeStyle: React.CSSProperties = {
  ...cinematicButtonBase(),
  background: "rgba(255,255,255,0.04)",
  color: INK_STRONG,
  border: `1px solid ${LINE_SOFT}`,
  borderRadius: "18px",
  padding: "12px 18px",
  fontSize: "14px",
  boxShadow: SHADOW_BUTTON,
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",
};

export const ghostButtonStyle: React.CSSProperties = {
  ...cinematicButtonBase(),
  background: "rgba(255,255,255,0.03)",
  color: INK,
  border: `1px solid ${LINE_SOFT}`,
  borderRadius: "16px",
  padding: "10px 14px",
  boxShadow: "0 8px 18px rgba(0,0,0,0.18)",
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",
};

export function modeButtonStyle(isActive: boolean): React.CSSProperties {
  return {
    ...cinematicButtonBase(),
    background: isActive
      ? "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)"
      : "rgba(255,255,255,0.03)",
    color: isActive ? INK_STRONG : INK,
    border: isActive ? "1px solid rgba(146,182,255,0.2)" : `1px solid ${LINE_SOFT}`,
    borderRadius: "16px",
    padding: "9px 12px",
    fontSize: "13px",
    boxShadow: isActive
      ? "0 10px 26px rgba(0,0,0,0.28), 0 0 24px rgba(100,150,255,0.1)"
      : "0 8px 18px rgba(0,0,0,0.16)",
    backdropFilter: "blur(18px)",
    WebkitBackdropFilter: "blur(18px)",
  };
}

export function typeToggleStyle(
  isActive: boolean,
  type: EntityType
): React.CSSProperties {
  const color = getTypeColor(type);

  return {
    ...cinematicButtonBase(),
    background: isActive ? `${color}26` : "rgba(255,255,255,0.03)",
    color: isActive ? INK_STRONG : INK,
    border: isActive ? `1px solid ${color}55` : `1px solid ${LINE_SOFT}`,
    borderRadius: "999px",
    padding: "7px 12px",
    fontSize: "12px",
    boxShadow: isActive
      ? `0 10px 20px rgba(0,0,0,0.2), 0 0 20px ${color}20`
      : "0 6px 14px rgba(0,0,0,0.12)",
    backdropFilter: "blur(18px)",
    WebkitBackdropFilter: "blur(18px)",
  };
}

export function archiveItemStyle(isSelected: boolean): React.CSSProperties {
  return {
    textAlign: "left",
    padding: "14px 14px 14px 12px",
    borderRadius: 18,
    border: isSelected ? `1px solid ${LINE_ACTIVE}` : "1px solid transparent",
    background: isSelected ? "rgba(255,255,255,0.06)" : "transparent",
    color: INK_STRONG,
    cursor: "pointer",
    boxShadow: isSelected ? "0 12px 28px rgba(0,0,0,0.16), 0 0 20px rgba(100,150,255,0.08)" : "none",
    backdropFilter: "blur(18px)",
    WebkitBackdropFilter: "blur(18px)",
    transition: INTERACTIVE_TRANSITION,
  };
}

export function selectedBadgeStyle(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "11px",
    fontWeight: 800,
    padding: "4px 8px",
    borderRadius: "999px",
    background: "rgba(255,255,255,0.12)",
    color: INK_STRONG,
    letterSpacing: "0.03em",
    border: `1px solid ${LINE_SOFT}`,
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
  };
}

export function quickCreateButtonStyle(): React.CSSProperties {
  return {
    ...cinematicButtonBase(),
    padding: "10px 11px",
    borderRadius: 16,
    border: `1px solid ${LINE_SOFT}`,
    background: "rgba(255,255,255,0.03)",
    color: INK,
    fontSize: 12,
    boxShadow: "0 8px 16px rgba(0,0,0,0.12)",
    backdropFilter: "blur(18px)",
    WebkitBackdropFilter: "blur(18px)",
  };
}

export function timelineItemStyle(isSelected: boolean): React.CSSProperties {
  return {
    textAlign: "left",
    width: "100%",
    background: isSelected ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)",
    color: INK_STRONG,
    border: isSelected ? `1px solid ${LINE_ACTIVE}` : `1px solid ${LINE_SOFT}`,
    borderRadius: "22px",
    padding: "14px",
    cursor: "pointer",
    boxShadow: isSelected ? SHADOW_ACTIVE : "0 8px 18px rgba(0,0,0,0.14)",
    backdropFilter: "blur(18px)",
    WebkitBackdropFilter: "blur(18px)",
  };
}

export function tagChipStyle(): React.CSSProperties {
  return {
    fontSize: "11px",
    padding: "4px 8px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.05)",
    border: `1px solid ${LINE_SOFT}`,
    color: INK_MUTED,
    backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)",
  };
}

export function removableTagStyle(): React.CSSProperties {
  return {
    ...cinematicButtonBase(),
    background: "rgba(255,255,255,0.05)",
    color: INK_STRONG,
    border: `1px solid ${LINE_SOFT}`,
    borderRadius: "999px",
    padding: "6px 10px",
    boxShadow: "0 6px 14px rgba(0,0,0,0.14)",
    fontWeight: 700,
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
  };
}

export function timelineBadgeStyle(color: string): React.CSSProperties {
  return {
    fontSize: "11px",
    fontWeight: 800,
    padding: "4px 8px",
    borderRadius: "999px",
    backgroundColor: color,
    color: "#fffdf8",
    boxShadow: "0 8px 18px rgba(0,0,0,0.16)",
  };
}

export function metaPillStyle(): React.CSSProperties {
  return {
    fontSize: "12px",
    padding: "4px 8px",
    borderRadius: "999px",
    background: "rgba(255,255,255,0.04)",
    border: `1px solid ${LINE_SOFT}`,
    color: INK_MUTED,
    backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)",
  };
}

export const cinematicTypography = {
  displayFont: DISPLAY_FONT,
  uiFont: UI_FONT,
  inkStrong: INK_STRONG,
  ink: INK,
  inkMuted: INK_MUTED,
  inkSoft: INK_SOFT,
  gold: GOLD,
  blue: BLUE,
  canvasDeep: CANVAS_DEEP,
  canvasMid: CANVAS_MID,
  surface0: SURFACE_0,
  surface1: SURFACE_1,
  surface2: SURFACE_2,
  surface3: SURFACE_3,
};

export const cinematicMotion = {
  transition: INTERACTIVE_TRANSITION,
  liftHoverTransform: "translateY(-2px)",
};
