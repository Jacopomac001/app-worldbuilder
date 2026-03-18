import type React from "react";
import type { EntityType } from "./types";
import { getTypeColor } from "./utils/entity";

export const pageStyle: React.CSSProperties = {
  fontFamily: "system-ui, sans-serif",
  backgroundColor: "#111827",
  color: "#f3f4f6",
  minHeight: "100vh",
  padding: "20px",
  boxSizing: "border-box",
};

export const pageContainerStyle: React.CSSProperties = {
  maxWidth: "1500px",
  margin: "0 auto",
};

export const panelStyle: React.CSSProperties = {
  backgroundColor: "#1f2937",
  borderRadius: "18px",
  padding: "16px",
};

export const cardStyle: React.CSSProperties = {
  backgroundColor: "#111827",
  border: "1px solid #374151",
  borderRadius: "14px",
  padding: "12px",
};

export const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "10px",
  border: "1px solid #374151",
  backgroundColor: "#111827",
  color: "#f3f4f6",
  boxSizing: "border-box",
};

export const inputDarkStyle: React.CSSProperties = {
  ...inputStyle,
  backgroundColor: "#0b1220",
};

export const selectStyle: React.CSSProperties = {
  ...inputStyle,
};

export const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: "vertical",
};

export const primaryButtonStyle: React.CSSProperties = {
  backgroundColor: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "10px",
  padding: "10px 14px",
  cursor: "pointer",
  fontWeight: 600,
};

export const primaryButtonLargeStyle: React.CSSProperties = {
  backgroundColor: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "12px",
  padding: "12px 18px",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: 600,
};

export const dangerButtonStyle: React.CSSProperties = {
  backgroundColor: "#7f1d1d",
  color: "white",
  border: "none",
  borderRadius: "8px",
  padding: "8px 10px",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: 600,
};

export const dangerButtonLargeStyle: React.CSSProperties = {
  backgroundColor: "#7f1d1d",
  color: "white",
  border: "none",
  borderRadius: "12px",
  padding: "12px 18px",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: 600,
};

export const successButtonLargeStyle: React.CSSProperties = {
  backgroundColor: "#065f46",
  color: "white",
  border: "none",
  borderRadius: "12px",
  padding: "12px 18px",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: 600,
};

export const purpleButtonLargeStyle: React.CSSProperties = {
  backgroundColor: "#7c3aed",
  color: "white",
  border: "none",
  borderRadius: "12px",
  padding: "12px 18px",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: 600,
};

export const secondaryButtonLargeStyle: React.CSSProperties = {
  backgroundColor: "#374151",
  color: "white",
  border: "none",
  borderRadius: "12px",
  padding: "12px 18px",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: 600,
};

export const ghostButtonStyle: React.CSSProperties = {
  backgroundColor: "#111827",
  color: "#f3f4f6",
  border: "1px solid #374151",
  borderRadius: "10px",
  padding: "10px 14px",
  cursor: "pointer",
  fontWeight: 600,
};

export function modeButtonStyle(isActive: boolean): React.CSSProperties {
  return {
    backgroundColor: isActive ? "#2563eb" : "#111827",
    color: "white",
    border: "1px solid #374151",
    borderRadius: "10px",
    padding: "8px 12px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "13px",
  };
}

export function typeToggleStyle(
  isActive: boolean,
  type: EntityType
): React.CSSProperties {
  return {
    backgroundColor: isActive ? getTypeColor(type) : "#111827",
    color: "white",
    border: "1px solid #374151",
    borderRadius: "999px",
    padding: "7px 12px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "12px",
  };
}

export function archiveItemStyle(isSelected: boolean): React.CSSProperties {
  return {
    textAlign: "left",
    padding: 12,
    borderRadius: 10,
    border: isSelected ? "1px solid #4d8dff" : "1px solid #2b2b2b",
    background: isSelected ? "#1b2740" : "#181818",
    color: "white",
    cursor: "pointer",
    boxShadow: isSelected
      ? "0 0 0 1px rgba(77,141,255,0.35), 0 0 18px rgba(37,99,235,0.18)"
      : "none",
    transition: "border-color 160ms ease, box-shadow 160ms ease, background 160ms ease",
  };
}

export function selectedBadgeStyle(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "11px",
    fontWeight: 700,
    padding: "4px 8px",
    borderRadius: "999px",
    backgroundColor: "#2563eb",
    color: "#ffffff",
    letterSpacing: "0.01em",
  };
}

export function quickCreateButtonStyle(): React.CSSProperties {
  return {
    padding: "9px 10px",
    borderRadius: 8,
    border: "1px solid #374151",
    background: "#111827",
    color: "white",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 12,
  };
}

export function timelineItemStyle(isSelected: boolean): React.CSSProperties {
  return {
    textAlign: "left",
    width: "100%",
    backgroundColor: isSelected ? "#1b2740" : "#111827",
    color: "#f3f4f6",
    border: isSelected ? "1px solid #3b82f6" : "1px solid #374151",
    borderRadius: "14px",
    padding: "14px",
    cursor: "pointer",
  };
}

export function tagChipStyle(): React.CSSProperties {
  return {
    fontSize: "11px",
    padding: "2px 6px",
    borderRadius: 999,
    background: "#2a2a2a",
    color: "#d1d5db",
  };
}

export function removableTagStyle(): React.CSSProperties {
  return {
    backgroundColor: "#374151",
    color: "#f9fafb",
    border: "none",
    borderRadius: "999px",
    padding: "6px 10px",
    cursor: "pointer",
  };
}

export function timelineBadgeStyle(color: string): React.CSSProperties {
  return {
    fontSize: "11px",
    fontWeight: 700,
    padding: "4px 8px",
    borderRadius: "999px",
    backgroundColor: color,
    color: "white",
  };
}

export function metaPillStyle(): React.CSSProperties {
  return {
    fontSize: "12px",
    padding: "4px 8px",
    borderRadius: "999px",
    backgroundColor: "#0b1220",
    border: "1px solid #374151",
    color: "#d1d5db",
  };
}