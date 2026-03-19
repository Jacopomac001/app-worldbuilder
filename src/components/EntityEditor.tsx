import { useMemo, useState } from "react";
import { UI_TEXT } from "../config";
import {
  cardStyle,
  dangerButtonStyle,
  ghostButtonStyle,
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
import { getEntityTypeIcon, uiIcons } from "../utils/icons";

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
  icon?: React.ReactNode;
};

const fieldLabelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: "6px",
  color: "#9ca3af",
  fontSize: "14px",
  fontWeight: 700,
};

const smallFieldLabelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: "6px",
  color: "#9ca3af",
  fontSize: "13px",
  fontWeight: 700,
};

const contextualActionButtonStyle: React.CSSProperties = {
  ...ghostButtonStyle,
  padding: "10px 12px",
  fontSize: "13px",
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
};

const metadataPreviewLabelStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "#9ca3af",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  fontWeight: 800,
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
  icon,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      style={{
        ...cardStyle,
        padding: "0",
        overflow: "hidden",
        border: `1px solid ${open ? `${accentColor}44` : "rgba(148, 163, 184, 0.14)"}`,
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
          background: open
            ? "linear-gradient(180deg, rgba(15,23,38,0.96) 0%, rgba(12,20,34,0.96) 100%)"
            : "linear-gradient(180deg, rgba(19,29,46,0.9) 0%, rgba(15,23,38,0.9) 100%)",
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

          <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
            {icon}
            <span
              style={{
                fontSize: "15px",
                fontWeight: 800,
                color: "#f9fafb",
              }}
            >
              {title}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {rightSlot ? <div>{rightSlot}</div> : null}
          {open ? <uiIcons.sectionOpen size={16} /> : <uiIcons.sectionClosed size={16} />}
        </div>
      </button>

      {open ? (
        <div
          style={{
            padding: "16px",
            borderTop: "1px solid rgba(148, 163, 184, 0.12)",
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
  const EntityIcon = getEntityTypeIcon(selectedEntity.type);

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
          <EntityIcon size={14} color={entityAccent} />
          {getEntityTypeLabel(selectedEntity.type)} → {selectedEntity.name || "Entità"}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "12px",
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2 style={{ marginBottom: "6px" }}>{selectedEntity.name || "Entità"}</h2>
            <div style={{ color: "#9ca3af", fontSize: "14px", maxWidth: "720px" }}>
              {selectedEntity.shortDescription || UI_TEXT.emptyShortDescription}
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setMode((current) => (current === "read" ? "edit" : "read"))}
              style={{
                ...contextualActionButtonStyle,
                border: `1px solid ${entityAccent}44`,
                background: `${entityAccent}18`,
              }}
            >
              <uiIcons.edit size={14} />
              {mode === "read" ? "Modifica" : "Anteprima"}
            </button>

            <button
              type="button"
              onClick={onDuplicateEntity}
              style={contextualActionButtonStyle}
            >
              <uiIcons.duplicate size={14} />
              Duplica
            </button>

            <button
              type="button"
              onClick={onDeleteEntity}
              style={{
                ...dangerButtonStyle,
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 12px",
              }}
            >
              <uiIcons.delete size={14} />
              Elimina
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gap: "14px" }}>
        <CollapsibleSection
          title="Dettagli base"
          accentColor={entityAccent}
          defaultOpen
          icon={<uiIcons.edit size={15} />}
          rightSlot={
            <span
              style={{
                fontSize: "11px",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                color: "#cbd5e1",
              }}
            >
              {mode === "read" ? "Anteprima" : "Modifica"}
            </span>
          }
        >
          {mode === "read" ? (
            <div style={{ display: "grid", gap: "14px" }}>
              <div style={{ display: "grid", gap: "6px" }}>
                <div style={metadataPreviewLabelStyle}>Nome</div>
                <div style={metadataPreviewValueStyle}>{selectedEntity.name || "—"}</div>
              </div>

              <div style={{ display: "grid", gap: "6px" }}>
                <div style={metadataPreviewLabelStyle}>Tipo</div>
                <div style={metadataPreviewValueStyle}>
                  {getEntityTypeLabel(selectedEntity.type)}
                </div>
              </div>

              <div style={{ display: "grid", gap: "6px" }}>
                <div style={metadataPreviewLabelStyle}>Descrizione breve</div>
                <div style={metadataPreviewValueStyle}>
                  {selectedEntity.shortDescription || UI_TEXT.emptyShortDescription}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "14px" }}>
              <div>
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

              <div>
                <label style={fieldLabelStyle}>Descrizione breve</label>
                <textarea
                  value={selectedEntity.shortDescription}
                  onChange={(e) =>
                    onUpdateEntity({ shortDescription: e.target.value })
                  }
                  style={textareaStyle}
                />
              </div>
            </div>
          )}
        </CollapsibleSection>

        <CollapsibleSection
          title="Metadata"
          accentColor={entityAccent}
          defaultOpen
          icon={<uiIcons.archive size={15} />}
          rightSlot={
            <span
              style={{
                fontSize: "11px",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                color: "#cbd5e1",
              }}
            >
              {metadataFields.length} campi
            </span>
          }
        >
          {mode === "read" ? (
            visibleMetadataEntries.length === 0 ? (
              <div style={{ color: "#9ca3af", fontSize: "14px" }}>
                Nessun metadata compilato.
              </div>
            ) : (
              <div style={{ display: "grid", gap: "12px" }}>
                {visibleMetadataEntries.map((entry) => (
                  <div
                    key={entry.key}
                    style={{
                      ...cardStyle,
                      display: "grid",
                      gap: "6px",
                    }}
                  >
                    <div style={metadataPreviewLabelStyle}>{entry.label}</div>
                    <div style={metadataPreviewValueStyle}>{entry.value}</div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div style={{ display: "grid", gap: "12px" }}>
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
          )}
        </CollapsibleSection>

        <CollapsibleSection
          title="Tag"
          accentColor={entityAccent}
          defaultOpen
          icon={<uiIcons.tags size={15} />}
          rightSlot={
            <span
              style={{
                fontSize: "11px",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                color: "#cbd5e1",
              }}
            >
              {selectedEntity.tags.length}
            </span>
          }
        >
          <div style={{ display: "grid", gap: "12px" }}>
            <div style={{ display: "flex", gap: "10px" }}>
              <input
                type="text"
                value={newTag}
                onChange={(e) => onNewTagChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onAddTag();
                  }
                }}
                placeholder={UI_TEXT.newTagPlaceholder}
                style={inputDarkStyle}
              />

              <button
                type="button"
                onClick={onAddTag}
                style={{
                  ...primaryButtonStyle,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  flexShrink: 0,
                }}
              >
                <uiIcons.tags size={14} />
                Aggiungi
              </button>
            </div>

            {selectedEntity.tags.length === 0 ? (
              <div style={{ color: "#9ca3af", fontSize: "14px" }}>
                Nessun tag assegnato.
              </div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {selectedEntity.tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => onRemoveTag(tag)}
                    style={{
                      ...removableTagStyle(),
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <uiIcons.tags size={12} />
                    {tag}
                  </button>
                ))}
              </div>
            )}
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="Note"
          accentColor={entityAccent}
          defaultOpen
          icon={<uiIcons.notes size={15} />}
        >
          {mode === "read" ? (
            <div
              style={{
                ...cardStyle,
                minHeight: "120px",
                color: selectedEntity.notes ? "#f3f4f6" : "#9ca3af",
                whiteSpace: "pre-wrap",
                lineHeight: 1.6,
              }}
            >
              {selectedEntity.notes || UI_TEXT.emptyNotes}
            </div>
          ) : (
            <textarea
              value={selectedEntity.notes}
              onChange={(e) => onUpdateEntity({ notes: e.target.value })}
              style={{
                ...textareaStyle,
                minHeight: "180px",
              }}
            />
          )}
        </CollapsibleSection>
      </div>
    </div>
  );
}