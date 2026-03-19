import type React from "react";
import type { EntityType } from "./types";
import { getTypeColor } from "./utils/entity";

const SURFACE_0 = "#0a101b";
const SURFACE_1 = "#0f1726";
const SURFACE_2 = "#131d2e";
const SURFACE_3 = "#182235";
const BORDER_SOFT = "rgba(148, 163, 184, 0.14)";
const TEXT_PRIMARY = "#f3f7ff";
const TEXT_SECONDARY = "#c7d2e3";

const SHADOW_SOFT = "0 10px 30px rgba(2, 6, 23, 0.22)";
const SHADOW_MEDIUM = "0 18px 42px rgba(2, 6, 23, 0.28)";
const SHADOW_ACTIVE =
  "0 0 0 1px rgba(96,165,250,0.16), 0 18px 34px rgba(37,99,235,0.16)";

export const pageStyle: React.CSSProperties = {
  fontFamily:
    '"Inter", "Manrope", "Source Sans 3", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  background:
    "radial-gradient(circle at top, rgba(59,130,246,0.08), transparent 22%), linear-gradient(180deg, #09101b 0%, #0b1220 100%)",
  color: TEXT_PRIMARY,
  minHeight: "100vh",
  padding: "20px",
  boxSizing: "border-box",
  letterSpacing: "-0.01em",
};

export const pageContainerStyle: React.CSSProperties = {
  maxWidth: "1500px",
  margin: "0 auto",
};

export const panelStyle: React.CSSProperties = {
  background: `linear-gradient(180deg, ${SURFACE_2} 0%, ${SURFACE_1} 100%)`,
  border: `1px solid ${BORDER_SOFT}`,
  borderRadius: "20px",
  padding: "16px",
  boxShadow: SHADOW_MEDIUM,
  backdropFilter: "blur(12px)",
};

export const cardStyle: React.CSSProperties = {
  background: `linear-gradient(180deg, ${SURFACE_1} 0%, ${SURFACE_0} 100%)`,
  border: `1px solid ${BORDER_SOFT}`,
  borderRadius: "16px",
  padding: "12px",
  boxShadow: SHADOW_SOFT,
};

export const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 13px",
  borderRadius: "12px",
  border: `1px solid ${BORDER_SOFT}`,
  background: `linear-gradient(180deg, ${SURFACE_1} 0%, #0c1422 100%)`,
  color: TEXT_PRIMARY,
  boxSizing: "border-box",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
  outline: "none",
  fontFamily:
    '"Inter", "Manrope", "Source Sans 3", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  fontSize: "14px",
};

export const inputDarkStyle: React.CSSProperties = {
  ...inputStyle,
  background: `linear-gradient(180deg, #0c1422 0%, #09111d 100%)`,
};

export const selectStyle: React.CSSProperties = {
  ...inputStyle,
};

export const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: "vertical",
  minHeight: "96px",
  lineHeight: 1.5,
};

export const primaryButtonStyle: React.CSSProperties = {
  background: "linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)",
  color: "white",
  border: "1px solid rgba(96,165,250,0.26)",
  borderRadius: "12px",
  padding: "10px 14px",
  cursor: "pointer",
  fontWeight: 700,
  boxShadow: "0 10px 24px rgba(37,99,235,0.22)",
};

export const primaryButtonLargeStyle: React.CSSProperties = {
  background: "linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)",
  color: "white",
  border: "1px solid rgba(96,165,250,0.26)",
  borderRadius: "14px",
  padding: "12px 18px",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: 700,
  boxShadow: "0 12px 26px rgba(37,99,235,0.22)",
};

export const dangerButtonStyle: React.CSSProperties = {
  background: "linear-gradient(180deg, #991b1b 0%, #7f1d1d 100%)",
  color: "white",
  border: "1px solid rgba(248,113,113,0.18)",
  borderRadius: "10px",
  padding: "8px 10px",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: 700,
  boxShadow: "0 10px 20px rgba(127,29,29,0.18)",
};

export const dangerButtonLargeStyle: React.CSSProperties = {
  background: "linear-gradient(180deg, #991b1b 0%, #7f1d1d 100%)",
  color: "white",
  border: "1px solid rgba(248,113,113,0.18)",
  borderRadius: "14px",
  padding: "12px 18px",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: 700,
  boxShadow: "0 12px 24px rgba(127,29,29,0.18)",
};

export const successButtonLargeStyle: React.CSSProperties = {
  background: "linear-gradient(180deg, #0f766e 0%, #065f46 100%)",
  color: "white",
  border: "1px solid rgba(45,212,191,0.18)",
  borderRadius: "14px",
  padding: "12px 18px",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: 700,
  boxShadow: "0 12px 24px rgba(6,95,70,0.18)",
};

export const purpleButtonLargeStyle: React.CSSProperties = {
  background: "linear-gradient(180deg, #8b5cf6 0%, #7c3aed 100%)",
  color: "white",
  border: "1px solid rgba(196,181,253,0.18)",
  borderRadius: "14px",
  padding: "12px 18px",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: 700,
  boxShadow: "0 12px 24px rgba(124,58,237,0.18)",
};

export const secondaryButtonLargeStyle: React.CSSProperties = {
  background: `linear-gradient(180deg, ${SURFACE_3} 0%, ${SURFACE_2} 100%)`,
  color: TEXT_PRIMARY,
  border: `1px solid ${BORDER_SOFT}`,
  borderRadius: "14px",
  padding: "12px 18px",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: 700,
  boxShadow: SHADOW_SOFT,
};

