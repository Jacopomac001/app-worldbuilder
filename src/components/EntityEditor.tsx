import { useMemo, useRef, useState } from "react";
import {
  Camera,
  ImagePlus,
  Link2,
  ScrollText,
  Sparkles,
  Tag,
  Waypoints,
} from "lucide-react";
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
  EntityType,
  EntityTypeDefinition,
  MetadataFieldDefinition,
  Relation,
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
  relations: Relation[];
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
  onOpenEntity: (id: string) => void;
  onCenterInGraph: () => void;
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

type NarrativeRelationItem = {
  relation: Relation;
  direction: "outgoing" | "incoming";
  otherEntity: Entity;
  label: string;
};

const fieldLabelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: "6px",
  color: "#b6c2d3",
  fontSize: "13px",
  fontWeight: 800,
  letterSpacing: "0.01em",
};

const contextualActionButtonStyle: React.CSSProperties = {
  ...ghostButtonStyle,
  padding: "10px 12px",
  fontSize: "13px",
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
};

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Errore lettura file"));
    reader.readAsDataURL(file);
  });
}

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
        padding: 0,
        overflow: "hidden",
        border: `1px solid ${open ? `${accentColor}55` : "rgba(167, 139, 78, 0.18)"}`,
        background:
          "linear-gradient(180deg, rgba(24,21,17,0.98) 0%, rgba(13,15,18,0.98) 100%)",
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
            ? "linear-gradient(180deg, rgba(40,31,20,0.86) 0%, rgba(24,21,17,0.98) 100%)"
            : "linear-gradient(180deg, rgba(22,21,18,0.95) 0%, rgba(17,18,20,0.98) 100%)",
          border: "none",
          cursor: "pointer",
          color: "#f7f2e8",
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
              boxShadow: `0 0 18px ${accentColor}55`,
            }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
            {icon}
            <span style={{ fontSize: "15px", fontWeight: 800, color: "#f7f2e8" }}>
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
            borderTop: "1px solid rgba(167, 139, 78, 0.14)",
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
            border: "1px solid rgba(167,139,78,0.2)",
            background: "rgba(9,10,12,0.98)",
            boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
            overflow: "hidden",
          }}
        >
          <div style={{ maxHeight: "260px", overflowY: "auto", display: "grid" }}>
            {filteredEntities.length === 0 ? (
              <div style={{ padding: "12px 14px", fontSize: "13px", color: "#b6c2d3" }}>
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
                      <span style={{ fontWeight: 700 }}>{entity.name}</span>
                    </div>
                    <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                      {getEntityTypeLabel(entity.type, entityTypes)}
                      {entity.shortDescription ? ` · ${entity.shortDescription}` : ""}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function renderMetadataInput(params: {
  field: MetadataFieldDefinition;
  value: string;
  selectedEntity: Entity;
  entities: Entity[];
  entityTypes: EntityTypeDefinition[];
  onChange: (value: string, options?: { commitReference?: boolean }) => void;
}) {
  const { field, value, selectedEntity, entities, entityTypes, onChange } = params;

  if (field.kind === "textarea") {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        rows={4}
        style={textareaStyle}
      />
    );
  }

  if (field.kind === "entity-reference") {
    return (
      <ReferenceAutocompleteField
        field={field}
        value={value}
        selectedEntity={selectedEntity}
        entities={entities}
        entityTypes={entityTypes}
        onChange={onChange}
      />
    );
  }

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={(e) => onChange(e.target.value)}
      onKeyDown={handleEnterBlur}
      placeholder={field.placeholder}
      style={inputDarkStyle}
    />
  );
}

function MetadataReadCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        padding: "14px 16px",
        borderRadius: 16,
        border: "1px solid rgba(167,139,78,0.14)",
        background:
          "linear-gradient(180deg, rgba(27,23,18,0.95) 0%, rgba(14,15,18,0.98) 100%)",
        display: "grid",
        gap: 6,
      }}
    >
      <div
        style={{
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "#b89c63",
          fontWeight: 800,
        }}
      >
        {label}
      </div>
      <div style={{ color: "#f6efe2", lineHeight: 1.55, fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function NarrativeRelationCard({
  item,
  onOpenEntity,
  entityTypes,
}: {
  item: NarrativeRelationItem;
  onOpenEntity: (id: string) => void;
  entityTypes: EntityTypeDefinition[];
}) {
  const Icon = getEntityTypeIcon(item.otherEntity.type);
  const accent = getTypeColor(item.otherEntity.type, entityTypes);

  return (
    <button
      type="button"
      onClick={() => onOpenEntity(item.otherEntity.id)}
      style={{
        width: "100%",
        textAlign: "left",
        padding: "14px 16px",
        borderRadius: 16,
        border: "1px solid rgba(167,139,78,0.16)",
        background:
          "linear-gradient(180deg, rgba(25,23,19,0.96) 0%, rgba(13,15,18,0.98) 100%)",
        color: "#f8fafc",
        display: "grid",
        gap: 8,
        cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          style={{
            width: 28,
            height: 28,
            borderRadius: 10,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: `${accent}22`,
            color: accent,
            border: `1px solid ${accent}33`,
            flexShrink: 0,
          }}
        >
          <Icon size={15} />
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: "#f7f2e8", fontWeight: 800, lineHeight: 1.4 }}>
            {item.label} <span style={{ color: accent }}>{item.otherEntity.name}</span>
          </div>
          <div style={{ color: "#9fb0c7", fontSize: 12 }}>
            {getEntityTypeLabel(item.otherEntity.type, entityTypes)}
            {item.otherEntity.shortDescription ? ` · ${item.otherEntity.shortDescription}` : ""}
          </div>
        </div>
      </div>
    </button>
  );
}

export default function EntityEditor({
  entityTypes,
  entities,
  relations,
  selectedEntity,
  newTag,
  onUpdateEntity,
  onUpdateMetadataField,
  onNewTagChange,
  onAddTag,
  onRemoveTag,
  onDuplicateEntity,
  onDeleteEntity,
  onOpenEntity,
  onCenterInGraph,
}: EntityEditorProps) {
  const [mode, setMode] = useState<EditorMode>("read");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const accentColor = getTypeColor(selectedEntity.type, entityTypes);
  const typeLabel = getEntityTypeLabel(selectedEntity.type, entityTypes);
  const TypeIcon = getEntityTypeIcon(selectedEntity.type);
  const metadataFields = getMetadataFieldsForEntityType(selectedEntity.type, entityTypes);
  const metadata = selectedEntity.metadata ?? {};

  const entityMap = useMemo(
    () => new Map(entities.map((entity) => [entity.id, entity] as const)),
    [entities]
  );

  const metadataPreview = useMemo(() => {
    return metadataFields
      .map((field) => ({ field, value: metadata[field.key] ?? "" }))
      .filter((item) => item.value.trim().length > 0);
  }, [metadata, metadataFields]);

  const outgoingRelations = useMemo<NarrativeRelationItem[]>(() => {
    const items: NarrativeRelationItem[] = [];

    relations
      .filter((relation) => relation.fromEntityId === selectedEntity.id)
      .forEach((relation) => {
        const otherEntity = entityMap.get(relation.toEntityId);
        if (!otherEntity) return;

        items.push({
          relation,
          direction: "outgoing",
          otherEntity,
          label: relation.type,
        });
      });

    return items.sort((a, b) => a.label.localeCompare(b.label, "it", { sensitivity: "base" }));
  }, [entityMap, relations, selectedEntity.id]);

  const incomingRelations = useMemo<NarrativeRelationItem[]>(() => {
    const items: NarrativeRelationItem[] = [];

    relations
      .filter((relation) => relation.toEntityId === selectedEntity.id)
      .forEach((relation) => {
        const otherEntity = entityMap.get(relation.fromEntityId);
        if (!otherEntity) return;

        items.push({
          relation,
          direction: "incoming",
          otherEntity,
          label: relation.inverseType?.trim() || relation.type,
        });
      });

    return items.sort((a, b) => a.label.localeCompare(b.label, "it", { sensitivity: "base" }));
  }, [entityMap, relations, selectedEntity.id]);

  const timelineEntries = useMemo(() => {
    const entries: Array<{ label: string; value: string }> = [];
    const anno = metadata.anno?.trim();
    const epoca = metadata.epoca?.trim();
    const ordine = metadata.ordineCronologico?.trim();
    const stato = metadata.stato?.trim();

    if (anno) entries.push({ label: "Anno", value: anno });
    if (epoca) entries.push({ label: "Epoca", value: epoca });
    if (ordine) entries.push({ label: "Ordine cronologico", value: ordine });
    if (stato) entries.push({ label: "Stato temporale", value: stato });

    if (entries.length === 0) {
      entries.push({ label: "Creato", value: new Date(selectedEntity.createdAt).toLocaleString("it-IT") });
      entries.push({ label: "Aggiornato", value: new Date(selectedEntity.updatedAt).toLocaleString("it-IT") });
    }

    return entries;
  }, [metadata, selectedEntity.createdAt, selectedEntity.updatedAt]);

  async function handleImageSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingImage(true);
      const image = await readFileAsDataURL(file);
      onUpdateEntity({ image });
    } catch {
      window.alert("Impossibile leggere l'immagine selezionata.");
    } finally {
      setIsUploadingImage(false);
      event.target.value = "";
    }
  }

  function handleTypeChange(nextType: EntityType) {
    if (nextType === selectedEntity.type) return;

    onUpdateEntity({
      type: nextType,
      metadata: remapMetadataForType(selectedEntity.metadata, nextType, entityTypes),
    });
  }

  return (
    <div
      style={{
        ...panelStyle,
        border: "1px solid rgba(167,139,78,0.18)",
        background:
          "radial-gradient(circle at top left, rgba(102,126,72,0.09), transparent 24%), linear-gradient(180deg, rgba(31,26,20,0.98) 0%, rgba(11,13,17,0.99) 100%)",
        boxShadow: "0 20px 48px rgba(0,0,0,0.28)",
        display: "grid",
        gap: 18,
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageSelected}
        style={{ display: "none" }}
      />

      <div
        style={{
          ...cardStyle,
          padding: 0,
          overflow: "hidden",
          border: `1px solid ${accentColor}33`,
          background:
            selectedEntity.image
              ? `linear-gradient(180deg, rgba(16,16,16,0.18) 0%, rgba(10,10,10,0.82) 100%), url(${selectedEntity.image}) center/cover`
              : "linear-gradient(135deg, rgba(57,49,33,0.92) 0%, rgba(26,31,24,0.92) 55%, rgba(12,15,18,0.96) 100%)",
        }}
      >
        <div
          style={{
            padding: "22px",
            background:
              "linear-gradient(180deg, rgba(9,10,12,0.18) 0%, rgba(9,10,12,0.78) 32%, rgba(9,10,12,0.96) 100%)",
            display: "grid",
            gap: 18,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", gap: 16, alignItems: "flex-start", minWidth: 0, flex: 1 }}>
              <div
                style={{
                  width: 62,
                  height: 62,
                  borderRadius: 18,
                  background: `${accentColor}22`,
                  border: `1px solid ${accentColor}44`,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: accentColor,
                  boxShadow: `0 16px 32px ${accentColor}22`,
                  flexShrink: 0,
                }}
              >
                <TypeIcon size={28} />
              </div>

              <div style={{ minWidth: 0, flex: 1, display: "grid", gap: 8 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 10px",
                      borderRadius: 999,
                      background: `${accentColor}20`,
                      color: accentColor,
                      border: `1px solid ${accentColor}33`,
                      fontSize: 12,
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {typeLabel}
                  </span>
                  <span style={{ color: "#cbb58a", fontSize: 12, fontWeight: 700 }}>
                    Ultima modifica · {new Date(selectedEntity.updatedAt).toLocaleString("it-IT")}
                  </span>
                </div>

                {mode === "edit" ? (
                  <input
                    value={selectedEntity.name}
                    onChange={(e) => onUpdateEntity({ name: e.target.value })}
                    onBlur={(e) => onUpdateEntity({ name: e.target.value })}
                    style={{
                      ...inputStyle,
                      fontSize: 28,
                      fontWeight: 800,
                      padding: "10px 14px",
                    }}
                  />
                ) : (
                  <h2
                    style={{
                      margin: 0,
                      fontSize: 30,
                      lineHeight: 1.1,
                      color: "#f7f2e8",
                      textShadow: "0 6px 24px rgba(0,0,0,0.3)",
                    }}
                  >
                    {selectedEntity.name}
                  </h2>
                )}

                {mode === "edit" ? (
                  <textarea
                    value={selectedEntity.shortDescription}
                    onChange={(e) => onUpdateEntity({ shortDescription: e.target.value })}
                    onBlur={(e) => onUpdateEntity({ shortDescription: e.target.value })}
                    rows={2}
                    style={{ ...textareaStyle, minHeight: 72 }}
                    placeholder="Descrizione breve o pitch dell'entità"
                  />
                ) : selectedEntity.shortDescription ? (
                  <p style={{ margin: 0, color: "#e3d6bf", fontSize: 15, lineHeight: 1.65, maxWidth: 900 }}>
                    {selectedEntity.shortDescription}
                  </p>
                ) : null}

                {selectedEntity.tags.length > 0 ? (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {selectedEntity.tags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "7px 10px",
                          borderRadius: 999,
                          border: "1px solid rgba(203,181,138,0.22)",
                          background: "rgba(30,27,23,0.72)",
                          color: "#f3e9d4",
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        <Tag size={12} />
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setMode(mode === "read" ? "edit" : "read")} style={contextualActionButtonStyle}>
                <uiIcons.edit size={15} />
                {mode === "read" ? "Modifica" : "Chiudi modifica"}
              </button>
              <button type="button" onClick={onCenterInGraph} style={contextualActionButtonStyle}>
                <Waypoints size={15} />
                Centra nel grafo
              </button>
              <button type="button" onClick={onDuplicateEntity} style={contextualActionButtonStyle}>
                <uiIcons.duplicate size={15} />
                Duplica
              </button>
              <button type="button" onClick={onDeleteEntity} style={{ ...dangerButtonStyle, padding: "10px 12px", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 8 }}>
                <uiIcons.delete size={15} />
                Elimina
              </button>
            </div>
          </div>

          {mode === "edit" ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1.2fr) minmax(220px, 0.8fr)",
                gap: 14,
              }}
            >
              <div>
                <label style={fieldLabelStyle}>Tipo</label>
                <select
                  value={selectedEntity.type}
                  onChange={(e) => handleTypeChange(e.target.value)}
                  style={inputStyle}
                >
                  {entityTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={fieldLabelStyle}>Immagine / cover</label>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button type="button" style={primaryButtonStyle} onClick={() => fileInputRef.current?.click()}>
                    {isUploadingImage ? "Caricamento..." : "Carica immagine"}
                  </button>
                  {selectedEntity.image ? (
                    <button type="button" style={ghostButtonStyle} onClick={() => onUpdateEntity({ image: undefined })}>
                      Rimuovi immagine
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <CollapsibleSection
        title="Descrizione"
        accentColor={accentColor}
        icon={<ScrollText size={16} color={accentColor} />}
      >
        {mode === "edit" ? (
          <textarea
            value={selectedEntity.notes}
            onChange={(e) => onUpdateEntity({ notes: e.target.value })}
            onBlur={(e) => onUpdateEntity({ notes: e.target.value })}
            placeholder="Note estese, dettagli di lore, scene, storia, appunti sparsi..."
            rows={8}
            style={textareaStyle}
          />
        ) : (
          <div
            style={{
              color: selectedEntity.notes ? "#e7dcc8" : "#9fb0c7",
              lineHeight: 1.8,
              whiteSpace: "pre-wrap",
            }}
          >
            {selectedEntity.notes || "Nessuna nota disponibile."}
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title="Metadati custom"
        accentColor={accentColor}
        icon={<Sparkles size={16} color={accentColor} />}
        rightSlot={
          <span style={{ color: "#b89c63", fontSize: 12, fontWeight: 700 }}>
            {metadataPreview.length} compilati
          </span>
        }
      >
        {metadataFields.length === 0 ? (
          <div style={{ color: "#9fb0c7" }}>Questo tipo di entità non ha ancora campi custom.</div>
        ) : mode === "edit" ? (
          <div style={{ display: "grid", gap: 14 }}>
            {metadataFields.map((field) => (
              <div key={field.key} style={{ display: "grid", gap: 8 }}>
                <label style={fieldLabelStyle}>{field.label}</label>
                {renderMetadataInput({
                  field,
                  value: metadata[field.key] ?? "",
                  selectedEntity,
                  entities,
                  entityTypes,
                  onChange: (value, options) => onUpdateMetadataField(field.key, value, options),
                })}
              </div>
            ))}
          </div>
        ) : metadataPreview.length > 0 ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            {metadataPreview.map(({ field, value }) => (
              <MetadataReadCard key={field.key} label={field.label} value={value} />
            ))}
          </div>
        ) : (
          <div style={{ color: "#9fb0c7" }}>Nessun metadato compilato.</div>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title="Relazioni in uscita"
        accentColor={accentColor}
        icon={<Link2 size={16} color={accentColor} />}
      >
        {outgoingRelations.length > 0 ? (
          <div style={{ display: "grid", gap: 10 }}>
            {outgoingRelations.map((item) => (
              <NarrativeRelationCard
                key={item.relation.id}
                item={item}
                onOpenEntity={onOpenEntity}
                entityTypes={entityTypes}
              />
            ))}
          </div>
        ) : (
          <div style={{ color: "#9fb0c7" }}>Nessuna relazione in uscita.</div>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title="Relazioni in entrata"
        accentColor={accentColor}
        icon={<uiIcons.relations size={16} color={accentColor} />}
      >
        {incomingRelations.length > 0 ? (
          <div style={{ display: "grid", gap: 10 }}>
            {incomingRelations.map((item) => (
              <NarrativeRelationCard
                key={item.relation.id}
                item={item}
                onOpenEntity={onOpenEntity}
                entityTypes={entityTypes}
              />
            ))}
          </div>
        ) : (
          <div style={{ color: "#9fb0c7" }}>Nessuna relazione in entrata.</div>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title="Timeline / cronologia"
        accentColor={accentColor}
        icon={<uiIcons.timeline size={16} color={accentColor} />}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
          }}
        >
          {timelineEntries.map((entry) => (
            <MetadataReadCard key={entry.label} label={entry.label} value={entry.value} />
          ))}
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Tag e immagini"
        accentColor={accentColor}
        icon={<Camera size={16} color={accentColor} />}
      >
        <div style={{ display: "grid", gap: 16 }}>
          <div>
            <div style={{ ...fieldLabelStyle, marginBottom: 10 }}>Tag</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              {selectedEntity.tags.length > 0 ? (
                selectedEntity.tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => onRemoveTag(tag)}
                    style={removableTagStyle()}
                  >
                    {tag} ×
                  </button>
                ))
              ) : (
                <div style={{ color: "#9fb0c7" }}>Nessun tag assegnato.</div>
              )}
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
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
                style={{ ...inputDarkStyle, minWidth: 220, flex: "1 1 240px" }}
              />
              <button type="button" onClick={onAddTag} style={primaryButtonStyle}>
                Aggiungi tag
              </button>
            </div>
          </div>

          <div>
            <div style={{ ...fieldLabelStyle, marginBottom: 10 }}>Immagine</div>
            {selectedEntity.image ? (
              <div style={{ display: "grid", gap: 12 }}>
                <img
                  src={selectedEntity.image}
                  alt={selectedEntity.name}
                  style={{
                    width: "100%",
                    maxHeight: 320,
                    objectFit: "cover",
                    borderRadius: 18,
                    border: "1px solid rgba(167,139,78,0.18)",
                  }}
                />
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button type="button" style={ghostButtonStyle} onClick={() => fileInputRef.current?.click()}>
                    <ImagePlus size={15} style={{ marginRight: 8 }} />
                    Sostituisci immagine
                  </button>
                  <button type="button" style={ghostButtonStyle} onClick={() => onUpdateEntity({ image: undefined })}>
                    Rimuovi immagine
                  </button>
                </div>
              </div>
            ) : (
              <div
                style={{
                  padding: "18px",
                  borderRadius: 18,
                  border: "1px dashed rgba(167,139,78,0.28)",
                  background: "rgba(28,24,20,0.65)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ color: "#d7c9ad" }}>Aggiungi una cover o un riferimento visivo.</div>
                <button type="button" style={primaryButtonStyle} onClick={() => fileInputRef.current?.click()}>
                  {isUploadingImage ? "Caricamento..." : "Carica immagine"}
                </button>
              </div>
            )}
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
}
