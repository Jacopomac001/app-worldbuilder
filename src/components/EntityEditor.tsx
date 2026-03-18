import { useMemo, useState } from "react";
import { UI_TEXT } from "../config";
import {
  cardStyle,
  inputDarkStyle,
  inputStyle,
  panelStyle,
  primaryButtonStyle,
  removableTagStyle,
  textareaStyle,
} from "../styles";
import type { Entity, EntityMetadata, EntityType } from "../types";
import {
  getEntityTypeLabel,
  getTypeColor,
  metadataFieldsByType,
  remapMetadataForType,
} from "../utils/entity";

type EntityEditorProps = {
  selectedEntity: Entity;
  newTag: string;
  onUpdateEntity: (patch: Partial<Entity>) => void;
  onNewTagChange: (value: string) => void;
  onAddTag: () => void;
  onRemoveTag: (tag: string) => void;
  onDuplicateEntity: () => void;
  onDeleteEntity: () => void;
};

type EditorMode = "read" | "edit";

type CollapsibleSectionProps = {
  title: string;
  defaultOpen?: boolean;
  accentColor: string;
  children: React.ReactNode;
  rightSlot?: React.ReactNode;
};

const fieldLabelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: "6px",
  color: "#9ca3af",
  fontSize: "14px",
  fontWeight: 600,
};

const smallFieldLabelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: "6px",
  color: "#9ca3af",
  fontSize: "13px",
  fontWeight: 600,
};

const contextualActionButtonStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: "10px",
  border: "1px solid #374151",
  background: "#111827",
  color: "#f3f4f6",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: "13px",
};

const metadataPreviewLabelStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "#9ca3af",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  fontWeight: 700,
};

const metadataPreviewValueStyle: React.CSSProperties = {
  fontSize: "14px",
  color: "#f3f4f6",
  lineHeight: 1.45,
  fontWeight: 500,
};

