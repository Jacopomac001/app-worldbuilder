import { useEffect, useMemo, useRef, useState } from "react";
import { MarkerType, type Edge, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { getEntityTypeIcon, uiIcons } from "./utils/icons";
import WorldDashboard from "./components/WorldDashboard";
import GraphView from "./components/GraphView";
import Sidebar from "./components/Sidebar";
import EntityEditor from "./components/EntityEditor";
import RelationsPanel from "./components/RelationsPanel";
import NewEntityForm from "./components/NewEntityForm";

import type {
  FocusedGraphFilter,
  GraphViewMode,
} from "./components/GraphPanel";

import {
  DEFAULT_RELATION_PRESET_INDEX,
  TIMELINE_STATUS_COLORS,
  UI_TEXT,
} from "./config";

import {
  ghostButtonStyle,
  metaPillStyle,
  pageContainerStyle,
  pageStyle,
  panelStyle,
  primaryButtonLargeStyle,
  purpleButtonLargeStyle,
  secondaryButtonLargeStyle,
  successButtonLargeStyle,
  timelineBadgeStyle,
  timelineItemStyle,
} from "./styles";

import {
  RELATION_PRESETS,
  getDefaultMetadata,
  getMetadataFieldDefinition,
  getSuggestedInverseRelationType,
  hasDuplicateEntityName,
  isSameMetadataRelationOrigin,
  normalizeEntityName,
  normalizeMetadata,
  normalizeMetadataValue,
  normalizeOptionalRelationType,
  normalizeRelationType,
  normalizeTag,
  normalizeText,
  remapMetadataForType,
} from "./utils/entity";

import { getLayoutedElements } from "./utils/layout";
import {
  initialEntities,
  initialRelations,
  ENTITIES_STORAGE_KEY,
  RELATIONS_STORAGE_KEY,
  NODE_WIDTH,
} from "./data";
import { useLocalStorageState } from "./hooks/useLocalStorageState";
import type {
  Entity,
  EntityType,
  EntityTypeDefinition,
  MetadataFieldDefinition,
  Relation,
  WorldData,
} from "./types";

type SortMode = "name-asc" | "type" | "lastModified-desc";

type TimelineEvent = {
  entity: Entity;
  anno: string;
  epoca: string;
  ordineCronologico: string;
  stato: string;
  parsedYear: number | null;
  parsedOrder: number | null;
};

type GraphNodeData = {
  label: string;
  name: string;
  typeLabel: string;
  shortDescription: string;
  iconGlyph: string;
  accentColor: string;
  isSelected?: boolean;
  isConnectedToSelection?: boolean;
  isDimmed?: boolean;
  level?: 0 | 1 | 2;
};

const ENTITY_TYPES_STORAGE_KEY = "worldbuilder_entity_types";

const DEFAULT_ENTITY_TYPES: EntityTypeDefinition[] = [
  {
    id: "luogo",
    label: "Luogo",
    color: "#3b82f6",
    builtIn: true,
    fields: [
      {
        key: "regione",
        label: "Regione",
        kind: "text",
        placeholder: "Es. Costa orientale",
      },
      {
        key: "clima",
        label: "Clima",
        kind: "text",
        placeholder: "Es. Tropicale umido",
      },
      {
        key: "popolazione",
        label: "Popolazione",
        kind: "text",
        placeholder: "Es. 12.000 abitanti",
      },
      {
        key: "pericolo",
        label: "Livello di pericolo",
        kind: "text",
        placeholder: "Es. Alto",
      },
    ],
  },
  {
    id: "personaggio",
    label: "Personaggio",
    color: "#f59e0b",
    builtIn: true,
    fields: [
      {
        key: "ruolo",
        label: "Ruolo",
        kind: "text",
        placeholder: "Es. Esploratore",
      },
      {
        key: "fazione",
        label: "Fazione",
        kind: "entity-reference",
        placeholder: "Es. Guardia d’Ambra",
        allowedEntityTypes: ["fazione"],
        relationType: "membro di",
        relationInverseType: "include",
        autoCreateTarget: false,
      },
      {
        key: "religione",
        label: "Religione",
        kind: "entity-reference",
        placeholder: "Es. Culto del Sole",
        allowedEntityTypes: ["religione"],
        relationType: "segue",
        relationInverseType: "ha come fedele",
        autoCreateTarget: true,
        autoCreateTargetType: "religione",
      },
      {
        key: "abitaIn",
        label: "Abita in",
        kind: "entity-reference",
        placeholder: "Es. Porto Nero",
        allowedEntityTypes: ["luogo"],
        relationType: "abita in",
        relationInverseType: "ospita",
        autoCreateTarget: false,
      },
      {
        key: "status",
        label: "Status",
        kind: "text",
        placeholder: "Es. Vivo / disperso",
      },
    ],
  },
  {
    id: "fazione",
    label: "Fazione",
    color: "#ef4444",
    builtIn: true,
    fields: [
      {
        key: "leader",
        label: "Leader",
        kind: "entity-reference",
        placeholder: "Es. Matriarca Sihra",
        allowedEntityTypes: ["personaggio"],
        relationType: "ha come leader",
        relationInverseType: "guida",
        autoCreateTarget: false,
      },
      {
        key: "territorio",
        label: "Territorio",
        kind: "entity-reference",
        placeholder: "Es. Paludi del sud",
        allowedEntityTypes: ["luogo"],
        relationType: "controlla",
        relationInverseType: "è controllato da",
        autoCreateTarget: false,
      },
      {
        key: "ideologia",
        label: "Ideologia",
        kind: "text",
        placeholder: "Es. Espansione rituale",
      },
      {
        key: "risorse",
        label: "Risorse",
        kind: "text",
        placeholder: "Es. Ambra, sale, bestie",
      },
    ],
  },
  {
    id: "oggetto",
    label: "Oggetto",
    color: "#10b981",
    builtIn: true,
    fields: [
      {
        key: "origine",
        label: "Origine",
        kind: "entity-reference",
        placeholder: "Es. Tempio Verde",
        allowedEntityTypes: ["luogo", "fazione", "personaggio"],
        relationType: "proviene da",
        relationInverseType: "ha originato",
        autoCreateTarget: false,
      },
      {
        key: "materiale",
        label: "Materiale",
        kind: "text",
        placeholder: "Es. Ossidiana",
      },
      {
        key: "potere",
        label: "Potere",
        kind: "textarea",
        placeholder: "Es. Visioni profetiche",
      },
      {
        key: "stato",
        label: "Stato",
        kind: "text",
        placeholder: "Es. Integro / spezzato",
      },
    ],
  },
  {
    id: "evento",
    label: "Evento",
    color: "#8b5cf6",
    builtIn: true,
    fields: [
      {
        key: "anno",
        label: "Anno",
        kind: "text",
        placeholder: "Es. -1200 oppure 432",
      },
      {
        key: "epoca",
        label: "Epoca",
        kind: "text",
        placeholder: "Es. Prima Era",
      },
      {
        key: "ordineCronologico",
        label: "Ordine cronologico",
        kind: "text",
        placeholder: "Es. 10, 20, 30",
      },
      {
        key: "stato",
        label: "Stato temporale",
        kind: "text",
        placeholder: "Es. antico, recente, in corso",
      },
      {
        key: "luogo",
        label: "Luogo",
        kind: "entity-reference",
        placeholder: "Es. Valle Rossa",
        allowedEntityTypes: ["luogo"],
        relationType: "si svolge in",
        relationInverseType: "è teatro di",
        autoCreateTarget: false,
      },
    ],
  },
];

function parseNumberLike(value: string | undefined): number | null {
  if (!value) return null;

  const cleaned = value.trim().replace(",", ".");
  if (!cleaned) return null;

  const direct = Number(cleaned);
  if (!Number.isNaN(direct)) return direct;

  const match = cleaned.match(/-?\d+(\.\d+)?/);
  if (!match) return null;

  const extracted = Number(match[0]);
  return Number.isNaN(extracted) ? null : extracted;
}

function compareTimelineEvents(a: TimelineEvent, b: TimelineEvent) {
  if (a.parsedOrder !== null && b.parsedOrder !== null) {
    if (a.parsedOrder !== b.parsedOrder) {
      return a.parsedOrder - b.parsedOrder;
    }
  } else if (a.parsedOrder !== null) {
    return -1;
  } else if (b.parsedOrder !== null) {
    return 1;
  }

  if (a.parsedYear !== null && b.parsedYear !== null) {
    if (a.parsedYear !== b.parsedYear) {
      return a.parsedYear - b.parsedYear;
    }
  } else if (a.parsedYear !== null) {
    return -1;
  } else if (b.parsedYear !== null) {
    return 1;
  }

  return a.entity.name.localeCompare(b.entity.name, "it");
}

function getTimelineBadgeColor(status: string) {
  return TIMELINE_STATUS_COLORS[status.trim().toLowerCase()] ?? "#374151";
}

function slugifyEntityTypeId(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isBuiltInEntityType(type: string) {
  return DEFAULT_ENTITY_TYPES.some((item) => item.id === type);
}

function sanitizeEntityTypes(
  rawEntityTypes: unknown,
  entities?: Entity[]
): EntityTypeDefinition[] {
  const fromStorage = Array.isArray(rawEntityTypes)
    ? rawEntityTypes
        .map((item) => {
          const id =
            typeof item?.id === "string" ? slugifyEntityTypeId(item.id) : "";
          const label =
            typeof item?.label === "string" ? item.label.trim() : "";
          const color =
            typeof item?.color === "string" && item.color.trim()
              ? item.color.trim()
              : "#64748b";

          if (!id || !label) return null;

          const fields = Array.isArray(item?.fields)
            ? item.fields
                .map((field: unknown): MetadataFieldDefinition | null => {
                  if (!field || typeof field !== "object") return null;

                  const safeField = field as Partial<MetadataFieldDefinition>;
                  const key = typeof safeField.key === "string" ? safeField.key.trim() : "";
                  const fieldLabel =
                    typeof safeField.label === "string" ? safeField.label.trim() : "";
                  const kind =
                    safeField.kind === "textarea" || safeField.kind === "entity-reference"
                      ? safeField.kind
                      : "text";

                  if (!key || !fieldLabel) return null;

                  return {
                    key,
                    label: fieldLabel,
                    kind,
                    placeholder:
                      typeof safeField.placeholder === "string"
                        ? safeField.placeholder
                        : undefined,
                    required:
                      typeof safeField.required === "boolean"
                        ? safeField.required
                        : undefined,
                    allowedEntityTypes: Array.isArray(safeField.allowedEntityTypes)
                      ? safeField.allowedEntityTypes.filter(
                          (type: unknown): type is string => typeof type === "string"
                        )
                      : undefined,
                    relationType:
                      typeof safeField.relationType === "string"
                        ? safeField.relationType
                        : undefined,
                    relationInverseType:
                      typeof safeField.relationInverseType === "string"
                        ? safeField.relationInverseType
                        : undefined,
                    autoCreateTarget:
                      typeof safeField.autoCreateTarget === "boolean"
                        ? safeField.autoCreateTarget
                        : undefined,
                    autoCreateTargetType:
                      typeof safeField.autoCreateTargetType === "string"
                        ? safeField.autoCreateTargetType
                        : undefined,
                  };
                })
                .filter((field: MetadataFieldDefinition | null): field is MetadataFieldDefinition => field !== null)
            : undefined;

        return {
  id,
  label,
  color,
  builtIn: Boolean(item?.builtIn) || isBuiltInEntityType(id),
  fields,
} as EntityTypeDefinition;
})
.filter((item): item is EntityTypeDefinition => item !== null)
: [];

  const map = new Map<string, EntityTypeDefinition>();

  DEFAULT_ENTITY_TYPES.forEach((item) => {
    map.set(item.id, item);
  });

  fromStorage.forEach((item) => {
    map.set(item.id, item);
  });

  if (entities) {
    entities.forEach((entity) => {
      const typeId = slugifyEntityTypeId(entity.type);
      if (!typeId) return;

      if (!map.has(typeId)) {
        const label =
          typeId.charAt(0).toUpperCase() + typeId.slice(1).replace(/-/g, " ");

        map.set(typeId, {
          id: typeId,
          label,
          color: "#64748b",
          builtIn: false,
          fields: [],
        });
      }
    });
  }

  return [...map.values()].sort((a, b) => {
    if (a.builtIn && !b.builtIn) return -1;
    if (!a.builtIn && b.builtIn) return 1;
    return a.label.localeCompare(b.label, "it");
  });
}

function sanitizeEntityType(value: unknown): string {
  if (typeof value !== "string") return "luogo";
  const trimmed = slugifyEntityTypeId(value);
  return trimmed || "luogo";
}

function getTypeDefinition(
  typeId: string,
  entityTypes: EntityTypeDefinition[]
): EntityTypeDefinition | undefined {
  return entityTypes.find((item) => item.id === typeId);
}

function getTypeLabel(typeId: string, entityTypes: EntityTypeDefinition[]) {
  return (
    getTypeDefinition(typeId, entityTypes)?.label ??
    typeId.charAt(0).toUpperCase() + typeId.slice(1)
  );
}

function getTypeColor(typeId: string, entityTypes: EntityTypeDefinition[]) {
  return getTypeDefinition(typeId, entityTypes)?.color ?? "#64748b";
}

function getTypeIconGlyph(typeId: string) {
  if (typeId === "luogo") return "⌂";
  if (typeId === "personaggio") return "◉";
  if (typeId === "fazione") return "⚑";
  if (typeId === "oggetto") return "◆";
  if (typeId === "evento") return "✦";
  return "•";
}

function buildDefaultGraphTypeFilters(entityTypes: EntityTypeDefinition[]) {
  const next: Record<string, boolean> = {};
  entityTypes.forEach((item) => {
    next[item.id] = true;
  });
  return next;
}

function createEntityRecord(
  data: {
    type: EntityType;
    name: string;
    shortDescription: string;
  },
  entityTypes: EntityTypeDefinition[]
): Entity {
  const nowIso = new Date().toISOString();
  const nowNum = Date.now();

  return {
    id: crypto.randomUUID(),
    type: data.type,
    name: data.name,
    shortDescription: data.shortDescription,
    notes: "",
    tags: [],
    metadata: getDefaultMetadata(data.type, entityTypes),
    createdAt: nowIso,
    updatedAt: nowIso,
    lastModified: nowNum,
  };
}

function getActiveGraphEntitiesByFocusedMode(
  entities: Entity[],
  relations: Relation[],
  selectedEntity: Entity,
  graphFilter: FocusedGraphFilter,
  graphTypeFilters: Record<string, boolean>
) {
  const level0Ids = new Set<string>([selectedEntity.id]);
  const level1Ids = new Set<string>();
  const level2Ids = new Set<string>();

  const baseRelations = relations.filter((relation) => {
    if (graphFilter === "all") {
      return (
        relation.fromEntityId === selectedEntity.id ||
        relation.toEntityId === selectedEntity.id
      );
    }

    if (graphFilter === "outgoing") {
      return relation.fromEntityId === selectedEntity.id;
    }

    return relation.toEntityId === selectedEntity.id;
  });

  baseRelations.forEach((relation) => {
    if (graphFilter === "all") {
      if (relation.fromEntityId === selectedEntity.id) {
        level1Ids.add(relation.toEntityId);
      }
      if (relation.toEntityId === selectedEntity.id) {
        level1Ids.add(relation.fromEntityId);
      }
    }

    if (graphFilter === "outgoing" && relation.fromEntityId === selectedEntity.id) {
      level1Ids.add(relation.toEntityId);
    }

    if (graphFilter === "incoming" && relation.toEntityId === selectedEntity.id) {
      level1Ids.add(relation.fromEntityId);
    }
  });

  relations.forEach((relation) => {
    if (graphFilter === "all") {
      const fromInLevel1 = level1Ids.has(relation.fromEntityId);
      const toInLevel1 = level1Ids.has(relation.toEntityId);

      if (
        fromInLevel1 &&
        !level0Ids.has(relation.toEntityId) &&
        !level1Ids.has(relation.toEntityId)
      ) {
        level2Ids.add(relation.toEntityId);
      }

      if (
        toInLevel1 &&
        !level0Ids.has(relation.fromEntityId) &&
        !level1Ids.has(relation.fromEntityId)
      ) {
        level2Ids.add(relation.fromEntityId);
      }
    }

    if (graphFilter === "outgoing") {
      if (
        level1Ids.has(relation.fromEntityId) &&
        !level0Ids.has(relation.toEntityId) &&
        !level1Ids.has(relation.toEntityId)
      ) {
        level2Ids.add(relation.toEntityId);
      }
    }

    if (graphFilter === "incoming") {
      if (
        level1Ids.has(relation.toEntityId) &&
        !level0Ids.has(relation.fromEntityId) &&
        !level1Ids.has(relation.fromEntityId)
      ) {
        level2Ids.add(relation.fromEntityId);
      }
    }
  });

  let graphEntityIds = new Set<string>([
    ...level0Ids,
    ...level1Ids,
    ...level2Ids,
  ]);

  const allowedEntityIds = new Set<string>();

  entities.forEach((entity) => {
    const isSelected = entity.id === selectedEntity.id;
    if (isSelected || graphTypeFilters[entity.type]) {
      allowedEntityIds.add(entity.id);
    }
  });

  graphEntityIds = new Set(
    [...graphEntityIds].filter((id) => allowedEntityIds.has(id))
  );

  const localEntities = entities.filter((entity) => graphEntityIds.has(entity.id));

  const localRelations = relations.filter((relation) => {
    const bothInside =
      graphEntityIds.has(relation.fromEntityId) &&
      graphEntityIds.has(relation.toEntityId);

    if (!bothInside) return false;

    if (graphFilter === "all") return true;

    if (graphFilter === "outgoing") {
      return (
        (level0Ids.has(relation.fromEntityId) &&
          level1Ids.has(relation.toEntityId)) ||
        (level1Ids.has(relation.fromEntityId) &&
          level2Ids.has(relation.toEntityId))
      );
    }

    return (
      (level1Ids.has(relation.fromEntityId) &&
        level0Ids.has(relation.toEntityId)) ||
      (level2Ids.has(relation.fromEntityId) &&
        level1Ids.has(relation.toEntityId))
    );
  });

  return {
    localEntities,
    localRelations,
    level0Ids,
    level1Ids,
    level2Ids,
  };
}

function buildGraphElements(
  localEntities: Entity[],
  localRelations: Relation[],
  entityTypes: EntityTypeDefinition[],
  selectedEntityId?: string,
  level0Ids?: Set<string>,
  level1Ids?: Set<string>,
  level2Ids?: Set<string>
) {
  const connectedIds = new Set<string>();

  if (selectedEntityId) {
    localRelations.forEach((relation) => {
      if (relation.fromEntityId === selectedEntityId) {
        connectedIds.add(relation.toEntityId);
      }
      if (relation.toEntityId === selectedEntityId) {
        connectedIds.add(relation.fromEntityId);
      }
    });
  }

  const rawNodes: Node<GraphNodeData>[] = localEntities.map((entity) => {
    const accentColor = getTypeColor(entity.type, entityTypes);
    const typeLabel = getTypeLabel(entity.type, entityTypes);
    const isSelected = selectedEntityId === entity.id;
    const isConnectedToSelection = connectedIds.has(entity.id);
    const inLevel0 = level0Ids?.has(entity.id) ?? false;
    const inLevel1 = level1Ids?.has(entity.id) ?? false;
    const inLevel2 = level2Ids?.has(entity.id) ?? false;

    let level: 0 | 1 | 2 = 1;

    if (isSelected || inLevel0) level = 0;
    else if (inLevel1) level = 1;
    else if (inLevel2) level = 2;

    const isDimmed =
      Boolean(selectedEntityId) &&
      !isSelected &&
      !isConnectedToSelection &&
      !inLevel0 &&
      !inLevel1;

    return {
      id: entity.id,
      type: "worldNode",
      position: { x: 0, y: 0 },
      data: {
        label: `${entity.name}\n${typeLabel}`,
        name: entity.name,
        typeLabel,
        shortDescription: entity.shortDescription,
        iconGlyph: getTypeIconGlyph(entity.type),
        accentColor,
        isSelected,
        isConnectedToSelection,
        isDimmed,
        level,
      },
      style: {
        width: NODE_WIDTH + 50,
        background: "transparent",
        border: "none",
        padding: 0,
      },
    };
  });

  const rawEdges: Edge[] = localRelations.map((relation) => {
    const touchesSelected =
      relation.fromEntityId === selectedEntityId ||
      relation.toEntityId === selectedEntityId;

    const isLevel1Edge =
      ((level0Ids?.has(relation.fromEntityId) ?? false) &&
        (level1Ids?.has(relation.toEntityId) ?? false)) ||
      ((level1Ids?.has(relation.fromEntityId) ?? false) &&
        (level0Ids?.has(relation.toEntityId) ?? false));

    const isLevel2Edge =
      ((level1Ids?.has(relation.fromEntityId) ?? false) &&
        (level2Ids?.has(relation.toEntityId) ?? false)) ||
      ((level2Ids?.has(relation.fromEntityId) ?? false) &&
        (level1Ids?.has(relation.toEntityId) ?? false));

    const stroke = touchesSelected
      ? "#60a5fa"
      : isLevel1Edge
      ? "#94a3b8"
      : isLevel2Edge
      ? "#475569"
      : "#64748b";

    const relationLabel =
      typeof relation.type === "string" && relation.type.trim()
        ? relation.type.trim()
        : "relazione";

    return {
      id: relation.id,
      source: relation.fromEntityId,
      target: relation.toEntityId,
      type: "smoothstep",
      label: relationLabel,
      data: {
        label: relationLabel,
      },
      animated: touchesSelected || isLevel1Edge,
      style: {
        stroke,
        strokeWidth: touchesSelected ? 3 : isLevel1Edge ? 2.4 : 1.7,
        opacity: touchesSelected ? 1 : isLevel2Edge ? 0.45 : 0.82,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: stroke,
        width: touchesSelected ? 20 : 18,
        height: touchesSelected ? 20 : 18,
      },
      labelStyle: {
        fill: "#ffffff",
        fontWeight: 800,
        fontSize: 13,
      },
      labelBgStyle: {
        fill: "#020617",
        fillOpacity: 1,
        stroke: "#475569",
        strokeWidth: 1,
      },
      labelBgPadding: [14, 7],
      labelBgBorderRadius: 999,
      labelShowBg: true,
    };
  });

  return getLayoutedElements(rawNodes, rawEdges, "LR");
}

function sanitizeEntities(rawEntities: unknown): Entity[] {
  if (!Array.isArray(rawEntities)) {
    return initialEntities.map((entity) => ({
      ...entity,
      type: sanitizeEntityType(entity.type),
    }));
  }

  return rawEntities
    .map((entity) => {
      const safeType = sanitizeEntityType(entity?.type);
      const nowIso = new Date().toISOString();
      const nowNum = Date.now();

      return {
        ...entity,
        id:
          typeof entity?.id === "string" && entity.id
            ? entity.id
            : crypto.randomUUID(),
        type: safeType,
        name: typeof entity?.name === "string" ? entity.name : "",
        shortDescription:
          typeof entity?.shortDescription === "string"
            ? entity.shortDescription
            : "",
        notes: typeof entity?.notes === "string" ? entity.notes : "",
        tags: Array.isArray(entity?.tags)
          ? entity.tags.filter((tag: unknown): tag is string => typeof tag === "string")
          : [],
        metadata:
          entity && typeof entity === "object"
            ? normalizeMetadata(entity.metadata)
            : isBuiltInEntityType(safeType)
            ? getDefaultMetadata(safeType)
            : {},
        image: typeof entity?.image === "string" ? entity.image : undefined,
        createdAt:
          typeof entity?.createdAt === "string" ? entity.createdAt : nowIso,
        updatedAt:
          typeof entity?.updatedAt === "string" ? entity.updatedAt : nowIso,
        lastModified:
          typeof entity?.lastModified === "number" ? entity.lastModified : nowNum,
      } satisfies Entity;
    })
    .filter((entity) => entity.id);
}

function sanitizeRelations(rawRelations: unknown): Relation[] {
  if (!Array.isArray(rawRelations)) {
    return initialRelations;
  }

  return rawRelations
    .map((relation) => {
      const fromEntityId =
        typeof relation?.fromEntityId === "string" ? relation.fromEntityId : "";
      const toEntityId =
        typeof relation?.toEntityId === "string" ? relation.toEntityId : "";
      const source =
        relation?.source === "manual" || relation?.source === "metadata"
          ? relation.source
          : undefined;
      const sourceFieldKey =
        typeof relation?.sourceFieldKey === "string" && relation.sourceFieldKey.trim()
          ? relation.sourceFieldKey.trim()
          : undefined;

      return {
        ...relation,
        id:
          typeof relation?.id === "string" && relation.id
            ? relation.id
            : crypto.randomUUID(),
        fromEntityId,
        toEntityId,
        type: normalizeRelationType(relation.type),
        inverseType: normalizeOptionalRelationType(relation.inverseType),
        source,
        sourceFieldKey,
      } satisfies Relation;
    })
    .filter(
      (relation) =>
        relation.id && relation.fromEntityId && relation.toEntityId && relation.type
    );
}

function buildDuplicateEntityName(entities: Entity[], source: Entity): string {
  const baseName = `${source.name}${UI_TEXT.duplicateSuffix}`;

  if (!hasDuplicateEntityName(entities, source.type, baseName)) {
    return baseName;
  }

  let copyIndex = 2;
  while (hasDuplicateEntityName(entities, source.type, `${baseName} ${copyIndex}`)) {
    copyIndex += 1;
  }

  return `${baseName} ${copyIndex}`;
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;

  const tagName = target.tagName.toLowerCase();
  return (
    target.isContentEditable ||
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select"
  );
}

export default function App() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const floatingMenuRef = useRef<HTMLDivElement | null>(null);

  const [rawEntities, setRawEntities] = useLocalStorageState<Entity[]>(
    ENTITIES_STORAGE_KEY,
    initialEntities.map((entity) => ({
      ...entity,
      type: sanitizeEntityType(entity.type),
    }))
  );

  const [rawRelations, setRawRelations] = useLocalStorageState<Relation[]>(
    RELATIONS_STORAGE_KEY,
    initialRelations
  );

  const entities = useMemo(() => sanitizeEntities(rawEntities), [rawEntities]);
  const relations = useMemo(() => sanitizeRelations(rawRelations), [rawRelations]);

  const [rawEntityTypes, setRawEntityTypes] = useLocalStorageState<EntityTypeDefinition[]>(
    ENTITY_TYPES_STORAGE_KEY,
    DEFAULT_ENTITY_TYPES
  );

  const entityTypes = useMemo(
    () => sanitizeEntityTypes(rawEntityTypes, entities),
    [rawEntityTypes, entities]
  );

  const [selectedId, setSelectedId] = useState<string>(
    () => initialEntities[0]?.id ?? ""
  );
  const [view, setView] = useState<"dashboard" | "workspace" | "graph">("dashboard");
  const [search, setSearch] = useState("");
  const [archiveTypeFilter, setArchiveTypeFilter] = useState<"all" | EntityType>("all");
  const [tagFilter, setTagFilter] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("lastModified-desc");

  const [isCreatingEntity, setIsCreatingEntity] = useState(false);
  const [createEntityType, setCreateEntityType] = useState<EntityType>("luogo");
  const [isFloatingCreateOpen, setIsFloatingCreateOpen] = useState(false);

  const [newTag, setNewTag] = useState("");
  const [relationType, setRelationType] = useState(
    RELATION_PRESETS[DEFAULT_RELATION_PRESET_INDEX]?.type ?? ""
  );
  const [relationInverseType, setRelationInverseType] = useState(
    RELATION_PRESETS[DEFAULT_RELATION_PRESET_INDEX]?.inverseType ?? ""
  );
  const [relationTargetId, setRelationTargetId] = useState<string | "">("");

  const [graphViewMode, setGraphViewMode] = useState<GraphViewMode>("focused");
  const [graphFilter, setGraphFilter] = useState<FocusedGraphFilter>("all");
  const [graphViewType, setGraphViewType] = useState<"all" | EntityType>("all");
  const [graphViewTag, setGraphViewTag] = useState("");
  const [graphTypeFilters, setGraphTypeFilters] = useState<Record<string, boolean>>(
    () => buildDefaultGraphTypeFilters(DEFAULT_ENTITY_TYPES)
  );

  const [timelinePeriodFilter, setTimelinePeriodFilter] = useState("all");

  useEffect(() => {
    const nextFilterState = buildDefaultGraphTypeFilters(entityTypes);

    setGraphTypeFilters((current) => {
      const merged = { ...nextFilterState, ...current };

      entityTypes.forEach((item) => {
        if (typeof merged[item.id] !== "boolean") {
          merged[item.id] = true;
        }
      });

      return merged;
    });
  }, [entityTypes]);

  useEffect(() => {
    const exists = entities.some((entity) => entity.id === selectedId);
    if (!exists) {
      setSelectedId(entities[0]?.id ?? "");
    }
  }, [entities, selectedId]);

  useEffect(() => {
    const exists = entityTypes.some((type) => type.id === createEntityType);
    if (!exists) {
      setCreateEntityType(entityTypes[0]?.id ?? "luogo");
    }
  }, [entityTypes, createEntityType]);

  useEffect(() => {
    if (
      graphViewType !== "all" &&
      !entityTypes.some((type) => type.id === graphViewType)
    ) {
      setGraphViewType("all");
    }
  }, [entityTypes, graphViewType]);

  useEffect(() => {
    setRelationTargetId("");
  }, [selectedId]);

  const allTags = useMemo(() => {
    return [...new Set(entities.flatMap((entity) => entity.tags))]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "it"));
  }, [entities]);

  useEffect(() => {
    if (!graphViewTag && allTags.length > 0) {
      setGraphViewTag(allTags[0]);
    }
  }, [allTags, graphViewTag]);

  useEffect(() => {
    function handleWindowClick(event: MouseEvent) {
      if (!floatingMenuRef.current) return;
      const target = event.target;
      if (!(target instanceof globalThis.Node)) return;
      if (floatingMenuRef.current.contains(target)) return;
      setIsFloatingCreateOpen(false);
    }

    window.addEventListener("mousedown", handleWindowClick);
    return () => window.removeEventListener("mousedown", handleWindowClick);
  }, []);

  const filteredEntities = useMemo(() => {
    const q = search.trim().toLowerCase();

    const result = entities.filter((entity) => {
      const typeLabel = getTypeLabel(entity.type, entityTypes).toLowerCase();

      const matchesType =
        archiveTypeFilter === "all" || entity.type === archiveTypeFilter;

      const matchesTag =
        !tagFilter ||
        entity.tags.some((tag) => tag.toLowerCase() === tagFilter.toLowerCase());

      const metadataMatches = Object.values(entity.metadata ?? {}).some((value) =>
        value.toLowerCase().includes(q)
      );

      const matchesSearch =
        !q ||
        entity.name.toLowerCase().includes(q) ||
        entity.shortDescription.toLowerCase().includes(q) ||
        entity.notes.toLowerCase().includes(q) ||
        entity.type.toLowerCase().includes(q) ||
        typeLabel.includes(q) ||
        entity.tags.some((tag) => tag.toLowerCase().includes(q)) ||
        metadataMatches;

      return matchesType && matchesTag && matchesSearch;
    });

    result.sort((a, b) => {
      if (sortMode === "name-asc") {
        return a.name.localeCompare(b.name, "it");
      }

      if (sortMode === "type") {
        const typeCompare = getTypeLabel(a.type, entityTypes).localeCompare(
          getTypeLabel(b.type, entityTypes),
          "it"
        );
        if (typeCompare !== 0) return typeCompare;
        return a.name.localeCompare(b.name, "it");
      }

      return b.lastModified - a.lastModified;
    });

    return result;
  }, [entities, search, archiveTypeFilter, tagFilter, sortMode, entityTypes]);

  const selectedEntity =
    entities.find((entity) => entity.id === selectedId) ?? null;

  const availableRelationTargets = selectedEntity
    ? entities.filter((entity) => entity.id !== selectedEntity.id)
    : [];

  const selectedEntityRelations = selectedEntity
    ? relations.filter(
        (relation) =>
          relation.fromEntityId === selectedEntity.id ||
          relation.toEntityId === selectedEntity.id
      )
    : [];

  const timelineEvents = useMemo<TimelineEvent[]>(() => {
    return entities
      .filter((entity) => entity.type === "evento")
      .map((entity) => {
        const metadata = entity.metadata ?? {};
        const anno = metadata.anno ?? "";
        const epoca = metadata.epoca ?? "";
        const ordineCronologico = metadata.ordineCronologico ?? "";
        const stato = metadata.stato ?? "";

        return {
          entity,
          anno,
          epoca,
          ordineCronologico,
          stato,
          parsedYear: parseNumberLike(anno),
          parsedOrder: parseNumberLike(ordineCronologico),
        };
      })
      .sort(compareTimelineEvents);
  }, [entities]);

  const timelinePeriods = useMemo(() => {
    return [...new Set(timelineEvents.map((event) => event.epoca).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, "it"));
  }, [timelineEvents]);

  const filteredTimelineEvents = useMemo(() => {
    if (timelinePeriodFilter === "all") {
      return timelineEvents;
    }

    return timelineEvents.filter(
      (event) => event.epoca.toLowerCase() === timelinePeriodFilter.toLowerCase()
    );
  }, [timelineEvents, timelinePeriodFilter]);

  const quickCreateOptions = useMemo(() => {
    return entityTypes.slice(0, 8).map((type) => ({
      value: type.id,
      label: type.label,
      color: type.color,
    }));
  }, [entityTypes]);

  function getEntityById(id: string) {
    return entities.find((entity) => entity.id === id);
  }

  function findEntityByNameAndAllowedTypes(
    name: string,
    allowedTypes: EntityType[] | undefined
  ): Entity | undefined {
    const normalizedName = normalizeEntityName(name).toLowerCase();
    if (!normalizedName) return undefined;

    return entities.find((entity) => {
      const sameName = normalizeEntityName(entity.name).toLowerCase() === normalizedName;
      if (!sameName) return false;

      if (!allowedTypes || allowedTypes.length === 0) {
        return true;
      }

      return allowedTypes.includes(entity.type);
    });
  }

  function createAutoTargetEntity(
    name: string,
    fieldAutoCreateType: EntityType | undefined,
    allowedTypes: EntityType[] | undefined
  ): Entity | null {
    const normalizedName = normalizeEntityName(name);
    if (!normalizedName) return null;

    const targetType =
      fieldAutoCreateType ??
      allowedTypes?.[0] ??
      entityTypes[0]?.id ??
      "luogo";

    const alreadyExisting = findEntityByNameAndAllowedTypes(normalizedName, [targetType]);
    if (alreadyExisting) {
      return alreadyExisting;
    }

    const created = createEntityRecord(
      {
        type: targetType,
        name: normalizedName,
        shortDescription: "",
      },
      entityTypes
    );

    setRawEntities((current) => [created, ...sanitizeEntities(current)]);
    return created;
  }

  function buildMetadataRelation(params: {
    sourceEntity: Entity;
    fieldKey: string;
    targetEntityId: string;
    relationType: string;
    relationInverseType?: string;
  }): Relation {
    return {
      id: crypto.randomUUID(),
      fromEntityId: params.sourceEntity.id,
      toEntityId: params.targetEntityId,
      type: normalizeRelationType(params.relationType),
      inverseType: normalizeOptionalRelationType(params.relationInverseType),
      source: "metadata",
      sourceFieldKey: params.fieldKey,
    };
  }

  function syncMetadataReferenceField(params: {
    sourceEntity: Entity;
    fieldKey: string;
    nextValue: string;
  }) {
    const field = getMetadataFieldDefinition(
      params.sourceEntity.type,
      params.fieldKey,
      entityTypes
    );

    if (!field || field.kind !== "entity-reference") {
      return;
    }

    const normalizedValue = normalizeMetadataValue(params.nextValue);

    setRawRelations((currentRawRelations) => {
      const currentRelations = sanitizeRelations(currentRawRelations);

      const relationsWithoutPreviousAuto = currentRelations.filter(
        (relation) =>
          !isSameMetadataRelationOrigin(
            relation,
            params.sourceEntity.id,
            params.fieldKey
          )
      );

      if (!normalizedValue) {
        return relationsWithoutPreviousAuto;
      }

      let targetEntity = findEntityByNameAndAllowedTypes(
        normalizedValue,
        field.allowedEntityTypes
      );

      if (!targetEntity && field.autoCreateTarget) {
        targetEntity =
          createAutoTargetEntity(
            normalizedValue,
            field.autoCreateTargetType,
            field.allowedEntityTypes
          ) ?? undefined;
      }

      if (!targetEntity) {
        return relationsWithoutPreviousAuto;
      }

      if (targetEntity.id === params.sourceEntity.id) {
        return relationsWithoutPreviousAuto;
      }

      const normalizedRelationType = normalizeRelationType(field.relationType ?? "");
      if (!normalizedRelationType) {
        return relationsWithoutPreviousAuto;
      }

      const normalizedInverse = normalizeOptionalRelationType(
        field.relationInverseType
      );

      const duplicate = relationsWithoutPreviousAuto.some(
        (relation) =>
          relation.fromEntityId === params.sourceEntity.id &&
          relation.toEntityId === targetEntity!.id &&
          normalizeRelationType(relation.type) === normalizedRelationType &&
          normalizeOptionalRelationType(relation.inverseType) === normalizedInverse &&
          relation.source === "metadata" &&
          relation.sourceFieldKey === params.fieldKey
      );

      if (duplicate) {
        return relationsWithoutPreviousAuto;
      }

      return [
        buildMetadataRelation({
          sourceEntity: params.sourceEntity,
          fieldKey: params.fieldKey,
          targetEntityId: targetEntity.id,
          relationType: normalizedRelationType,
          relationInverseType: normalizedInverse,
        }),
        ...relationsWithoutPreviousAuto,
      ];
    });
  }

  function updateSelectedEntityMetadataField(
    fieldKey: string,
    value: string,
    options?: {
      commitReference?: boolean;
    }
  ) {
    if (!selectedEntity) return;

    const normalizedValue = normalizeMetadataValue(value);

    const nextMetadata = {
      ...(selectedEntity.metadata ?? {}),
      [fieldKey]: normalizedValue,
    };

    updateSelectedEntity({
      metadata: nextMetadata,
    });

    if (!options?.commitReference) {
      return;
    }

    syncMetadataReferenceField({
      sourceEntity: selectedEntity,
      fieldKey,
      nextValue: normalizedValue,
    });
  }

  function toggleGraphTypeFilter(type: EntityType) {
    setGraphTypeFilters((current) => ({
      ...current,
      [type]: !current[type],
    }));
  }

  function updateSelectedEntity(patch: Partial<Entity>) {
    if (!selectedEntity) return;

    const normalizedPatch: Partial<Entity> = { ...patch };
    const nextType = normalizeEntityTypeForPatch(
      normalizedPatch.type ?? selectedEntity.type,
      entityTypes
    );

    if (typeof normalizedPatch.name === "string") {
      const trimmedName = normalizeEntityName(normalizedPatch.name);

      if (!trimmedName) return;

      if (
        hasDuplicateEntityName(
          entities,
          nextType,
          trimmedName,
          selectedEntity.id
        )
      ) {
        return;
      }

      normalizedPatch.name = trimmedName;
    }

    if (typeof normalizedPatch.type === "string") {
      normalizedPatch.type = nextType;
    }

    if (Array.isArray(normalizedPatch.tags)) {
      normalizedPatch.tags = normalizedPatch.tags
        .map(normalizeTag)
        .filter(Boolean)
        .filter(
          (tag, index, array) =>
            array.findIndex((currentTag) => currentTag === tag) === index
        );
    }

    if (normalizedPatch.metadata) {
      normalizedPatch.metadata = normalizeMetadata(normalizedPatch.metadata);
    }

    if (normalizedPatch.type && !patch.metadata) {
      normalizedPatch.metadata = remapMetadataForType(
        selectedEntity.metadata,
        normalizedPatch.type,
        entityTypes
      );
    }

    const nowIso = new Date().toISOString();
    normalizedPatch.updatedAt = nowIso;
    normalizedPatch.lastModified = Date.now();

    setRawEntities((current) =>
      sanitizeEntities(current).map((entity) =>
        entity.id === selectedEntity.id
          ? {
              ...entity,
              ...normalizedPatch,
              metadata:
                normalizedPatch.metadata ??
                entity.metadata ??
                getDefaultMetadata(nextType, entityTypes),
            }
          : entity
      )
    );
  }

  function normalizeEntityTypeForPatch(
    type: string,
    availableTypes: EntityTypeDefinition[]
  ) {
    const safeType = sanitizeEntityType(type);
    return availableTypes.some((item) => item.id === safeType) ? safeType : "luogo";
  }

  function handleOpenCreateEntity(type: EntityType = "luogo") {
    setCreateEntityType(normalizeEntityTypeForPatch(type, entityTypes));
    setIsCreatingEntity(true);
    setIsFloatingCreateOpen(false);
  }

  function handleCancelCreateEntity() {
    setIsCreatingEntity(false);
  }

  function handleCreateEntity(data: {
    type: EntityType;
    name: string;
    shortDescription: string;
  }): boolean {
    const normalizedName = normalizeEntityName(data.name);
    const normalizedDescription = normalizeText(data.shortDescription);
    const normalizedType = normalizeEntityTypeForPatch(data.type, entityTypes);

    if (!normalizedName) {
      alert("Il nome è obbligatorio.");
      return false;
    }

    if (hasDuplicateEntityName(entities, normalizedType, normalizedName)) {
      alert("Esiste già un'entità dello stesso tipo con questo nome.");
      return false;
    }

    const newEntity = createEntityRecord(
      {
        type: normalizedType,
        name: normalizedName,
        shortDescription: normalizedDescription,
      },
      entityTypes
    );

    setRawEntities((current) => [newEntity, ...sanitizeEntities(current)]);
    setSelectedId(newEntity.id);
    setNewTag("");
    setIsCreatingEntity(false);
    return true;
  }

  function handleCreateEntityType(data: { label: string; color: string }): boolean {
    const normalizedLabel = data.label.trim().replace(/\s+/g, " ");
    const normalizedId = slugifyEntityTypeId(normalizedLabel);

    if (!normalizedLabel || !normalizedId) {
      alert("Il nome del tipo è obbligatorio.");
      return false;
    }

    const alreadyExists = entityTypes.some(
      (type) => type.id === normalizedId || type.label.toLowerCase() === normalizedLabel.toLowerCase()
    );

    if (alreadyExists) {
      alert("Esiste già un tipo con questo nome.");
      return false;
    }

    const nextType: EntityTypeDefinition = {
      id: normalizedId,
      label: normalizedLabel,
      color: data.color?.trim() || "#64748b",
      builtIn: false,
      fields: [],
    };

    setRawEntityTypes((current) => sanitizeEntityTypes(current).concat(nextType));
    setCreateEntityType(nextType.id);
    return true;
  }

  function duplicateSelectedEntity() {
    if (!selectedEntity) return;

    const nowIso = new Date().toISOString();
    const duplicateName = buildDuplicateEntityName(entities, selectedEntity);

    const duplicatedEntity: Entity = {
      ...selectedEntity,
      id: crypto.randomUUID(),
      name: duplicateName,
      tags: [...selectedEntity.tags],
      metadata: { ...(selectedEntity.metadata ?? {}) },
      image: selectedEntity.image,
      createdAt: nowIso,
      updatedAt: nowIso,
      lastModified: Date.now(),
    };

    setRawEntities((current) => [duplicatedEntity, ...sanitizeEntities(current)]);
    setSelectedId(duplicatedEntity.id);
    setIsCreatingEntity(false);
    setNewTag("");
  }

  function deleteSelectedEntity() {
    if (!selectedEntity) return;

    const confirmed = window.confirm(
      `Vuoi davvero eliminare "${selectedEntity.name}"?`
    );
    if (!confirmed) return;

    setRawEntities((current) =>
      sanitizeEntities(current).filter((entity) => entity.id !== selectedEntity.id)
    );

    setRawRelations((current) =>
      sanitizeRelations(current).filter(
        (relation) =>
          relation.fromEntityId !== selectedEntity.id &&
          relation.toEntityId !== selectedEntity.id
      )
    );
  }

  useEffect(() => {
    function handleKeyboardShortcuts(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }

      if (event.key === "Escape") {
        if (isCreatingEntity) {
          event.preventDefault();
          setIsCreatingEntity(false);
        }

        if (isFloatingCreateOpen) {
          event.preventDefault();
          setIsFloatingCreateOpen(false);
        }

        return;
      }

      if (!selectedEntity) return;
      if (isEditableTarget(event.target)) return;

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        deleteSelectedEntity();
      }
    }

    window.addEventListener("keydown", handleKeyboardShortcuts);
    return () => window.removeEventListener("keydown", handleKeyboardShortcuts);
  }, [isCreatingEntity, isFloatingCreateOpen, selectedEntity]);

  function resetAllData() {
    const confirmed = window.confirm(
      "Vuoi davvero cancellare tutti i dati salvati e ripartire da zero?"
    );
    if (!confirmed) return;

    localStorage.removeItem(ENTITIES_STORAGE_KEY);
    localStorage.removeItem(RELATIONS_STORAGE_KEY);
    localStorage.removeItem(ENTITY_TYPES_STORAGE_KEY);

    setRawEntityTypes(DEFAULT_ENTITY_TYPES);
    setRawEntities(
      initialEntities.map((entity) => ({
        ...entity,
        type: sanitizeEntityType(entity.type),
      }))
    );
    setRawRelations(initialRelations);
    setSelectedId(initialEntities[0]?.id ?? "");
    setSearch("");
    setArchiveTypeFilter("all");
    setTagFilter("");
    setSortMode("lastModified-desc");
    setIsCreatingEntity(false);
    setCreateEntityType("luogo");
    setNewTag("");
    setRelationType(RELATION_PRESETS[DEFAULT_RELATION_PRESET_INDEX]?.type ?? "");
    setRelationInverseType(
      RELATION_PRESETS[DEFAULT_RELATION_PRESET_INDEX]?.inverseType ?? ""
    );
    setRelationTargetId("");
    setGraphViewMode("focused");
    setGraphFilter("all");
    setGraphViewType("all");
    setGraphViewTag("");
    setTimelinePeriodFilter("all");
    setGraphTypeFilters(buildDefaultGraphTypeFilters(DEFAULT_ENTITY_TYPES));
    setIsFloatingCreateOpen(false);
  }

  function exportData() {
    const data: WorldData = {
      entityTypes,
      entities,
      relations,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const date = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");

    a.href = url;
    a.download = `worldbuilder-backup-${date}.json`;
    a.click();

    URL.revokeObjectURL(url);
  }

  function isValidWorldData(data: unknown): data is WorldData {
    if (!data || typeof data !== "object") return false;

    const candidate = data as WorldData;

    if (!Array.isArray(candidate.entities) || !Array.isArray(candidate.relations)) {
      return false;
    }

    if (
      typeof candidate.entityTypes !== "undefined" &&
      !Array.isArray(candidate.entityTypes)
    ) {
      return false;
    }

    const entitiesValid = candidate.entities.every((entity) => {
      return (
        entity &&
        typeof entity.id === "string" &&
        typeof entity.type === "string" &&
        typeof entity.name === "string" &&
        typeof entity.shortDescription === "string" &&
        typeof entity.notes === "string" &&
        Array.isArray(entity.tags) &&
        (typeof entity.image === "undefined" || typeof entity.image === "string")
      );
    });

    const relationsValid = candidate.relations.every((relation) => {
      return (
        relation &&
        typeof relation.id === "string" &&
        typeof relation.fromEntityId === "string" &&
        typeof relation.toEntityId === "string" &&
        typeof relation.type === "string" &&
        (typeof relation.inverseType === "undefined" ||
          typeof relation.inverseType === "string") &&
        (typeof relation.source === "undefined" ||
          relation.source === "manual" ||
          relation.source === "metadata") &&
        (typeof relation.sourceFieldKey === "undefined" ||
          typeof relation.sourceFieldKey === "string")
      );
    });

    const entityTypesValid =
      typeof candidate.entityTypes === "undefined" ||
      candidate.entityTypes.every((type) => {
        const fieldsValid =
          typeof type.fields === "undefined" ||
          (Array.isArray(type.fields) &&
            type.fields.every((field) => {
              return (
                field &&
                typeof field.key === "string" &&
                typeof field.label === "string" &&
                (field.kind === "text" ||
                  field.kind === "textarea" ||
                  field.kind === "entity-reference") &&
                (typeof field.placeholder === "undefined" ||
                  typeof field.placeholder === "string") &&
                (typeof field.required === "undefined" ||
                  typeof field.required === "boolean") &&
                (typeof field.allowedEntityTypes === "undefined" ||
                  Array.isArray(field.allowedEntityTypes)) &&
                (typeof field.relationType === "undefined" ||
                  typeof field.relationType === "string") &&
                (typeof field.relationInverseType === "undefined" ||
                  typeof field.relationInverseType === "string") &&
                (typeof field.autoCreateTarget === "undefined" ||
                  typeof field.autoCreateTarget === "boolean") &&
                (typeof field.autoCreateTargetType === "undefined" ||
                  typeof field.autoCreateTargetType === "string")
              );
            }));

        return (
          type &&
          typeof type.id === "string" &&
          typeof type.label === "string" &&
          typeof type.color === "string" &&
          fieldsValid
        );
      });

    return entitiesValid && relationsValid && entityTypesValid;
  }

  function importData(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const text = reader.result;
        if (typeof text !== "string") {
          throw new Error("File non leggibile.");
        }

        const parsed = JSON.parse(text);

        if (!isValidWorldData(parsed)) {
          throw new Error("Formato JSON non valido.");
        }

        const sanitizedEntities = sanitizeEntities(parsed.entities);
        const entityIdSet = new Set(sanitizedEntities.map((entity) => entity.id));
        const sanitizedEntityTypes = sanitizeEntityTypes(
          parsed.entityTypes ?? DEFAULT_ENTITY_TYPES,
          sanitizedEntities
        );

        const sanitizedRelations = parsed.relations
          .map((relation) => ({
            ...relation,
            id:
              typeof relation.id === "string" && relation.id
                ? relation.id
                : crypto.randomUUID(),
            fromEntityId: relation.fromEntityId,
            toEntityId: relation.toEntityId,
            type: normalizeRelationType(relation.type),
            inverseType: normalizeOptionalRelationType(relation.inverseType),
            source:
              relation.source === "manual" || relation.source === "metadata"
                ? relation.source
                : undefined,
            sourceFieldKey:
              typeof relation.sourceFieldKey === "string"
                ? relation.sourceFieldKey
                : undefined,
          }))
          .filter(
            (relation) =>
              relation.id &&
              relation.type &&
              entityIdSet.has(relation.fromEntityId) &&
              entityIdSet.has(relation.toEntityId)
          );

        const confirmed = window.confirm(
          "Importando il file verranno sostituiti tutti i dati attuali. Vuoi continuare?"
        );

        if (!confirmed) {
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
          return;
        }

        setRawEntityTypes(sanitizedEntityTypes);
        setRawEntities(sanitizedEntities);
        setRawRelations(sanitizedRelations);

        setSelectedId(sanitizedEntities[0]?.id ?? "");
        setSearch("");
        setArchiveTypeFilter("all");
        setTagFilter("");
        setSortMode("lastModified-desc");
        setIsCreatingEntity(false);
        setCreateEntityType(sanitizedEntityTypes[0]?.id ?? "luogo");
        setNewTag("");
        setRelationType(RELATION_PRESETS[DEFAULT_RELATION_PRESET_INDEX]?.type ?? "");
        setRelationInverseType(
          RELATION_PRESETS[DEFAULT_RELATION_PRESET_INDEX]?.inverseType ?? ""
        );
        setRelationTargetId("");
        setGraphViewMode("focused");
        setGraphFilter("all");
        setGraphViewType("all");
        setGraphViewTag("");
        setTimelinePeriodFilter("all");
        setGraphTypeFilters(buildDefaultGraphTypeFilters(sanitizedEntityTypes));
        setIsFloatingCreateOpen(false);

        alert("Import completato con successo.");
      } catch (error) {
        console.error(error);
        alert("Impossibile importare il file. Controlla che sia un backup JSON valido.");
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    };

    reader.readAsText(file);
  }

  function addTag() {
    if (!selectedEntity) return;

    const normalized = normalizeTag(newTag);
    if (!normalized) {
      setNewTag("");
      return;
    }

    const alreadyExists = selectedEntity.tags.some(
      (tag) => normalizeTag(tag) === normalized
    );

    if (alreadyExists) {
      setNewTag("");
      return;
    }

    updateSelectedEntity({
      tags: [...selectedEntity.tags, normalized],
    });

    setNewTag("");
  }

  function removeTag(tagToRemove: string) {
    if (!selectedEntity) return;

    updateSelectedEntity({
      tags: selectedEntity.tags.filter((tag) => tag !== tagToRemove),
    });
  }

  function handleRelationTypeChange(value: string) {
    setRelationType(value);

    const normalized = normalizeRelationType(value);
    const suggestedInverse = getSuggestedInverseRelationType(normalized);

    if (suggestedInverse) {
      setRelationInverseType(suggestedInverse);
    }
  }

  function addRelation() {
    if (!selectedEntity) return;
    if (relationTargetId === "") return;

    if (relationTargetId === selectedEntity.id) {
      alert("Non puoi creare una relazione verso la stessa entità.");
      return;
    }

    const normalizedType = normalizeRelationType(relationType);
    if (!normalizedType) {
      alert("Il tipo di relazione è obbligatorio.");
      return;
    }

    const normalizedInverseType = normalizeOptionalRelationType(relationInverseType);

    const alreadyExists = relations.some(
      (relation) =>
        relation.fromEntityId === selectedEntity.id &&
        relation.toEntityId === relationTargetId &&
        normalizeRelationType(relation.type) === normalizedType &&
        normalizeOptionalRelationType(relation.inverseType) === normalizedInverseType
    );

    if (alreadyExists) {
      alert("Questa relazione esiste già.");
      return;
    }

    const newRelation: Relation = {
      id: crypto.randomUUID(),
      fromEntityId: selectedEntity.id,
      toEntityId: relationTargetId,
      type: normalizedType,
      inverseType: normalizedInverseType,
      source: "manual",
    };

    setRawRelations((current) => [newRelation, ...sanitizeRelations(current)]);
    setRelationType(RELATION_PRESETS[DEFAULT_RELATION_PRESET_INDEX]?.type ?? "");
    setRelationInverseType(
      RELATION_PRESETS[DEFAULT_RELATION_PRESET_INDEX]?.inverseType ?? ""
    );
    setRelationTargetId("");
  }

  function deleteRelation(relationId: string) {
    setRawRelations((current) =>
      sanitizeRelations(current).filter((relation) => relation.id !== relationId)
    );
  }

  const graphData = useMemo(() => {
    if (!selectedEntity) {
      return { nodes: [], edges: [] };
    }

    if (graphViewMode === "focused") {
      const focused = getActiveGraphEntitiesByFocusedMode(
        entities,
        relations,
        selectedEntity,
        graphFilter,
        graphTypeFilters
      );

      return buildGraphElements(
        focused.localEntities,
        focused.localRelations,
        entityTypes,
        selectedEntity.id,
        focused.level0Ids,
        focused.level1Ids,
        focused.level2Ids
      );
    }

    if (graphViewMode === "global") {
      const localEntities = entities.filter((entity) => graphTypeFilters[entity.type]);

      const allowedIds = new Set(localEntities.map((entity) => entity.id));

      const localRelations = relations.filter(
        (relation) =>
          allowedIds.has(relation.fromEntityId) &&
          allowedIds.has(relation.toEntityId)
      );

      return buildGraphElements(
        localEntities,
        localRelations,
        entityTypes,
        selectedEntity.id
      );
    }

    if (graphViewMode === "type-only") {
      const localEntities =
        graphViewType === "all"
          ? entities
          : entities.filter((entity) => entity.type === graphViewType);

      const allowedIds = new Set(localEntities.map((entity) => entity.id));

      const localRelations = relations.filter(
        (relation) =>
          allowedIds.has(relation.fromEntityId) &&
          allowedIds.has(relation.toEntityId)
      );

      return buildGraphElements(
        localEntities,
        localRelations,
        entityTypes,
        selectedEntity.id
      );
    }

    const normalizedTag = normalizeTag(graphViewTag);

    const localEntities = normalizedTag
      ? entities.filter((entity) =>
          entity.tags.some((tag) => normalizeTag(tag) === normalizedTag)
        )
      : [];

    const allowedIds = new Set(localEntities.map((entity) => entity.id));

    const localRelations = relations.filter(
      (relation) =>
        allowedIds.has(relation.fromEntityId) &&
        allowedIds.has(relation.toEntityId)
    );

    return buildGraphElements(
      localEntities,
      localRelations,
      entityTypes,
      selectedEntity.id
    );
  }, [
    entities,
    relations,
    entityTypes,
    selectedEntity,
    graphViewMode,
    graphFilter,
    graphTypeFilters,
    graphViewType,
    graphViewTag,
  ]);

  const showEmptyState = !selectedEntity;

  return view === "dashboard" ? (
    <div
      style={{
        ...pageStyle,
        background:
          "radial-gradient(circle at top, rgba(59,130,246,0.08), transparent 24%), linear-gradient(180deg, #0b1020 0%, #111827 100%)",
      }}
    >
      <div style={pageContainerStyle}>
        <WorldDashboard
          entityTypes={entityTypes}
          entities={entities}
          relations={relations}
          selectedEntityId={selectedId}
          onOpenEntity={(id) => {
            setSelectedId(id);
            setView("workspace");
          }}
          onEnterWorkspace={() => setView("workspace")}
          onCreateEntity={() => {
            setCreateEntityType(entityTypes[0]?.id ?? "luogo");
            setIsCreatingEntity(true);
            setView("workspace");
          }}
        />
      </div>
    </div>
  ) : view === "graph" ? (
    <div
      style={{
        ...pageStyle,
        background:
          "radial-gradient(circle at top, rgba(59,130,246,0.08), transparent 24%), linear-gradient(180deg, #0b1020 0%, #111827 100%)",
      }}
    >
      <div style={pageContainerStyle}>
        <GraphView
          entityTypes={entityTypes}
          selectedEntity={selectedEntity}
          graphViewMode={graphViewMode}
          graphFilter={graphFilter}
          graphTypeFilters={graphTypeFilters}
          graphViewType={graphViewType}
          graphViewTag={graphViewTag}
          allTags={allTags}
          graphData={graphData}
          onGraphViewModeChange={setGraphViewMode}
          onGraphFilterChange={setGraphFilter}
          onToggleGraphTypeFilter={toggleGraphTypeFilter}
          onGraphViewTypeChange={setGraphViewType}
          onGraphViewTagChange={setGraphViewTag}
          onNodeClick={setSelectedId}
          getEntityById={getEntityById}
          onBackToWorkspace={() => setView("workspace")}
          onGoToDashboard={() => setView("dashboard")}
          onOpenEntityInEditor={() => {
            if (selectedEntity) {
              setView("workspace");
            }
          }}
        />
      </div>
    </div>
  ) : (
    <div
      style={{
        ...pageStyle,
        background:
          "radial-gradient(circle at top, rgba(59,130,246,0.08), transparent 24%), linear-gradient(180deg, #0b1020 0%, #111827 100%)",
      }}
    >
      <div style={pageContainerStyle}>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          onChange={importData}
          style={{ display: "none" }}
        />

        <div
          style={{
            marginBottom: "20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: "32px" }}>Worldbuilder</h1>
            <p style={{ margin: "6px 0 0 0", color: "#9ca3af" }}>
              Prototipo locale per worldbuilding visuale e rapido, pensato per D&amp;D.
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setView("dashboard")}
              style={secondaryButtonLargeStyle}
            >
              Dashboard
            </button>

            <button
              type="button"
              onClick={() => {
                if (!selectedId && entities.length > 0) {
                  setSelectedId(entities[0].id);
                }
                setView("graph");
              }}
              style={secondaryButtonLargeStyle}
            >
              Apri grafo
            </button>

            <button
              type="button"
              onClick={() => handleOpenCreateEntity()}
              style={primaryButtonLargeStyle}
            >
              + Nuova entità
            </button>

            <button type="button" onClick={exportData} style={successButtonLargeStyle}>
              Export JSON
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={purpleButtonLargeStyle}
            >
              Import JSON
            </button>

            <button type="button" onClick={resetAllData} style={secondaryButtonLargeStyle}>
              Reset dati
            </button>
          </div>
        </div>

        {showEmptyState ? (
          <div
            style={{
              ...panelStyle,
              maxWidth: 720,
              margin: "0 auto",
              border: "1px solid #263244",
              boxShadow: "0 16px 40px rgba(0,0,0,0.18)",
              display: "grid",
              gap: 16,
            }}
          >
            <div>
              <h2 style={{ marginBottom: 8 }}>Nessuna entità disponibile</h2>
              <div style={{ color: "#9ca3af", fontSize: 14, lineHeight: 1.6 }}>
                Il progetto è vuoto. Crea la prima entità per iniziare.
              </div>
            </div>

            {isCreatingEntity ? (
              <NewEntityForm
                entityTypes={entityTypes}
                entities={entities}
                initialType={createEntityType}
                onCancel={handleCancelCreateEntity}
                onCreate={handleCreateEntity}
              />
            ) : (
              <button
                type="button"
                onClick={() => handleOpenCreateEntity()}
                style={{
                  ...primaryButtonLargeStyle,
                  width: "fit-content",
                }}
              >
                + Nuova entità
              </button>
            )}
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "280px minmax(0, 1fr) 420px",
              gap: "16px",
              alignItems: "start",
            }}
          >
            <Sidebar
              entityTypes={entityTypes}
              entities={filteredEntities}
              allTags={allTags}
              selectedEntityId={selectedId}
              searchTerm={search}
              setSearchTerm={setSearch}
              typeFilter={archiveTypeFilter === "all" ? "all" : archiveTypeFilter}
              setTypeFilter={setArchiveTypeFilter}
              tagFilter={tagFilter}
              setTagFilter={setTagFilter}
              sortMode={sortMode}
              setSortMode={setSortMode}
              onSelectEntity={(id) => {
                setSelectedId(id);
                setNewTag("");
              }}
              isCreatingEntity={isCreatingEntity}
              createEntityType={createEntityType}
              onOpenCreateEntity={handleOpenCreateEntity}
              onCancelCreateEntity={handleCancelCreateEntity}
              onCreateEntity={handleCreateEntity}
              onCreateEntityType={handleCreateEntityType}
              searchInputRef={searchInputRef}
            />

            <div style={{ display: "grid", gap: "16px", minWidth: 0 }}>
              <EntityEditor
                entityTypes={entityTypes}
                entities={entities}
                relations={selectedEntityRelations}
                selectedEntity={selectedEntity}
                newTag={newTag}
                onUpdateEntity={updateSelectedEntity}
                onUpdateMetadataField={updateSelectedEntityMetadataField}
                onNewTagChange={setNewTag}
                onAddTag={addTag}
                onRemoveTag={removeTag}
                onDuplicateEntity={duplicateSelectedEntity}
                onDeleteEntity={deleteSelectedEntity}
                onOpenEntity={(id) => {
                  setSelectedId(id);
                  setNewTag("");
                }}
                onCenterInGraph={() => setView("graph")}
              />

              <div
                style={{
                  ...panelStyle,
                  border: "1px solid #263244",
                  boxShadow: "0 16px 40px rgba(0,0,0,0.18)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "12px",
                    flexWrap: "wrap",
                    marginBottom: "12px",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <uiIcons.timeline size={18} />
                      <h2 style={{ margin: 0 }}>Timeline eventi</h2>
                    </div>
                    <div
                      style={{
                        fontSize: "13px",
                        color: "#9ca3af",
                        marginTop: "4px",
                      }}
                    >
                      Lista cronologica degli eventi. Click su un evento per aprire la scheda.
                    </div>
                  </div>

                  <select
                    value={timelinePeriodFilter}
                    onChange={(e) => setTimelinePeriodFilter(e.target.value)}
                    style={{
                      minWidth: "220px",
                      padding: "10px 12px",
                      borderRadius: "10px",
                      border: "1px solid #374151",
                      backgroundColor: "#111827",
                      color: "#f3f4f6",
                    }}
                  >
                    <option value="all">Tutte le epoche</option>
                    {timelinePeriods.map((period) => (
                      <option key={period} value={period}>
                        {period}
                      </option>
                    ))}
                  </select>
                </div>

                {filteredTimelineEvents.length === 0 ? (
                  <div
                    style={{
                      backgroundColor: "#111827",
                      border: "1px solid #374151",
                      borderRadius: "14px",
                      padding: "14px",
                      color: "#9ca3af",
                      fontSize: "14px",
                    }}
                  >
                    Nessun evento trovato per il filtro selezionato.
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: "10px" }}>
                    {filteredTimelineEvents.map((event) => {
                      const isSelected = selectedEntity.id === event.entity.id;
                      const EventIcon = getEntityTypeIcon(event.entity.type);

                      return (
                        <button
                          key={event.entity.id}
                          type="button"
                          onClick={() => setSelectedId(event.entity.id)}
                          style={timelineItemStyle(isSelected)}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              gap: "10px",
                              flexWrap: "wrap",
                              marginBottom: "8px",
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
                              <div
                                style={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: "10px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  background: "rgba(59,130,246,0.14)",
                                  border: "1px solid rgba(59,130,246,0.24)",
                                  flexShrink: 0,
                                }}
                              >
                                <EventIcon size={15} />
                              </div>

                              <div style={{ fontWeight: 700, fontSize: "15px", minWidth: 0 }}>
                                {event.entity.name}
                              </div>
                            </div>

                            {event.stato ? (
                              <span
                                style={timelineBadgeStyle(
                                  getTimelineBadgeColor(event.stato)
                                )}
                              >
                                {event.stato}
                              </span>
                            ) : null}
                          </div>

                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: "8px",
                              marginBottom: "8px",
                            }}
                          >
                            {event.anno ? (
                              <span style={metaPillStyle()}>Anno: {event.anno}</span>
                            ) : null}

                            {event.epoca ? (
                              <span style={metaPillStyle()}>Epoca: {event.epoca}</span>
                            ) : null}

                            {event.ordineCronologico ? (
                              <span style={metaPillStyle()}>
                                Ordine: {event.ordineCronologico}
                              </span>
                            ) : null}
                          </div>

                          {event.entity.shortDescription ? (
                            <div style={{ fontSize: "13px", color: "#d1d5db" }}>
                              {event.entity.shortDescription}
                            </div>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <RelationsPanel
                entityTypes={entityTypes}
                entities={entities}
                relations={relations}
                selectedEntity={selectedEntity}
                availableRelationTargets={availableRelationTargets}
                selectedEntityRelations={selectedEntityRelations}
                relationType={relationType}
                relationInverseType={relationInverseType}
                relationTargetId={relationTargetId}
                relationPresets={RELATION_PRESETS}
                onRelationTypeChange={handleRelationTypeChange}
                onRelationInverseTypeChange={setRelationInverseType}
                onRelationTargetIdChange={setRelationTargetId}
                onAddRelation={addRelation}
                onDeleteRelation={deleteRelation}
                getEntityById={getEntityById}
              />
            </div>
          </div>
        )}
      </div>

      {!showEmptyState ? (
        <div
          ref={floatingMenuRef}
          style={{
            position: "fixed",
            right: "24px",
            bottom: "24px",
            zIndex: 60,
            display: "grid",
            gap: "10px",
            justifyItems: "end",
          }}
        >
          {isFloatingCreateOpen ? (
            <div
              style={{
                display: "grid",
                gap: "8px",
                backgroundColor: "#111827",
                border: "1px solid #374151",
                borderRadius: "16px",
                padding: "12px",
                boxShadow: "0 20px 40px rgba(0,0,0,0.32)",
                minWidth: "220px",
              }}
            >
              {quickCreateOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleOpenCreateEntity(option.value)}
                  style={{
                    ...ghostButtonStyle,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "12px",
                    width: "100%",
                    borderRadius: "12px",
                    padding: "12px 14px",
                  }}
                >
                  <span>{option.label}</span>
                  <span
                    style={{
                      width: "10px",
                      height: "10px",
                      borderRadius: "999px",
                      backgroundColor: option.color,
                      flexShrink: 0,
                    }}
                  />
                </button>
              ))}
            </div>
          ) : null}

          <button
            type="button"
            aria-label="Apri creazione rapida"
            onClick={() => setIsFloatingCreateOpen((current) => !current)}
            style={{
              width: "62px",
              height: "62px",
              borderRadius: "999px",
              border: "none",
              backgroundColor: "#2563eb",
              color: "#ffffff",
              fontSize: "34px",
              lineHeight: 1,
              cursor: "pointer",
              boxShadow: "0 18px 38px rgba(37,99,235,0.35)",
              fontWeight: 500,
            }}
          >
            {isFloatingCreateOpen ? "×" : "+"}
          </button>
        </div>
      ) : null}
    </div>
  );
}