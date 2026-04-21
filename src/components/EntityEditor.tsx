import { useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  ImagePlus,
  Link2,
  ScrollText,
  Shield,
  Sparkles,
  Tag,
  Waypoints,
} from "lucide-react";
import { UI_TEXT } from "../config";
import { useViewportWidth } from "../hooks/useViewportWidth";
import EntityTypeIcon from "./EntityTypeIcon";
import {
  cinematicMotion,
  cinematicTypography,
  dangerButtonStyle,
  ghostButtonStyle,
  inputDarkStyle,
  inputStyle,
  modeButtonStyle,
  primaryButtonStyle,
  removableTagStyle,
  textareaStyle,
} from "../styles";
import type {
  DndStats,
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
import {
  deleteImageAssetByRef,
  resolveImageRefToSrc,
  saveImageFileAsAssetRef,
} from "../utils/imageStorage";

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

type MetadataPreviewItem = {
  field: MetadataFieldDefinition;
  value: string;
};

type MetadataGroupId = "identity" | "connections" | "context" | "details";

type MetadataGroup<T> = {
  id: MetadataGroupId;
  label: string;
  description: string;
  items: T[];
};

type DndStatStringKey = Exclude<keyof DndStats, "enabled">;

const fieldLabelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: "6px",
  color: cinematicTypography.inkMuted,
  fontSize: "11px",
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const contextualActionButtonStyle: React.CSSProperties = {
  ...ghostButtonStyle,
  padding: "10px 12px",
  fontSize: "13px",
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.04)",
  color: cinematicTypography.ink,
};

const abilityFields: Array<{ key: DndStatStringKey; label: string }> = [
  { key: "forza", label: "FOR" },
  { key: "destrezza", label: "DES" },
  { key: "costituzione", label: "COS" },
  { key: "intelligenza", label: "INT" },
  { key: "saggezza", label: "SAG" },
  { key: "carisma", label: "CAR" },
];

const coreStatFields: Array<{ key: DndStatStringKey; label: string; placeholder: string }> = [
  { key: "livello", label: "Livello", placeholder: "Es. 5" },
  { key: "classe", label: "Classe", placeholder: "Es. Guerriero 5" },
  { key: "ca", label: "CA", placeholder: "Es. 17" },
  { key: "puntiFerita", label: "Punti ferita", placeholder: "Es. 38" },
  { key: "velocita", label: "Velocità", placeholder: "Es. 9 m" },
  { key: "iniziativa", label: "Iniziativa", placeholder: "Es. +3" },
  { key: "bonusCompetenza", label: "Bonus competenza", placeholder: "Es. +3" },
  { key: "dadoVita", label: "Dado vita", placeholder: "Es. 1d10" },
  { key: "challengeRating", label: "GS / CR", placeholder: "Es. 2" },
];

const longStatFields: Array<{ key: DndStatStringKey; label: string; placeholder: string }> = [
  { key: "armiEquipaggiate", label: "Armi equipaggiate", placeholder: "Es. Spadone + arco corto" },
  { key: "equipaggiamento", label: "Equipaggiamento", placeholder: "Es. Scudo, pozioni, focus arcano" },
  { key: "competenze", label: "Competenze", placeholder: "Es. Atletica, Percezione, Furtività" },
  { key: "sensi", label: "Sensi", placeholder: "Es. Scurovisione 18 m" },
  { key: "linguaggi", label: "Linguaggi", placeholder: "Es. Comune, Elfico" },
];

const metadataGroupMeta: Record<MetadataGroupId, { label: string; description: string }> = {
  identity: {
    label: "Identità",
    description: "Ruolo, natura e tratti che definiscono subito l'entità.",
  },
  connections: {
    label: "Appartenenze e legami",
    description: "Affiliazioni, casate, figure chiave e legami ricorrenti.",
  },
  context: {
    label: "Spazio e tempo",
    description: "Contesto geografico, temporale o storico in cui si colloca.",
  },
  details: {
    label: "Dettagli aggiuntivi",
    description: "Informazioni secondarie o specialistiche ancora utili in consultazione.",
  },
};

function classifyMetadataGroup(field: MetadataFieldDefinition): MetadataGroupId {
  const normalized = `${field.key} ${field.label}`.toLowerCase();

  if (
    /(razza|classe|status|stato sociale|titolo|ruolo|professione|allineamento|specie|tipo|ideologia|rank|rango)/.test(
      normalized
    )
  ) {
    return "identity";
  }

  if (
    /(fazione|famiglia|casata|casato|leader|allea|nemic|appart|figli|padre|madre|mentore|ordine|culto|governa|sovrano|gruppo)/.test(
      normalized
    )
  ) {
    return "connections";
  }

  if (
    /(luogo|regione|territorio|zona|citt|villaggio|continente|paese|clima|origine|residenza|dimora|nascita|anno|epoca|era|cronolog|tempo|data|storia|scenario|popolazione|pericolo)/.test(
      normalized
    )
  ) {
    return "context";
  }

  return "details";
}

