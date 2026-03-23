import { useMemo, useRef, useState } from "react";
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
import type {
  Entity,
  EntityMetadata,
  EntityType,
  EntityTypeDefinition,
  MetadataFieldDefinition,
} from "../types";
import {
  getEntityTypeLabel,
  getMetadataFieldsForEntityType,
  getTypeColor,
  remapMetadataForType,
} from "../utils/entity";
import { getEntityTypeIcon, uiIcons } from "../utils/icons";

type EntityEditorProps = {
  entityTypes: EntityTypeDefinition[];
  entities: Entity[];
  selectedEntity: Entity;
  newTag: string;
  onUpdateEntity: (patch: Partial<Entity>) => void;
  onUpdateMetadataField: (
    fieldKey: string,
    value: string,
    options?: {
      commitReference?: boolean;
    }
  ) => void;
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


function handleEnterBlur(
  event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>
) {
  if (event.key !== "Enter") return;
  if (event.shiftKey) return;
  event.currentTarget.blur();
}

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
        <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
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
            <span style={{ fontSize: "15px", fontWeight: 800, color: "#f9fafb" }}>
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

function ReferenceAutocompleteField({
  field,
  value,
  selectedEntity,
  entities,
  entityTypes,
  onChange,
}: {
  field: MetadataFieldDefinition;
  value: string;
  selectedEntity: Entity;
  entities: Entity[];
  entityTypes: EntityTypeDefinition[];
  onChange: (
    value: string,
    options?: {
      commitReference?: boolean;
    }
  ) => void;
}) {
  const [open, setOpen] = useState(false);
  const blurTimeoutRef = useRef<number | null>(null);

  const allowedTypes = field.allowedEntityTypes ?? [];
  const filteredEntities = useMemo(() => {
    const normalizedQuery = value.trim().toLowerCase();

    return entities
      .filter((entity) => entity.id !== selectedEntity.id)
      .filter((entity) =>
        allowedTypes.length === 0 ? true : allowedTypes.includes(entity.type)
      )
      .filter((entity) => {
        if (!normalizedQuery) return true;
        const haystack = [entity.name, entity.shortDescription, entity.type]
          .join(" ")
          .toLowerCase();
        return haystack.includes(normalizedQuery);
      })
      .sort((a, b) => {
        const aq = a.name.toLowerCase();
        const bq = b.name.toLowerCase();
        const startsA = normalizedQuery ? aq.startsWith(normalizedQuery) : false;
        const startsB = normalizedQuery ? bq.startsWith(normalizedQuery) : false;
        if (startsA && !startsB) return -1;
        if (!startsA && startsB) return 1;
        return a.name.localeCompare(b.name, "it", { sensitivity: "base" });
      })
      .slice(0, 8);
  }, [allowedTypes, entities, selectedEntity.id, value]);

  const exactMatch = useMemo(() => {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return undefined;
    return filteredEntities.find(
      (entity) => entity.name.trim().toLowerCase() === normalized
    );
  }, [filteredEntities, value]);

  const allowedTypeLabels = allowedTypes.map((type) => getEntityTypeLabel(type, entityTypes));

  function commit(valueToCommit: string) {
    onChange(valueToCommit, { commitReference: true });
    setOpen(false);
  }

  function handleBlur() {
    blurTimeoutRef.current = window.setTimeout(() => {
      commit(value);
    }, 120);
  }

  function clearBlurTimeout() {
    if (blurTimeoutRef.current !== null) {
      window.clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
  }

  return (
    <div style={{ position: "relative", display: "grid", gap: "8px" }}>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            const first = filteredEntities[0];
            if (first) {
              commit(first.name);
            } else {
              commit(value);
            }
          }
        }}
        placeholder={field.placeholder}
        style={inputDarkStyle}
      />

      {open ? (
        <div
          onMouseDown={clearBlurTimeout}
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            zIndex: 30,
            borderRadius: "14px",
            border: "1px solid rgba(148,163,184,0.18)",
            background: "rgba(6,12,22,0.98)",
            boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
            overflow: "hidden",
          }}
        >
          <div style={{ maxHeight: "260px", overflowY: "auto", display: "grid" }}>
            {filteredEntities.length === 0 ? (
              <div style={{ padding: "12px 14px", fontSize: "13px", color: "#9ca3af" }}>
                Nessuna entità trovata.
              </div>
            ) : (
              filteredEntities.map((entity) => {
                const accent = getTypeColor(entity.type, entityTypes);
                return (
                  <button
                    key={entity.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => commit(entity.name)}
                    style={{
                      display: "grid",
                      gap: "4px",
                      textAlign: "left",
                      padding: "11px 14px",
                      border: "none",
                      background: "transparent",
                      color: "#f8fafc",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span
                        style={{
                          width: "9px",
                          height: "9px",
                          borderRadius: "999px",
                          background: accent,
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontSize: "13px", fontWeight: 800 }}>{entity.name}</span>
                    </div>
                    <div style={{ fontSize: "12px", color: "#9ca3af" }}>
                      {getEntityTypeLabel(entity.type, entityTypes)}
                      {entity.shortDescription ? ` · ${entity.shortDescription}` : ""}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}

      <div style={{ fontSize: "12px", color: "#9ca3af", lineHeight: 1.45 }}>
        {allowedTypeLabels.length > 0
          ? `Autocomplete su: ${allowedTypeLabels.join(", ")}.`
          : "Autocomplete su tutte le entità."}{" "}
        {exactMatch ? (
          <span style={{ color: "#86efac" }}>Collegamento pronto: {exactMatch.name}</span>
        ) : field.autoCreateTarget ? (
          <span>Se non esiste, verrà creato al commit.</span>
        ) : (
          <span>Premi Invio o esci dal campo per sincronizzare la relazione.</span>
        )}
      </div>
    </div>
  );
}

export default function EntityEditor({
  entityTypes,
  entities,
  selectedEntity,
  newTag,
  onUpdateEntity,
  onUpdateMetadataField,
  onNewTagChange,
  onAddTag,
  onRemoveTag,
  onDuplicateEntity,
  onDeleteEntity,
}: EntityEditorProps) {
  const [mode, setMode] = useState<EditorMode>("read");
  const [newMetaKey, setNewMetaKey] = useState("");
  const [newMetaValue, setNewMetaValue] = useState("");

  const metadata = selectedEntity.metadata ?? {};
  const metadataFields = getMetadataFieldsForEntityType(selectedEntity.type, entityTypes);
  const entityAccent = getTypeColor(selectedEntity.type, entityTypes);
  const EntityIcon = getEntityTypeIcon(selectedEntity.type);

  const baseKeys = metadataFields.map((field) => field.key);

  const visibleMetadataEntries = useMemo(() => {
    return metadataFields
      .map((field) => ({ key: field.key, label: field.label, value: metadata[field.key] ?? "" }))
      .filter((entry) => entry.value.trim() !== "");
  }, [metadata, metadataFields]);

  const customMetadataEntries = useMemo(() => {
    return Object.entries(metadata).filter(([key]) => !baseKeys.includes(key));
  }, [metadata, baseKeys]);

  function updateMetadataField(key: string, value: string) {
    const nextMetadata: EntityMetadata = {
      ...metadata,
      [key]: value,
    };
    onUpdateEntity({ metadata: nextMetadata });
  }

  function addCustomMetadataField() {
    const key = newMetaKey.trim().replace(/\s+/g, " ");
    const value = newMetaValue.trim();
    if (!key) return;
    if (metadata[key] !== undefined) {
      alert("Questo campo esiste già.");
      return;
    }
    onUpdateEntity({ metadata: { ...metadata, [key]: value } });
    setNewMetaKey("");
    setNewMetaValue("");
  }

  function removeCustomMetadataField(key: string) {
    const nextMetadata: EntityMetadata = { ...metadata };
    delete nextMetadata[key];
    onUpdateEntity({ metadata: nextMetadata });
  }

  function handleTypeChange(nextType: EntityType) {
    onUpdateEntity({
      type: nextType,
      metadata: remapMetadataForType(selectedEntity.metadata, nextType, entityTypes),
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
      <div style={{ height: "4px", background: entityAccent, margin: "-16px -16px 16px -16px" }} />

      <div style={{ display: "grid", gap: "12px", marginBottom: "18px" }}>
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
          {getEntityTypeLabel(selectedEntity.type, entityTypes)} → {selectedEntity.name || "Entità"}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start", flexWrap: "wrap" }}>
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
              style={{ ...contextualActionButtonStyle, border: `1px solid ${entityAccent}44`, background: `${entityAccent}18` }}
            >
              <uiIcons.edit size={14} />
              {mode === "read" ? "Modifica" : "Anteprima"}
            </button>

            <button type="button" onClick={onDuplicateEntity} style={contextualActionButtonStyle}>
              <uiIcons.duplicate size={14} />
              Duplica
            </button>

            <button
              type="button"
              onClick={onDeleteEntity}
              style={{ ...dangerButtonStyle, display: "inline-flex", alignItems: "center", gap: "8px", padding: "10px 12px" }}
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
          rightSlot={<span style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em", color: "#cbd5e1" }}>{mode === "read" ? "Anteprima" : "Modifica"}</span>}
        >
          {mode === "read" ? (
            <div style={{ display: "grid", gap: "14px" }}>
              <div style={{ display: "grid", gap: "6px" }}>
                <div style={metadataPreviewLabelStyle}>Nome</div>
                <div style={metadataPreviewValueStyle}>{selectedEntity.name || "—"}</div>
              </div>
              <div style={{ display: "grid", gap: "6px" }}>
                <div style={metadataPreviewLabelStyle}>Tipo</div>
                <div style={metadataPreviewValueStyle}>{getEntityTypeLabel(selectedEntity.type, entityTypes)}</div>
              </div>
              <div style={{ display: "grid", gap: "6px" }}>
                <div style={metadataPreviewLabelStyle}>Descrizione breve</div>
                <div style={metadataPreviewValueStyle}>{selectedEntity.shortDescription || UI_TEXT.emptyShortDescription}</div>
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "14px" }}>
              <div>
                <label style={fieldLabelStyle}>Nome</label>
                <input type="text" value={selectedEntity.name} onChange={(e) => onUpdateEntity({ name: e.target.value })} onKeyDown={handleEnterBlur} style={inputStyle} />
              </div>
              <div>
                <label style={fieldLabelStyle}>Tipo</label>
                <select value={selectedEntity.type} onChange={(e) => handleTypeChange(e.target.value as EntityType)} style={inputStyle}>
                  {entityTypes.map((type) => (
                    <option key={type.id} value={type.id}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={fieldLabelStyle}>Descrizione breve</label>
                <textarea value={selectedEntity.shortDescription} onChange={(e) => onUpdateEntity({ shortDescription: e.target.value })} style={textareaStyle} />
              </div>
            </div>
          )}
        </CollapsibleSection>

        <CollapsibleSection title="Metadata" accentColor={entityAccent} defaultOpen icon={<uiIcons.archive size={15} />} rightSlot={<span style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em", color: "#cbd5e1" }}>{metadataFields.length + customMetadataEntries.length} campi</span>}>
          {mode === "read" ? (
            visibleMetadataEntries.length === 0 && customMetadataEntries.length === 0 ? (
              <div style={{ color: "#9ca3af", fontSize: "14px" }}>Nessun metadata compilato.</div>
            ) : (
              <div style={{ display: "grid", gap: "12px" }}>
                {visibleMetadataEntries.map((entry) => (
                  <div key={entry.key} style={{ ...cardStyle, display: "grid", gap: "6px" }}>
                    <div style={metadataPreviewLabelStyle}>{entry.label}</div>
                    <div style={metadataPreviewValueStyle}>{entry.value}</div>
                  </div>
                ))}
                {customMetadataEntries.map(([key, customValue]) => (
                  <div key={key} style={{ ...cardStyle, display: "grid", gap: "6px", border: "1px solid rgba(96,165,250,0.16)" }}>
                    <div style={metadataPreviewLabelStyle}>{key}</div>
                    <div style={metadataPreviewValueStyle}>{customValue || "—"}</div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div style={{ display: "grid", gap: "14px" }}>
              {metadataFields.length > 0 ? (
                <div style={{ display: "grid", gap: "12px" }}>
                  <div style={{ fontSize: "12px", fontWeight: 800, textTransform: "uppercase", color: "#9ca3af", letterSpacing: "0.04em" }}>
                    Campi base
                  </div>

                  {metadataFields.map((field) => {
                    const value = metadata[field.key] ?? "";
                    return (
                      <div key={field.key}>
                        <label style={smallFieldLabelStyle}>{field.label}</label>
                        {field.kind === "textarea" ? (
                          <textarea
                            value={value}
                            onChange={(e) => onUpdateMetadataField(field.key, e.target.value)}
                            placeholder={field.placeholder}
                            style={textareaStyle}
                          />
                        ) : field.kind === "entity-reference" ? (
                          <ReferenceAutocompleteField
                            field={field}
                            value={value}
                            selectedEntity={selectedEntity}
                            entities={entities}
                            entityTypes={entityTypes}
                            onChange={(nextValue, options) => onUpdateMetadataField(field.key, nextValue, options)}
                          />
                        ) : (
                          <input
                            type="text"
                            value={value}
                            onChange={(e) => onUpdateMetadataField(field.key, e.target.value)}
                            onBlur={() => onUpdateMetadataField(field.key, value, { commitReference: true })}
                            onKeyDown={handleEnterBlur}
                            placeholder={field.placeholder}
                            style={inputDarkStyle}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ fontSize: "13px", color: "#9ca3af", lineHeight: 1.5 }}>
                  Questo tipo non ha campi base predefiniti. Puoi usare liberamente i campi personalizzati qui sotto.
                </div>
              )}

              <div style={{ display: "grid", gap: "12px", paddingTop: "4px" }}>
                <div style={{ fontSize: "12px", fontWeight: 800, textTransform: "uppercase", color: "#9ca3af", letterSpacing: "0.04em" }}>
                  Campi personalizzati
                </div>

                {customMetadataEntries.length === 0 ? (
                  <div style={{ color: "#9ca3af", fontSize: "13px" }}>Nessun campo personalizzato</div>
                ) : (
                  <div style={{ display: "grid", gap: "10px" }}>
                    {customMetadataEntries.map(([key, customValue]) => (
                      <div key={key} style={{ display: "grid", gridTemplateColumns: "minmax(140px, 180px) minmax(0, 1fr) auto", gap: "8px", alignItems: "center" }}>
                        <input value={key} disabled style={{ ...inputDarkStyle, opacity: 0.72, cursor: "default" }} />
                        <input type="text" value={customValue} onChange={(e) => updateMetadataField(key, e.target.value)} onKeyDown={handleEnterBlur} style={inputDarkStyle} />
                        <button type="button" onClick={() => removeCustomMetadataField(key)} style={{ ...dangerButtonStyle, display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: "42px", height: "42px", padding: 0 }}>
                          <uiIcons.delete size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ ...cardStyle, display: "grid", gap: "10px", border: "1px dashed rgba(148,163,184,0.18)" }}>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#d1d5db" }}>Aggiungi nuovo campo personalizzato</div>
                  <div style={{ display: "grid", gridTemplateColumns: "minmax(140px, 180px) minmax(0, 1fr) auto", gap: "8px", alignItems: "center" }}>
                    <input type="text" placeholder="Nome campo" value={newMetaKey} onChange={(e) => setNewMetaKey(e.target.value)} style={inputDarkStyle} />
                    <input type="text" placeholder="Valore" value={newMetaValue} onChange={(e) => setNewMetaValue(e.target.value)} style={inputDarkStyle} />
                    <button type="button" onClick={addCustomMetadataField} style={{ ...primaryButtonStyle, display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: "42px", height: "42px", padding: 0 }}>
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CollapsibleSection>

        <CollapsibleSection title="Tag" accentColor={entityAccent} defaultOpen icon={<uiIcons.tags size={15} />} rightSlot={<span style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em", color: "#cbd5e1" }}>{selectedEntity.tags.length}</span>}>
          <div style={{ display: "grid", gap: "12px" }}>
            <div style={{ display: "flex", gap: "10px" }}>
              <input type="text" value={newTag} onChange={(e) => onNewTagChange(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onAddTag(); } }} placeholder={UI_TEXT.newTagPlaceholder} style={inputDarkStyle} />
              <button type="button" onClick={onAddTag} style={{ ...primaryButtonStyle, display: "inline-flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                <uiIcons.tags size={14} />
                Aggiungi
              </button>
            </div>
            {selectedEntity.tags.length === 0 ? (
              <div style={{ color: "#9ca3af", fontSize: "14px" }}>Nessun tag assegnato.</div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {selectedEntity.tags.map((tag) => (
                  <button key={tag} type="button" onClick={() => onRemoveTag(tag)} style={{ ...removableTagStyle(), display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    <uiIcons.tags size={12} />
                    {tag}
                  </button>
                ))}
              </div>
            )}
          </div>
        </CollapsibleSection>
      </div>
    </div>
  );
}