export const ghostButtonStyle: React.CSSProperties = {
  background: `linear-gradient(180deg, ${SURFACE_1} 0%, #0b1220 100%)`,
  color: TEXT_PRIMARY,
  border: `1px solid ${BORDER_SOFT}`,
  borderRadius: "12px",
  padding: "10px 14px",
  cursor: "pointer",
  fontWeight: 700,
  boxShadow: "0 8px 20px rgba(2,6,23,0.14)",
};

export function modeButtonStyle(isActive: boolean): React.CSSProperties {
  return {
    background: isActive
      ? "linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)"
      : `linear-gradient(180deg, ${SURFACE_1} 0%, #0c1422 100%)`,
    color: "white",
    border: isActive
      ? "1px solid rgba(96,165,250,0.28)"
      : `1px solid ${BORDER_SOFT}`,
    borderRadius: "12px",
    padding: "8px 12px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "13px",
    boxShadow: isActive
      ? "0 10px 22px rgba(37,99,235,0.18)"
      : "0 6px 18px rgba(2,6,23,0.12)",
  };
}

export function typeToggleStyle(
  isActive: boolean,
  type: EntityType
): React.CSSProperties {
  const color = getTypeColor(type);

  return {
    background: isActive
      ? `linear-gradient(180deg, ${color} 0%, ${color}dd 100%)`
      : `linear-gradient(180deg, ${SURFACE_1} 0%, #0c1422 100%)`,
    color: "white",
    border: isActive
      ? `1px solid ${color}55`
      : `1px solid ${BORDER_SOFT}`,
    borderRadius: "999px",
    padding: "7px 12px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "12px",
    boxShadow: isActive
      ? `0 10px 20px ${color}22`
      : "0 6px 16px rgba(2,6,23,0.12)",
  };
}

export function archiveItemStyle(isSelected: boolean): React.CSSProperties {
  return {
    textAlign: "left",
    padding: 12,
    borderRadius: 12,
    border: isSelected
      ? "1px solid rgba(96,165,250,0.34)"
      : `1px solid ${BORDER_SOFT}`,
    background: isSelected
      ? "linear-gradient(180deg, rgba(30,41,59,0.96) 0%, rgba(15,23,42,0.96) 100%)"
      : `linear-gradient(180deg, ${SURFACE_1} 0%, #0b1220 100%)`,
    color: "white",
    cursor: "pointer",
    boxShadow: isSelected ? SHADOW_ACTIVE : SHADOW_SOFT,
    transition:
      "border-color 160ms ease, box-shadow 160ms ease, background 160ms ease, transform 160ms ease",
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
    background: "linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)",
    color: "#ffffff",
    letterSpacing: "0.02em",
    boxShadow: "0 8px 18px rgba(37,99,235,0.22)",
  };
}

export function quickCreateButtonStyle(): React.CSSProperties {
  return {
    padding: "9px 10px",
    borderRadius: 10,
    border: `1px solid ${BORDER_SOFT}`,
    background: `linear-gradient(180deg, ${SURFACE_1} 0%, #0b1220 100%)`,
    color: "white",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 12,
    boxShadow: SHADOW_SOFT,
  };
}

export function timelineItemStyle(isSelected: boolean): React.CSSProperties {
  return {
    textAlign: "left",
    width: "100%",
    background: isSelected
      ? "linear-gradient(180deg, rgba(30,41,59,0.96) 0%, rgba(15,23,42,0.96) 100%)"
      : `linear-gradient(180deg, ${SURFACE_1} 0%, #0b1220 100%)`,
    color: TEXT_PRIMARY,
    border: isSelected
      ? "1px solid rgba(96,165,250,0.34)"
      : `1px solid ${BORDER_SOFT}`,
    borderRadius: "16px",
    padding: "14px",
    cursor: "pointer",
    boxShadow: isSelected ? SHADOW_ACTIVE : SHADOW_SOFT,
  };
}

export function tagChipStyle(): React.CSSProperties {
  return {
    fontSize: "11px",
    padding: "3px 7px",
    borderRadius: 999,
    background: `linear-gradient(180deg, ${SURFACE_3} 0%, ${SURFACE_2} 100%)`,
    border: `1px solid ${BORDER_SOFT}`,
    color: TEXT_SECONDARY,
    boxShadow: "0 4px 10px rgba(2,6,23,0.12)",
  };
}

export function removableTagStyle(): React.CSSProperties {
  return {
    background: `linear-gradient(180deg, ${SURFACE_3} 0%, ${SURFACE_2} 100%)`,
    color: TEXT_PRIMARY,
    border: `1px solid ${BORDER_SOFT}`,
    borderRadius: "999px",
    padding: "6px 10px",
    cursor: "pointer",
    boxShadow: "0 6px 14px rgba(2,6,23,0.14)",
    fontWeight: 700,
  };
}

export function timelineBadgeStyle(color: string): React.CSSProperties {
  return {
    fontSize: "11px",
    fontWeight: 800,
    padding: "4px 8px",
    borderRadius: "999px",
    backgroundColor: color,
    color: "white",
    boxShadow: "0 8px 18px rgba(2,6,23,0.18)",
  };
}

export function metaPillStyle(): React.CSSProperties {
  return {
    fontSize: "12px",
    padding: "4px 8px",
    borderRadius: "999px",
    background: `linear-gradient(180deg, ${SURFACE_1} 0%, #0b1220 100%)`,
    border: `1px solid ${BORDER_SOFT}`,
    color: TEXT_SECONDARY,
    boxShadow: "0 6px 12px rgba(2,6,23,0.12)",
  };
}