function groupMetadataItems<T extends { field: MetadataFieldDefinition }>(items: T[]): Array<MetadataGroup<T>> {
  const buckets = new Map<MetadataGroupId, T[]>();

  items.forEach((item) => {
    const groupId = classifyMetadataGroup(item.field);
    const groupItems = buckets.get(groupId) ?? [];
    groupItems.push(item);
    buckets.set(groupId, groupItems);
  });

  return (["identity", "connections", "context", "details"] as MetadataGroupId[])
    .map((id) => ({
      id,
      label: metadataGroupMeta[id].label,
      description: metadataGroupMeta[id].description,
      items: buckets.get(id) ?? [],
    }))
    .filter((group) => group.items.length > 0);
}

function normalizeStatsPatch(stats: DndStats | undefined): DndStats | undefined {
  if (!stats) return undefined;

  const next: Partial<Record<DndStatStringKey, string>> & Pick<DndStats, "enabled"> = {};
  if (typeof stats.enabled === "boolean") {
    next.enabled = stats.enabled;
  }

  (Object.entries(stats) as Array<[keyof DndStats, DndStats[keyof DndStats]]>).forEach(([key, value]) => {
    if (key === "enabled") return;
    if (typeof value !== "string") return;
    const normalized = value.trim();
    if (normalized) {
      next[key] = normalized;
    }
  });

  return Object.keys(next).length > 0 ? next : undefined;
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
        paddingTop: 8,
        borderTop: `1px solid ${open ? `${accentColor}30` : "rgba(255,255,255,0.08)"}`,
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
          padding: "6px 0 10px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: cinematicTypography.inkStrong,
          textAlign: "left",
          transition: cinematicMotion.transition,
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
              boxShadow: `0 0 18px ${accentColor}35`,
            }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
            {icon}
            <span
              style={{
                fontSize: "16px",
                fontWeight: 800,
                color: cinematicTypography.inkStrong,
                fontFamily: cinematicTypography.displayFont,
                letterSpacing: "0.01em",
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
            padding: "2px 0 0",
            display: "grid",
            gap: "16px",
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

  const filteredEntities = useMemo(() => {
    const allowedTypes = field.allowedEntityTypes ?? [];
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
  }, [entities, field.allowedEntityTypes, selectedEntity.id, value]);

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
        padding: "0 16px 0 0",
        borderRight: "1px solid rgba(255,255,255,0.08)",
        display: "grid",
        gap: 7,
      }}
    >
      <div
        style={{
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: cinematicTypography.inkSoft,
          fontWeight: 800,
        }}
      >
        {label}
      </div>
      <div
        style={{
          color: cinematicTypography.inkStrong,
          lineHeight: 1.6,
          fontWeight: 600,
          fontSize: 15,
        }}
      >
        {value}
      </div>
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
  const accent = getTypeColor(item.otherEntity.type, entityTypes);

  return (
    <button
      type="button"
      onClick={() => onOpenEntity(item.otherEntity.id)}
      style={{
        width: "100%",
        textAlign: "left",
        padding: "14px 0",
        borderRadius: 0,
        border: "none",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        background: "transparent",
        color: cinematicTypography.inkStrong,
        display: "grid",
        gap: 8,
        cursor: "pointer",
        transition: cinematicMotion.transition,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          style={{
            width: 28,
            height: 28,
            borderRadius: 12,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: `${accent}18`,
            color: accent,
            border: `1px solid ${accent}30`,
            flexShrink: 0,
          }}
        >
          <EntityTypeIcon type={item.otherEntity.type} size={15} />
        </span>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              color: cinematicTypography.inkStrong,
              fontWeight: 800,
              lineHeight: 1.4,
              fontFamily: cinematicTypography.displayFont,
              fontSize: 17,
            }}
          >
            {item.label} <span style={{ color: accent }}>{item.otherEntity.name}</span>
          </div>
          <div style={{ color: cinematicTypography.inkMuted, fontSize: 12 }}>
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
  const viewportWidth = useViewportWidth();
  const isNarrowEditor = viewportWidth < 1120;
  const isCompactEditor = viewportWidth < 820;
  const [mode, setMode] = useState<EditorMode>("read");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [resolvedImageSrc, setResolvedImageSrc] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const activeObjectUrlRef = useRef<string | null>(null);

  const accentColor = getTypeColor(selectedEntity.type, entityTypes);
  const typeLabel = getEntityTypeLabel(selectedEntity.type, entityTypes);
  const TypeIcon = getEntityTypeIcon(selectedEntity.type);
  const metadataFields = getMetadataFieldsForEntityType(selectedEntity.type, entityTypes);
  const metadata = useMemo(
    () => selectedEntity.metadata ?? {},
    [selectedEntity.metadata]
  );
  const stats = selectedEntity.stats;
  const statsEnabled = Boolean(stats?.enabled);

  function getStatValue(fieldKey: DndStatStringKey): string {
    const value = stats?.[fieldKey];
    return typeof value === "string" ? value : "";
  }

  useEffect(() => {
    let isCancelled = false;

    void (async () => {
      try {
        const nextSrc = await resolveImageRefToSrc(selectedEntity.image);
        const safeNextSrc = nextSrc ?? "";

        if (isCancelled) {
          if (safeNextSrc.startsWith("blob:")) {
            URL.revokeObjectURL(safeNextSrc);
          }
          return;
        }

        if (activeObjectUrlRef.current && activeObjectUrlRef.current !== safeNextSrc) {
          URL.revokeObjectURL(activeObjectUrlRef.current);
          activeObjectUrlRef.current = null;
        }

        if (safeNextSrc.startsWith("blob:")) {
          activeObjectUrlRef.current = safeNextSrc;
        }

        setResolvedImageSrc(safeNextSrc);
      } catch (error) {
        console.error("Impossibile caricare l'immagine", error);
        if (!isCancelled) {
          setResolvedImageSrc("");
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [selectedEntity.image]);

  useEffect(() => {
    return () => {
      if (activeObjectUrlRef.current) {
        URL.revokeObjectURL(activeObjectUrlRef.current);
        activeObjectUrlRef.current = null;
      }
    };
  }, []);

  const entityMap = useMemo(
    () => new Map(entities.map((entity) => [entity.id, entity] as const)),
    [entities]
  );

  const metadataPreview = useMemo<MetadataPreviewItem[]>(() => {
    return metadataFields
      .map((field) => ({ field, value: metadata[field.key] ?? "" }))
      .filter((item) => item.value.trim().length > 0);
  }, [metadata, metadataFields]);

  const groupedMetadataPreview = useMemo(
    () => groupMetadataItems(metadataPreview),
    [metadataPreview]
  );

  const groupedMetadataFields = useMemo(
    () => groupMetadataItems(metadataFields.map((field) => ({ field }))),
    [metadataFields]
  );

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

  const narrativeTemplate = useMemo(() => {
    const pick = (...keys: string[]) =>
      keys.map((key) => metadata[key]?.trim() ?? "").find(Boolean) ?? "";

    const outgoingNamed = outgoingRelations.slice(0, 4).map((item) => `${item.label} ${item.otherEntity.name}`);
    const incomingNamed = incomingRelations.slice(0, 4).map((item) => `${item.label} ${item.otherEntity.name}`);
    const relationshipHighlights = [...outgoingNamed, ...incomingNamed].slice(0, 4);

    if (selectedEntity.type === "personaggio") {
      const ruolo = pick("ruolo");
      const razza = pick("razza");
      const status = pick("status");
      const fazione = pick("fazione");
      const casa = pick("abitaIn");

      return {
        lead:
          [selectedEntity.name, ruolo ? `è ${ruolo}` : "", razza ? `di stirpe ${razza}` : "", fazione ? `legato a ${fazione}` : ""]
            .filter(Boolean)
            .join(" ")
            .replace(" è", " è"),
        cards: [
          { label: "Ruolo", value: ruolo || "Non definito" },
          { label: "Razza", value: razza || "Non definita" },
          { label: "Status", value: status || "Non definito" },
          { label: "Base narrativa", value: casa || "Non definita" },
        ],
        relationshipHighlights,
      };
    }

    if (selectedEntity.type === "luogo") {
      const regione = pick("regione");
      const clima = pick("clima");
      const popolazione = pick("popolazione");
      const pericolo = pick("pericolo");

      return {
        lead:
          selectedEntity.shortDescription ||
          `${selectedEntity.name} appartiene a ${regione || "un'area non definita"} e presenta un clima ${clima || "non indicato"}.`,
        cards: [
          { label: "Regione", value: regione || "Non definita" },
          { label: "Clima", value: clima || "Non definito" },
          { label: "Popolazione", value: popolazione || "Non definita" },
          { label: "Pericolo", value: pericolo || "Non definito" },
        ],
        relationshipHighlights,
      };
    }

    if (selectedEntity.type === "evento") {
      const anno = pick("anno");
      const epoca = pick("epoca");
      const stato = pick("stato");
      const luogo = pick("luogo");

      return {
        lead:
          selectedEntity.shortDescription ||
          `${selectedEntity.name} si colloca ${anno ? `nell'anno ${anno}` : "in una data non definita"}${epoca ? `, durante ${epoca}` : ""}.`,
        cards: [
          { label: "Anno", value: anno || "Non definito" },
          { label: "Epoca", value: epoca || "Non definita" },
          { label: "Stato", value: stato || "Non definito" },
          { label: "Luogo", value: luogo || "Non definito" },
        ],
        relationshipHighlights,
      };
    }

    if (selectedEntity.type === "fazione") {
      const leader = pick("leader");
      const territorio = pick("territorio");
      const ideologia = pick("ideologia");
      const risorse = pick("risorse");

      return {
        lead:
          selectedEntity.shortDescription ||
          `${selectedEntity.name} opera ${territorio ? `su ${territorio}` : "senza territorio definito"}${leader ? ` sotto la guida di ${leader}` : ""}.`,
        cards: [
          { label: "Leader", value: leader || "Non definito" },
          { label: "Territorio", value: territorio || "Non definito" },
          { label: "Ideologia", value: ideologia || "Non definita" },
          { label: "Risorse", value: risorse || "Non definite" },
        ],
        relationshipHighlights,
      };
    }

    return {
      lead: selectedEntity.shortDescription || "Nessun sommario narrativo disponibile.",
      cards: metadataPreview.slice(0, 4).map(({ field, value }) => ({
        label: field.label,
        value,
      })),
      relationshipHighlights,
    };
  }, [incomingRelations, metadata, metadataPreview, outgoingRelations, selectedEntity.name, selectedEntity.shortDescription, selectedEntity.type]);

  const relationSections = [
    {
      id: "outgoing",
      label: "In uscita",
      caption: "Legami generati o dichiarati da questa entità.",
      emptyText: "Nessuna relazione in uscita.",
      total: outgoingRelations.length,
      items: outgoingRelations.slice(0, 6),
    },
    {
      id: "incoming",
      label: "In entrata",
      caption: "Legami che convergono su questa entità.",
      emptyText: "Nessuna relazione in entrata.",
      total: incomingRelations.length,
      items: incomingRelations.slice(0, 6),
    },
  ] as const;

  const workspaceSummaryCards = [
    {
      label: "Relazioni",
      value: String(outgoingRelations.length + incomingRelations.length),
      helper:
        outgoingRelations.length + incomingRelations.length > 0
          ? `${outgoingRelations.length} in uscita · ${incomingRelations.length} in entrata`
          : "Nessun legame ancora definito",
    },
    {
      label: "Metadati",
      value: String(metadataPreview.length),
      helper:
        metadataPreview.length > 0
          ? metadataPreview
              .slice(0, 2)
              .map((item) => item.field.label)
              .join(" · ")
          : "Campi custom ancora vuoti",
    },
    {
      label: "Timeline",
      value: timelineEntries[0]?.value ?? "N/A",
      helper: timelineEntries[0]?.label ?? "Nessun riferimento temporale",
    },
  ];

  const visibleHeaderTags = mode === "edit" ? selectedEntity.tags : selectedEntity.tags.slice(0, 6);
  const hiddenHeaderTagCount = Math.max(0, selectedEntity.tags.length - visibleHeaderTags.length);
  const editorStatusLabel = mode === "edit" ? "Modifica attiva" : "Lettura focalizzata";
  const editorStatusDescription =
    mode === "edit"
      ? "Stai aggiornando contenuti e struttura della scheda."
      : "Stai leggendo la scheda con meno rumore visivo e più priorità narrativa.";

  const heroHighlights = useMemo(() => {
    const preferredCards = narrativeTemplate.cards.filter(
      (card) => card.value.trim() && !card.value.startsWith("Non ")
    );

    const highlights = [
      ...preferredCards.slice(0, 3),
      ...(timelineEntries[0] ? [timelineEntries[0]] : []),
      {
        label: "Relazioni attive",
        value:
          outgoingRelations.length + incomingRelations.length > 0
            ? `${outgoingRelations.length + incomingRelations.length} collegamenti`
            : "Nessuna ancora",
      },
    ];

    return highlights
      .filter(
        (item, index, array) =>
          array.findIndex(
            (candidate) =>
              candidate.label.toLowerCase() === item.label.toLowerCase() &&
              candidate.value.toLowerCase() === item.value.toLowerCase()
          ) === index
      )
      .slice(0, 5);
  }, [incomingRelations.length, narrativeTemplate.cards, outgoingRelations.length, timelineEntries]);

  async function handleImageSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const previousImageRef = selectedEntity.image;

    try {
      setIsUploadingImage(true);
      const image = await saveImageFileAsAssetRef(file);
      onUpdateEntity({ image });

      if (previousImageRef && previousImageRef !== image) {
        await deleteImageAssetByRef(previousImageRef);
      }
    } catch (error) {
      console.error(error);
      window.alert("Impossibile salvare l'immagine selezionata.");
    } finally {
      setIsUploadingImage(false);
      event.target.value = "";
    }
  }

  async function handleRemoveImage() {
    const previousImageRef = selectedEntity.image;
    setImageModalOpen(false);
    onUpdateEntity({ image: undefined });

    try {
      await deleteImageAssetByRef(previousImageRef);
    } catch (error) {
      console.error(error);
    }
  }

  function handleTypeChange(nextType: EntityType) {
    if (nextType === selectedEntity.type) return;

    onUpdateEntity({
      type: nextType,
      metadata: remapMetadataForType(selectedEntity.metadata, nextType, entityTypes),
    });
  }

  function handleEnableStats() {
    onUpdateEntity({ stats: { enabled: true } });
  }

  function handleDisableStats() {
    onUpdateEntity({ stats: undefined });
  }

  function updateStatField(fieldKey: DndStatStringKey, value: string) {
    const nextStats: DndStats = {
      ...(stats ?? {}),
      enabled: true,
      [fieldKey]: value,
    };

    onUpdateEntity({
      stats: normalizeStatsPatch(nextStats),
    });
  }

  return (
    <div
      style={{
        display: "grid",
        gap: 22,
        padding: "2px 0 10px",
        position: "relative",
        isolation: "isolate",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: "0 0 auto 0",
          height: 320,
          background:
            "radial-gradient(circle at top left, rgba(120,160,255,0.1), transparent 34%), radial-gradient(circle at 90% 0%, rgba(255,170,120,0.08), transparent 26%)",
          pointerEvents: "none",
          zIndex: -1,
          filter: "blur(16px)",
        }}
      />
      <div
        style={{
        display: "grid",
        gap: 16,
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
            padding: 0,
            overflow: "hidden",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            background:
              resolvedImageSrc
                ? `linear-gradient(180deg, rgba(10,14,22,0.12) 0%, rgba(8,10,16,0.48) 100%), url(${resolvedImageSrc}) center/cover`
                : "transparent",
          }}
        >
        <div
          style={{
            padding: "22px 0 18px",
            background:
              "linear-gradient(180deg, rgba(8,10,16,0.05) 0%, rgba(8,10,16,0.26) 44%, rgba(8,10,16,0.42) 100%)",
            display: "grid",
            gap: 16,
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "grid", gap: 4 }}>
                <div
                  style={{
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: cinematicTypography.gold,
                    fontWeight: 800,
                  }}
                >
                Modalità scheda
              </div>
              <div
                style={{
                  color: cinematicTypography.inkStrong,
                  fontWeight: 800,
                  fontFamily: cinematicTypography.displayFont,
                  fontSize: 18,
                }}
              >
                {editorStatusLabel}
              </div>
              <div style={{ color: cinematicTypography.inkMuted, fontSize: 13 }}>{editorStatusDescription}</div>
            </div>

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                paddingBottom: 4,
                borderBottom: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <button type="button" onClick={() => setMode("read")} style={modeButtonStyle(mode === "read")}>
                Lettura
              </button>
              <button type="button" onClick={() => setMode("edit")} style={modeButtonStyle(mode === "edit")}>
                Modifica
              </button>
            </div>
          </div>

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
                  background: `${accentColor}18`,
                  border: "1px solid rgba(255,255,255,0.08)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: accentColor,
                  boxShadow: `0 12px 28px rgba(0,0,0,0.22), 0 0 22px ${accentColor}20`,
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
                        background: "transparent",
                        color: accentColor,
                        border: `1px solid ${accentColor}28`,
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
                      fontSize: 30,
                      fontWeight: 800,
                      padding: "10px 14px",
                      fontFamily: cinematicTypography.displayFont,
                    }}
                  />
                ) : (
                  <h2
                    style={{
                      margin: 0,
                      fontSize: 34,
                      lineHeight: 1.1,
                      color: cinematicTypography.inkStrong,
                      textShadow: "0 6px 24px rgba(0,0,0,0.3)",
                      fontFamily: cinematicTypography.displayFont,
                      letterSpacing: "0.01em",
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
                  <p
                    style={{
                      margin: 0,
                      color: cinematicTypography.ink,
                      fontSize: 15,
                      lineHeight: 1.7,
                      maxWidth: 900,
                    }}
                  >
                    {selectedEntity.shortDescription}
                  </p>
                ) : null}

                {visibleHeaderTags.length > 0 ? (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {visibleHeaderTags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "6px 0",
                          borderRadius: 999,
                          border: "none",
                          color: cinematicTypography.inkStrong,
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        <Tag size={12} />
                        {tag}
                      </span>
                    ))}
                    {hiddenHeaderTagCount > 0 ? (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "6px 0",
                          borderRadius: 999,
                          border: "none",
                          color: cinematicTypography.inkMuted,
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        +{hiddenHeaderTagCount} tag
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "flex-end" }}>
              {mode === "read" ? (
                <button type="button" onClick={() => setMode("edit")} style={contextualActionButtonStyle}>
                  <uiIcons.edit size={15} />
                  Apri modifica
                </button>
              ) : null}
              <button type="button" onClick={onCenterInGraph} style={contextualActionButtonStyle}>
                <Waypoints size={15} />
                Centra nel grafo
              </button>
              {mode === "edit" ? (
                <>
                  <button type="button" onClick={onDuplicateEntity} style={contextualActionButtonStyle}>
                    <uiIcons.duplicate size={15} />
                    Duplica
                  </button>
                  <button
                    type="button"
                    onClick={onDeleteEntity}
                    style={{
                      ...dangerButtonStyle,
                      padding: "10px 12px",
                      fontSize: 13,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <uiIcons.delete size={15} />
                    Elimina
                  </button>
                </>
              ) : null}
            </div>
          </div>

          {mode === "edit" ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isCompactEditor ? "1fr" : "minmax(0, 1.2fr) minmax(220px, 0.8fr)",
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
                  {resolvedImageSrc ? (
                    <button type="button" style={ghostButtonStyle} onClick={() => { void handleRemoveImage(); }}>
                      Rimuovi immagine
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {mode === "read" ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isNarrowEditor ? "1fr" : "minmax(0, 1.35fr) minmax(280px, 0.9fr)",
            gap: 24,
            paddingBottom: 4,
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div
            style={{
              display: "grid",
              gap: 14,
              paddingRight: isNarrowEditor ? 0 : 10,
            }}
          >
            <div style={{ display: "grid", gap: 6 }}>
              <div
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: cinematicTypography.inkSoft,
                  fontWeight: 800,
                }}
              >
                Colpo d'occhio
              </div>
              <div
                style={{
                  color: cinematicTypography.inkStrong,
                  fontSize: 28,
                  fontWeight: 800,
                  lineHeight: 1.18,
                  fontFamily: cinematicTypography.displayFont,
                }}
              >
                {selectedEntity.shortDescription || narrativeTemplate.lead}
              </div>
            </div>

            <div style={{ color: cinematicTypography.ink, lineHeight: 1.8, fontSize: 15 }}>
              {selectedEntity.notes?.trim()
                ? `${selectedEntity.notes.trim().slice(0, 260)}${selectedEntity.notes.trim().length > 260 ? "..." : ""}`
                : "Apri la sezione lore per aggiungere storia, dettagli o appunti narrativi estesi."}
            </div>

            {narrativeTemplate.relationshipHighlights.length > 0 ? (
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ ...fieldLabelStyle, marginBottom: 0 }}>Legami che emergono subito</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {narrativeTemplate.relationshipHighlights.map((item) => (
                    <span
                      key={item}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 999,
                        background: `${accentColor}16`,
                        border: `1px solid ${accentColor}30`,
                        color: cinematicTypography.inkStrong,
                        fontSize: 13,
                      }}
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div
            style={{
              display: "grid",
              gap: 12,
              paddingLeft: isNarrowEditor ? 0 : 18,
              borderLeft: isNarrowEditor ? "none" : "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div style={{ display: "grid", gap: 4 }}>
              <div
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: cinematicTypography.inkSoft,
                  fontWeight: 800,
                }}
              >
                Scheda rapida
              </div>
              <div style={{ color: cinematicTypography.inkMuted, fontSize: 13, lineHeight: 1.55 }}>
                I dettagli che aiutano a orientarsi subito dentro il mondo.
              </div>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
                {heroHighlights.map((item) => (
                  <div
                    key={`${item.label}-${item.value}`}
                    style={{
                      display: "grid",
                      gap: 4,
                      padding: "0 0 10px",
                      borderBottom: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                  <div
                    style={{
                        fontSize: 11,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        color: cinematicTypography.inkSoft,
                        fontWeight: 800,
                      }}
                    >
                    {item.label}
                  </div>
                  <div style={{ color: cinematicTypography.inkStrong, fontWeight: 700, lineHeight: 1.45 }}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 20,
          alignItems: "flex-start",
          paddingBottom: 8,
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div
          style={{
            minWidth: 220,
            display: "grid",
            gap: 6,
          }}
        >
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: cinematicTypography.inkSoft,
              fontWeight: 800,
            }}
          >
            Focus scheda
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: cinematicTypography.inkStrong,
              lineHeight: 1.15,
              fontFamily: cinematicTypography.displayFont,
            }}
          >
            {mode === "edit" ? "Aggiornamento in corso" : "Panoramica narrativa"}
          </div>
          <div style={{ color: cinematicTypography.inkMuted, fontSize: 12, lineHeight: 1.5 }}>
            {mode === "edit"
              ? "Tipo, cover, tag e metadati diventano modificabili direttamente."
              : "Le informazioni principali restano in evidenza; i dettagli secondari restano più discreti."}
          </div>
        </div>

        {workspaceSummaryCards.map((card) => (
          <div
            key={card.label}
            style={{
              paddingLeft: 18,
              borderLeft: "1px solid rgba(255,255,255,0.08)",
              display: "grid",
              gap: 6,
              minWidth: 170,
              flex: isCompactEditor ? "1 1 100%" : "0 1 180px",
            }}
          >
            <div
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: cinematicTypography.inkSoft,
                fontWeight: 800,
              }}
            >
              {card.label}
            </div>
            <div
              style={{
                fontSize: 24,
                fontWeight: 800,
                color: cinematicTypography.inkStrong,
                lineHeight: 1,
                fontFamily: cinematicTypography.displayFont,
              }}
            >
              {card.value}
            </div>
            <div style={{ color: cinematicTypography.inkMuted, fontSize: 12, lineHeight: 1.5 }}>
              {card.helper}
            </div>
          </div>
        ))}
      </div>

      <CollapsibleSection
        title="Lettura narrativa"
        accentColor={accentColor}
        icon={<Sparkles size={16} color={accentColor} />}
        rightSlot={
          <span style={{ color: "#b89c63", fontSize: 12, fontWeight: 700 }}>
            template {typeLabel.toLowerCase()}
          </span>
        }
      >
        <div
          style={{
            color: "#e7dcc8",
            lineHeight: 1.75,
            fontSize: 15,
          }}
        >
          {narrativeTemplate.lead}
        </div>

        {narrativeTemplate.cards.length > 0 ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            {narrativeTemplate.cards.map((card) => (
              <MetadataReadCard key={card.label} label={card.label} value={card.value} />
            ))}
          </div>
        ) : null}

        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ ...fieldLabelStyle, marginBottom: 0 }}>Legami chiave</div>
          {narrativeTemplate.relationshipHighlights.length > 0 ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {narrativeTemplate.relationshipHighlights.map((item) => (
                <span
                  key={item}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 999,
                    background: `${accentColor}16`,
                    border: `1px solid ${accentColor}30`,
                    color: "#e8eef8",
                    fontSize: 13,
                  }}
                >
                  {item}
                </span>
              ))}
            </div>
          ) : (
            <div style={{ color: "#9fb0c7" }}>Nessun legame narrativo evidenziato.</div>
          )}
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Lore e note"
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
        title="Dettagli del template"
        accentColor={accentColor}
        icon={<Sparkles size={16} color={accentColor} />}
        defaultOpen={mode === "edit" || metadataPreview.length > 0}
        rightSlot={
          <span style={{ color: "#b89c63", fontSize: 12, fontWeight: 700 }}>
            {metadataPreview.length} compilati
          </span>
        }
      >
        {metadataFields.length === 0 ? (
          <div style={{ color: "#9fb0c7" }}>Questo tipo di entità non ha ancora campi custom.</div>
        ) : mode === "edit" ? (
          <div style={{ display: "grid", gap: 18 }}>
            {groupedMetadataFields.map((group) => (
              <div
                key={group.id}
                style={{
                  display: "grid",
                  gap: 14,
                  paddingTop: "12px",
                  borderTop: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div style={{ display: "grid", gap: 4 }}>
                  <div style={{ color: "#f7f2e8", fontWeight: 800 }}>{group.label}</div>
                  <div style={{ color: "#9fb0c7", fontSize: 12, lineHeight: 1.5 }}>{group.description}</div>
                </div>

                <div style={{ display: "grid", gap: 14 }}>
                  {group.items.map(({ field }) => (
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
              </div>
            ))}
          </div>
        ) : metadataPreview.length > 0 ? (
          <div style={{ display: "grid", gap: 18 }}>
            {groupedMetadataPreview.map((group) => (
              <div
                key={group.id}
                style={{
                  display: "grid",
                  gap: 12,
                  paddingTop: "12px",
                  borderTop: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div style={{ display: "grid", gap: 4 }}>
                  <div style={{ color: "#f7f2e8", fontWeight: 800 }}>{group.label}</div>
                  <div style={{ color: "#9fb0c7", fontSize: 12, lineHeight: 1.5 }}>{group.description}</div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: 12,
                  }}
                >
                  {group.items.map(({ field, value }) => (
                    <MetadataReadCard key={field.key} label={field.label} value={value} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: "#9fb0c7" }}>Nessun metadato compilato.</div>
        )}
      </CollapsibleSection>


      <CollapsibleSection
        title="Statistiche D&D"
        accentColor={accentColor}
        icon={<Shield size={16} color={accentColor} />}
        defaultOpen={false}
      >
        {mode === "edit" ? (
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            {statsEnabled ? (
              <button type="button" onClick={handleDisableStats} style={ghostButtonStyle}>
                Disattiva sezione
              </button>
            ) : (
              <button type="button" onClick={handleEnableStats} style={primaryButtonStyle}>
                Attiva sezione
              </button>
            )}
          </div>
        ) : null}

        {!statsEnabled && mode !== "edit" ? (
          <div style={{ color: "#9fb0c7" }}>Nessuna scheda D&D attiva per questa entità.</div>
        ) : !statsEnabled && mode === "edit" ? (
          <div style={{ color: "#9fb0c7" }}>
            Attiva la sezione per compilare caratteristiche, CA, PF, equipaggiamento e altre stats.
          </div>
        ) : mode === "edit" ? (
          <div style={{ display: "grid", gap: 16 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 12,
              }}
            >
              {coreStatFields.map((field) => (
                <div key={field.key} style={{ display: "grid", gap: 8 }}>
                  <label style={fieldLabelStyle}>{field.label}</label>
                  <input
                    type="text"
                    value={getStatValue(field.key)}
                    onChange={(e) => updateStatField(field.key, e.target.value)}
                    onBlur={(e) => updateStatField(field.key, e.target.value)}
                    onKeyDown={handleEnterBlur}
                    placeholder={field.placeholder}
                    style={inputDarkStyle}
                  />
                </div>
              ))}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
                gap: 12,
              }}
            >
              {abilityFields.map((field) => (
                <div key={field.key} style={{ display: "grid", gap: 8 }}>
                  <label style={fieldLabelStyle}>{field.label}</label>
                  <input
                    type="text"
                    value={getStatValue(field.key)}
                    onChange={(e) => updateStatField(field.key, e.target.value)}
                    onBlur={(e) => updateStatField(field.key, e.target.value)}
                    onKeyDown={handleEnterBlur}
                    placeholder="Es. 14"
                    style={inputDarkStyle}
                  />
                </div>
              ))}
            </div>

            {longStatFields.map((field) => (
              <div key={field.key} style={{ display: "grid", gap: 8 }}>
                <label style={fieldLabelStyle}>{field.label}</label>
                <textarea
                  value={getStatValue(field.key)}
                  onChange={(e) => updateStatField(field.key, e.target.value)}
                  onBlur={(e) => updateStatField(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  rows={2}
                  style={{ ...textareaStyle, minHeight: 70 }}
                />
              </div>
            ))}

            <div style={{ display: "grid", gap: 8 }}>
              <label style={fieldLabelStyle}>Note scheda</label>
              <textarea
                value={stats?.note ?? ""}
                onChange={(e) => updateStatField("note", e.target.value)}
                onBlur={(e) => updateStatField("note", e.target.value)}
                placeholder="Es. capacità speciali, resistenze, immunità, appunti da combattimento"
                rows={4}
                style={textareaStyle}
              />
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: 12,
              }}
            >
              {coreStatFields.map((field) => {
                const rawValue = stats?.[field.key];
                const value = typeof rawValue === "string" ? rawValue.trim() : "";
                if (!value) return null;
                return <MetadataReadCard key={field.key} label={field.label} value={value} />;
              })}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isCompactEditor ? "repeat(3, minmax(0, 1fr))" : "repeat(6, minmax(0, 1fr))",
                gap: 10,
              }}
            >
              {abilityFields.map((field) => (
                <div
                  key={field.key}
                  style={{
                    padding: "10px 0",
                    borderBottom: "1px solid rgba(255,255,255,0.08)",
                    display: "grid",
                    gap: 6,
                    justifyItems: "center",
                  }}
                >
                  <div style={{ fontSize: 11, color: "#b89c63", fontWeight: 800 }}>{field.label}</div>
                  <div style={{ fontSize: 22, color: "#f6efe2", fontWeight: 800 }}>
                    {stats?.[field.key] || "—"}
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 12,
              }}
            >
              {longStatFields.map((field) => {
                const rawValue = stats?.[field.key];
                const value = typeof rawValue === "string" ? rawValue.trim() : "";
                if (!value) return null;
                return <MetadataReadCard key={field.key} label={field.label} value={value} />;
              })}
              {stats?.note?.trim() ? <MetadataReadCard label="Note scheda" value={stats.note} /> : null}
            </div>
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title="Relazioni chiave"
        accentColor={accentColor}
        icon={<Link2 size={16} color={accentColor} />}
        rightSlot={
          <span style={{ color: "#b89c63", fontSize: 12, fontWeight: 700 }}>
            {outgoingRelations.length + incomingRelations.length} totali
          </span>
        }
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 14,
          }}
        >
          {relationSections.map((section) => (
            <div
              key={section.id}
              style={{
                display: "grid",
                gap: 10,
                paddingTop: "12px",
                borderTop: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div style={{ display: "grid", gap: 4 }}>
                <div style={{ color: "#f7f2e8", fontWeight: 800 }}>{section.label}</div>
                <div style={{ color: "#9fb0c7", fontSize: 12 }}>{section.caption}</div>
              </div>

              {section.items.length > 0 ? (
                <div style={{ display: "grid", gap: 10 }}>
                  {section.items.map((item) => (
                    <NarrativeRelationCard
                      key={item.relation.id}
                      item={item}
                      onOpenEntity={onOpenEntity}
                      entityTypes={entityTypes}
                    />
                  ))}
                  {section.total > section.items.length ? (
                    <div style={{ color: "#9fb0c7", fontSize: 12 }}>
                      +{section.total - section.items.length} altre relazioni nel pannello laterale.
                    </div>
                  ) : null}
                </div>
              ) : (
                <div style={{ color: "#9fb0c7" }}>{section.emptyText}</div>
              )}
            </div>
          ))}
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Timeline / cronologia"
        accentColor={accentColor}
        icon={<uiIcons.timeline size={16} color={accentColor} />}
        defaultOpen={false}
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
        defaultOpen={false}
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
            {resolvedImageSrc ? (
              <div style={{ display: "grid", gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setImageModalOpen(true)}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: 0,
                    background: "transparent",
                    border: "none",
                    cursor: "zoom-in",
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      maxHeight: "70vh",
                      borderRadius: 18,
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: "rgba(255,255,255,0.04)",
                      overflow: "hidden",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 12,
                      backdropFilter: "blur(18px)",
                      WebkitBackdropFilter: "blur(18px)",
                    }}
                  >
                    <img
                      src={resolvedImageSrc}
                      alt={selectedEntity.name}
                      style={{
                        maxWidth: "100%",
                        maxHeight: "calc(70vh - 24px)",
                        width: "auto",
                        height: "auto",
                        display: "block",
                        borderRadius: 12,
                      }}
                    />
                  </div>
                </button>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button type="button" style={ghostButtonStyle} onClick={() => setImageModalOpen(true)}>
                    Apri grande
                  </button>
                  <button type="button" style={ghostButtonStyle} onClick={() => fileInputRef.current?.click()}>
                    <ImagePlus size={15} style={{ marginRight: 8 }} />
                    Sostituisci immagine
                  </button>
                  <button type="button" style={ghostButtonStyle} onClick={() => { void handleRemoveImage(); }}>
                    Rimuovi immagine
                  </button>
                </div>
              </div>
            ) : (
              <div
                style={{
                  padding: "18px",
                  borderRadius: 18,
                  border: "1px dashed rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.04)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                  backdropFilter: "blur(18px)",
                  WebkitBackdropFilter: "blur(18px)",
                }}
              >
                <div style={{ color: cinematicTypography.ink }}>
                  Aggiungi una cover o un riferimento visivo.
                </div>
                <button type="button" style={primaryButtonStyle} onClick={() => fileInputRef.current?.click()}>
                  {isUploadingImage ? "Caricamento..." : "Carica immagine"}
                </button>
              </div>
            )}
          </div>
        </div>
      </CollapsibleSection>
      {imageModalOpen && resolvedImageSrc ? (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setImageModalOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 2000,
            background: "rgba(3,6,10,0.88)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              maxWidth: "96vw",
              maxHeight: "92vh",
              display: "grid",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setImageModalOpen(false)} style={ghostButtonStyle}>
                Chiudi
              </button>
            </div>
            <div
              style={{
                background: "rgba(12,16,22,0.92)",
                border: "1px solid rgba(167,139,78,0.18)",
                borderRadius: 20,
                padding: 14,
                boxShadow: "0 24px 60px rgba(0,0,0,0.45)",
              }}
            >
              <img
                src={resolvedImageSrc}
                alt={selectedEntity.name}
                style={{
                  display: "block",
                  maxWidth: "calc(96vw - 28px)",
                  maxHeight: "calc(92vh - 90px)",
                  width: "auto",
                  height: "auto",
                  borderRadius: 12,
                }}
              />
            </div>
          </div>
        </div>
      ) : null}
      </div>
    </div>
  );
}