function CollapsibleSection({
  title,
  defaultOpen = true,
  accentColor,
  children,
  rightSlot,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      style={{
        ...cardStyle,
        padding: "0",
        overflow: "hidden",
        border: `1px solid ${open ? `${accentColor}44` : "#374151"}`,
        transition: "border-color 160ms ease",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          padding: "14px 16px",
          background: open ? "#0f172a" : "#111827",
          border: "none",
          cursor: "pointer",
          color: "#f3f4f6",
          textAlign: "left",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            minWidth: 0,
          }}
        >
          <span
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "999px",
              backgroundColor: accentColor,
              flexShrink: 0,
            }}
          />

          <span
            style={{
              fontSize: "15px",
              fontWeight: 700,
              color: "#f9fafb",
            }}
          >
            {open ? "▼" : "▶"} {title}
          </span>
        </div>

        {rightSlot ? <div>{rightSlot}</div> : null}
      </button>

      {open ? (
        <div
          style={{
            padding: "16px",
            borderTop: "1px solid #1f2937",
            display: "grid",
            gap: "14px",
          }}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

function handleEnterBlur(
  event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>
) {
  if (event.key !== "Enter") return;
  if (event.shiftKey) return;

  const target = event.currentTarget;
  target.blur();
}

export default function EntityEditor({
  selectedEntity,
  newTag,
  onUpdateEntity,
  onNewTagChange,
  onAddTag,
  onRemoveTag,
  onDuplicateEntity,
  onDeleteEntity,
}: EntityEditorProps) {
  const [mode, setMode] = useState<EditorMode>("read");

  const metadata = selectedEntity.metadata ?? {};
  const metadataFields = metadataFieldsByType[selectedEntity.type];
  const entityAccent = getTypeColor(selectedEntity.type);

  const visibleMetadataEntries = useMemo(() => {
    return metadataFields
      .map((field) => ({
        key: field.key,
        label: field.label,
        value: metadata[field.key] ?? "",
      }))
      .filter((entry) => entry.value.trim() !== "");
  }, [metadata, metadataFields]);

  function updateMetadataField(key: string, value: string) {
    const nextMetadata: EntityMetadata = {
      ...metadata,
      [key]: value,
    };

    onUpdateEntity({ metadata: nextMetadata });
  }

  function handleTypeChange(nextType: EntityType) {
    onUpdateEntity({
      type: nextType,
      metadata: remapMetadataForType(selectedEntity.metadata, nextType),
    });
  }

  return (
    <div
      style={{
        ...panelStyle,
        border: `1px solid ${entityAccent}55`,
        boxShadow: "0 14px 34px rgba(0,0,0,0.18)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "4px",
          background: entityAccent,
          margin: "-16px -16px 16px -16px",
        }}
      />

      <div
        style={{
          display: "grid",
          gap: "12px",
          marginBottom: "18px",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            width: "fit-content",
            padding: "6px 10px",
            borderRadius: "999px",
            backgroundColor: `${entityAccent}22`,
            border: `1px solid ${entityAccent}55`,
            color: "#e5e7eb",
            fontSize: "12px",
            fontWeight: 700,
            letterSpacing: "0.02em",
            textTransform: "uppercase",
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "999px",
              backgroundColor: entityAccent,
              display: "inline-block",
            }}
          />
          {getEntityTypeLabel(selectedEntity.type)} → {selectedEntity.name || "Entità"}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <h2
              style={{
                margin: 0,
                fontSize: "30px",
                lineHeight: 1.1,
                color: "#f9fafb",
              }}
            >
              {selectedEntity.name || "Entità senza nome"}
            </h2>

            {selectedEntity.shortDescription ? (
              <div
                style={{
                  marginTop: "8px",
                  color: "#9ca3af",
                  fontSize: "15px",
                  lineHeight: 1.6,
                  maxWidth: "760px",
                }}
              >
                {selectedEntity.shortDescription}
              </div>
            ) : null}
          </div>

          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "6px",
                padding: "4px",
                borderRadius: "12px",
                backgroundColor: "#111827",
                border: "1px solid #374151",
              }}
            >
              <button
                type="button"
                onClick={() => setMode("read")}
                style={{
                  ...contextualActionButtonStyle,
                  background: mode === "read" ? `${entityAccent}22` : "transparent",
                  border:
                    mode === "read"
                      ? `1px solid ${entityAccent}66`
                      : "1px solid transparent",
                }}
              >
                Lettura
              </button>

              <button
                type="button"
                onClick={() => setMode("edit")}
                style={{
                  ...contextualActionButtonStyle,
                  background: mode === "edit" ? `${entityAccent}22` : "transparent",
                  border:
                    mode === "edit"
                      ? `1px solid ${entityAccent}66`
                      : "1px solid transparent",
                }}
              >
                Modifica
              </button>
            </div>

            <button onClick={onDuplicateEntity} style={contextualActionButtonStyle}>
              Duplica
            </button>

            <button
              onClick={onDeleteEntity}
              style={{
                ...contextualActionButtonStyle,
                background: "#3b1014",
                border: "1px solid #7f1d1d",
                color: "#fecaca",
              }}
            >
              Elimina
            </button>
          </div>
        </div>
      </div>

      {mode === "read" ? (
        <div style={{ display: "grid", gap: "14px" }}>
          <CollapsibleSection
            title="Informazioni base"
            accentColor={entityAccent}
            defaultOpen
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "10px",
              }}
            >
              <div
                style={{
                  backgroundColor: "#0b1220",
                  border: `1px solid ${entityAccent}33`,
                  borderRadius: "12px",
                  padding: "12px",
                  display: "grid",
                  gap: "6px",
                }}
              >
                <div style={metadataPreviewLabelStyle}>Tipo</div>
                <div style={metadataPreviewValueStyle}>
                  {getEntityTypeLabel(selectedEntity.type)}
                </div>
              </div>

              <div
                style={{
                  backgroundColor: "#0b1220",
                  border: `1px solid ${entityAccent}33`,
                  borderRadius: "12px",
                  padding: "12px",
                  display: "grid",
                  gap: "6px",
                }}
              >
                <div style={metadataPreviewLabelStyle}>Nome</div>
                <div style={metadataPreviewValueStyle}>{selectedEntity.name}</div>
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="Metadati"
            accentColor={entityAccent}
            defaultOpen
            rightSlot={
              <span
                style={{
                  fontSize: "12px",
                  color: "#9ca3af",
                  fontWeight: 600,
                }}
              >
                {visibleMetadataEntries.length} valorizzati
              </span>
            }
          >
            {visibleMetadataEntries.length > 0 ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "10px",
                }}
              >
                {visibleMetadataEntries.map((entry) => (
                  <div
                    key={entry.key}
                    style={{
                      backgroundColor: "#0b1220",
                      border: `1px solid ${entityAccent}33`,
                      borderRadius: "12px",
                      padding: "12px",
                      display: "grid",
                      gap: "6px",
                    }}
                  >
                    <div style={metadataPreviewLabelStyle}>{entry.label}</div>
                    <div style={metadataPreviewValueStyle}>{entry.value}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  backgroundColor: "#0b1220",
                  border: "1px solid #374151",
                  borderRadius: "12px",
                  padding: "12px",
                  color: "#9ca3af",
                  fontSize: "14px",
                }}
              >
                Nessun metadato compilato per questa entità.
              </div>
            )}
          </CollapsibleSection>

          <CollapsibleSection
            title="Descrizione"
            accentColor={entityAccent}
            defaultOpen
          >
            <div
              style={{
                backgroundColor: "#0b1220",
                border: "1px solid #374151",
                borderRadius: "12px",
                padding: "14px",
                color: selectedEntity.shortDescription ? "#d1d5db" : "#9ca3af",
                lineHeight: 1.7,
                fontSize: "14px",
              }}
            >
              {selectedEntity.shortDescription || "Nessuna descrizione presente."}
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="Note"
            accentColor={entityAccent}
            defaultOpen={false}
          >
            <div
              style={{
                backgroundColor: "#0b1220",
                border: "1px solid #374151",
                borderRadius: "12px",
                padding: "14px",
                color: selectedEntity.notes ? "#d1d5db" : "#9ca3af",
                lineHeight: 1.7,
                fontSize: "14px",
                whiteSpace: "pre-wrap",
              }}
            >
              {selectedEntity.notes || "Nessuna nota presente."}
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="Tag"
            accentColor={entityAccent}
            defaultOpen
            rightSlot={
              <span
                style={{
                  fontSize: "12px",
                  color: "#9ca3af",
                  fontWeight: 600,
                }}
              >
                {selectedEntity.tags.length} tag
              </span>
            }
          >
            {selectedEntity.tags.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {selectedEntity.tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      backgroundColor: "#374151",
                      color: "#f9fafb",
                      borderRadius: "999px",
                      padding: "6px 10px",
                      fontSize: "13px",
                    }}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            ) : (
              <div
                style={{
                  backgroundColor: "#0b1220",
                  border: "1px solid #374151",
                  borderRadius: "12px",
                  padding: "12px",
                  color: "#9ca3af",
                  fontSize: "14px",
                }}
              >
                Nessun tag assegnato.
              </div>
            )}
          </CollapsibleSection>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "14px" }}>
          <CollapsibleSection
            title="Informazioni base"
            accentColor={entityAccent}
            defaultOpen
          >
            <div style={{ marginBottom: "2px" }}>
              <label style={fieldLabelStyle}>Nome</label>
              <input
                type="text"
                value={selectedEntity.name}
                onChange={(e) => onUpdateEntity({ name: e.target.value })}
                onKeyDown={handleEnterBlur}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={fieldLabelStyle}>Tipo</label>
              <select
                value={selectedEntity.type}
                onChange={(e) => handleTypeChange(e.target.value as EntityType)}
                style={inputStyle}
              >
                <option value="luogo">Luogo</option>
                <option value="personaggio">Personaggio</option>
                <option value="fazione">Fazione</option>
                <option value="oggetto">Oggetto</option>
                <option value="evento">Evento</option>
              </select>
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="Metadati"
            accentColor={entityAccent}
            defaultOpen
            rightSlot={
              <span
                style={{
                  fontSize: "12px",
                  color: "#9ca3af",
                  fontWeight: 600,
                }}
              >
                {visibleMetadataEntries.length} valorizzati
              </span>
            }
          >
            {visibleMetadataEntries.length > 0 ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "10px",
                  marginBottom: "4px",
                }}
              >
                {visibleMetadataEntries.map((entry) => (
                  <div
                    key={entry.key}
                    style={{
                      backgroundColor: "#0b1220",
                      border: `1px solid ${entityAccent}33`,
                      borderRadius: "12px",
                      padding: "12px",
                      display: "grid",
                      gap: "6px",
                    }}
                  >
                    <div style={metadataPreviewLabelStyle}>{entry.label}</div>
                    <div style={metadataPreviewValueStyle}>{entry.value}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  backgroundColor: "#0b1220",
                  border: "1px solid #374151",
                  borderRadius: "12px",
                  padding: "12px",
                  color: "#9ca3af",
                  fontSize: "14px",
                }}
              >
                Nessun metadato compilato per questa entità.
              </div>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
              }}
            >
              {metadataFields.map((field) => (
                <div key={field.key}>
                  <label style={smallFieldLabelStyle}>{field.label}</label>
                  <input
                    type="text"
                    value={metadata[field.key] ?? ""}
                    onChange={(e) => updateMetadataField(field.key, e.target.value)}
                    onKeyDown={handleEnterBlur}
                    placeholder={field.placeholder}
                    style={inputDarkStyle}
                  />
                </div>
              ))}
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="Descrizione"
            accentColor={entityAccent}
            defaultOpen
          >
            <div>
              <label style={fieldLabelStyle}>Descrizione breve</label>
              <input
                type="text"
                value={selectedEntity.shortDescription}
                onChange={(e) =>
                  onUpdateEntity({ shortDescription: e.target.value })
                }
                onKeyDown={handleEnterBlur}
                style={inputStyle}
              />
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="Note"
            accentColor={entityAccent}
            defaultOpen={false}
          >
            <div>
              <label style={fieldLabelStyle}>Modifica note</label>
              <textarea
                value={selectedEntity.notes}
                onChange={(e) => onUpdateEntity({ notes: e.target.value })}
                onKeyDown={handleEnterBlur}
                rows={10}
                style={textareaStyle}
              />
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="Tag"
            accentColor={entityAccent}
            defaultOpen
            rightSlot={
              <span
                style={{
                  fontSize: "12px",
                  color: "#9ca3af",
                  fontWeight: 600,
                }}
              >
                {selectedEntity.tags.length} tag
              </span>
            }
          >
            <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
              <input
                type="text"
                value={newTag}
                onChange={(e) => onNewTagChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onAddTag();
                    return;
                  }
                  handleEnterBlur(e);
                }}
                placeholder={UI_TEXT.newTagPlaceholder}
                style={{
                  ...inputDarkStyle,
                  flex: 1,
                }}
              />
              <button onClick={onAddTag} style={primaryButtonStyle}>
                Aggiungi
              </button>
            </div>

            {selectedEntity.tags.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {selectedEntity.tags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => onRemoveTag(tag)}
                    style={removableTagStyle()}
                  >
                    #{tag} ×
                  </button>
                ))}
              </div>
            ) : (
              <div
                style={{
                  backgroundColor: "#0b1220",
                  border: "1px solid #374151",
                  borderRadius: "12px",
                  padding: "12px",
                  color: "#9ca3af",
                  fontSize: "14px",
                }}
              >
                Nessun tag assegnato.
              </div>
            )}
          </CollapsibleSection>
        </div>
      )}
    </div>
  );
}