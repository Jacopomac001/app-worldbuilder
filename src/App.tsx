import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MarkerType, type Edge, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import WorldDashboard from "./components/WorldDashboard";
import GraphView from "./components/GraphView";
import Sidebar from "./components/Sidebar";
import EntityEditor from "./components/EntityEditor";
import RelationsPanel from "./components/RelationsPanel";
import NewEntityForm from "./components/NewEntityForm";
import TimelineWorkbench from "./components/TimelineWorkbench";
import ImportAssistantModal from "./components/ImportAssistantModal";
import ReaderModeView from "./components/ReaderModeView";
import AutomationStudio from "./components/AutomationStudio";
import NarrativePackageModal from "./components/NarrativePackageModal";

import type {
  FocusedGraphFilter,
  GraphNeighborhoodDepth,
  GraphViewMode,
} from "./components/GraphPanel";

import {
  DEFAULT_RELATION_PRESET_INDEX,
  UI_TEXT,
} from "./config";

import {
  cinematicTypography,
  ghostButtonStyle,
  pageContainerStyle,
  pageStyle,
  panelStyle,
  primaryButtonLargeStyle,
  purpleButtonLargeStyle,
  secondaryButtonLargeStyle,
  successButtonLargeStyle,
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
import { useViewportWidth } from "./hooks/useViewportWidth";
import { useWorkspaceState } from "./hooks/useWorkspaceState";
import type {
  DndStats,
  Entity,
  EntityType,
  EntityTypeDefinition,
  MetadataFieldDefinition,
  Relation,
  RelationAutomationRule,
  SemanticViewId,
  WorkspacePreset,
  WorldData,
} from "./types";
import type {
  ImportEntityReview,
  RelationSuggestion,
} from "./utils/worldData";
import {
  buildDefaultGraphTypeFilters,
  buildNarrativePackageScope,
  classifyImportEntities,
  getTimelineBadgeColor,
  mergeEntityTypesForImport,
} from "./utils/worldData";
import {
  DEFAULT_RELATION_AUTOMATION_RULES,
  SEMANTIC_VIEW_REGISTRY,
  WORLD_DATA_VERSION,
} from "./worldbuilderRegistry";
import { removePersistedValue } from "./utils/persistentStorage";

type PreparedImportDraft = WorldDataWithImages;

type PendingImportPreview = {
  fileName: string;
  mode: "merge" | "replace";
  draft: PreparedImportDraft;
  mergedEntityTypes: EntityTypeDefinition[];
  entityReviews: ImportEntityReview[];
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
  metaLabel?: string;
};

type DndStatStringKey = Exclude<keyof DndStats, "enabled">;

const DND_STAT_KEYS: DndStatStringKey[] = [
  "livello",
  "classe",
  "ca",
  "puntiFerita",
  "velocita",
  "iniziativa",
  "bonusCompetenza",
  "dadoVita",
  "forza",
  "destrezza",
  "costituzione",
  "intelligenza",
  "saggezza",
  "carisma",
  "armiEquipaggiate",
  "equipaggiamento",
  "sensi",
  "linguaggi",
  "competenze",
  "challengeRating",
  "note",
];

const RELATION_TYPE_PLACE_LINKS = new Set(["abita in", "si svolge in", "si trova in", "controlla", "proviene da"]);


const ENTITY_TYPES_STORAGE_KEY = "worldbuilder_entity_types";
const AUTOMATION_RULES_STORAGE_KEY = "worldbuilder_relation_automation_rules_v1";
const WORKSPACE_PRESETS_STORAGE_KEY = "worldbuilder_workspace_presets_v1";
const WORKSPACE_GUIDE_STORAGE_KEY = "worldbuilder_workspace_quickstart_v1";

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
        key: "siTrovaIn",
        label: "Si trova in",
        kind: "entity-reference",
        placeholder: "Es. Ducato del Nord",
        allowedEntityTypes: ["luogo"],
        relationType: "si trova in",
        relationInverseType: "contiene",
        autoCreateTarget: false,
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
        key: "razza",
        label: "Razza",
        kind: "text",
        placeholder: "Es. Tiefling / Nano delle colline",
      },
      {
        key: "padre",
        label: "Padre",
        kind: "entity-reference",
        placeholder: "Es. Armand",
        allowedEntityTypes: ["personaggio"],
        relationType: "figlio di",
        relationInverseType: "ha come figlio",
        autoCreateTarget: false,
      },
      {
        key: "madre",
        label: "Madre",
        kind: "entity-reference",
        placeholder: "Es. Lyra",
        allowedEntityTypes: ["personaggio"],
        relationType: "figlio di",
        relationInverseType: "ha come figlio",
        autoCreateTarget: false,
      },
      {
        key: "coniuge",
        label: "Coniuge / partner",
        kind: "entity-reference",
        placeholder: "Es. Elira",
        allowedEntityTypes: ["personaggio"],
        relationType: "coniuge di",
        relationInverseType: "coniuge di",
        autoCreateTarget: false,
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

function normalizeDndStats(rawStats: unknown): DndStats | undefined {
  if (!rawStats || typeof rawStats !== "object") return undefined;

  const input = rawStats as Partial<Record<keyof DndStats, unknown>>;
  const next: Partial<Record<DndStatStringKey, string>> & Pick<DndStats, "enabled"> = {};

  if (typeof input.enabled === "boolean") {
    next.enabled = input.enabled;
  }

  DND_STAT_KEYS.forEach((key) => {
    const value = input[key];
    if (typeof value !== "string") return;
    const normalized = normalizeText(value);
    if (normalized) {
      next[key] = normalized;
    }
  });

  return Object.keys(next).length > 0 ? next : undefined;
}

function findMetadataRelationTarget(
  sourceEntityId: string,
  rawFieldKeys: string[],
  relations: Relation[]
): string | null {
  const fieldKeys = new Set(rawFieldKeys.map((key) => key.trim().toLowerCase()).filter(Boolean));

  for (const relation of relations) {
    if (relation.fromEntityId !== sourceEntityId) continue;

    const sourceFieldKey = relation.sourceFieldKey?.trim().toLowerCase();
    if (sourceFieldKey && fieldKeys.has(sourceFieldKey)) {
      return relation.toEntityId;
    }

    if (!sourceFieldKey && RELATION_TYPE_PLACE_LINKS.has(normalizeRelationType(relation.type))) {
      return relation.toEntityId;
    }
  }

  return null;
}

function enrichEntitiesWithDerivedMetadata(
  rawEntities: Entity[],
  relations: Relation[]
): Entity[] {
  const entityMap = new Map(rawEntities.map((entity) => [entity.id, entity] as const));

  function resolvePlaceHierarchy(placeId: string | null) {
    if (!placeId) {
      return { placeName: "", regionName: "" };
    }

    const visited = new Set<string>();
    let currentPlaceId: string | null = placeId;
    let firstPlaceName = "";
    let topPlaceName = "";
    let depth = 0;

    while (currentPlaceId && !visited.has(currentPlaceId)) {
      visited.add(currentPlaceId);
      const currentPlace = entityMap.get(currentPlaceId);
      if (!currentPlace || currentPlace.type !== "luogo") {
        break;
      }

      if (!firstPlaceName) {
        firstPlaceName = currentPlace.name;
      }

      topPlaceName = currentPlace.name;
      const explicitRegion = currentPlace.metadata?.regione?.trim();
      const parentPlaceId = findMetadataRelationTarget(currentPlace.id, ["sitrovain"], relations);

      if (!parentPlaceId) {
        return {
          placeName: firstPlaceName,
          regionName: explicitRegion || (depth > 0 ? topPlaceName : ""),
        };
      }

      depth += 1;
      currentPlaceId = parentPlaceId;
    }

    return { placeName: firstPlaceName, regionName: topPlaceName };
  }

  return rawEntities.map((entity) => {
    const metadata = { ...(entity.metadata ?? {}) };
    let locationRelationId: string | null = null;

    if (entity.type === "luogo") {
      locationRelationId = entity.id;
    } else if (entity.type === "personaggio") {
      locationRelationId = findMetadataRelationTarget(entity.id, ["abitain"], relations);
    } else if (entity.type === "fazione") {
      locationRelationId = findMetadataRelationTarget(entity.id, ["territorio"], relations);
    } else if (entity.type === "evento") {
      locationRelationId = findMetadataRelationTarget(entity.id, ["luogo"], relations);
    } else if (entity.type === "oggetto") {
      locationRelationId = findMetadataRelationTarget(entity.id, ["origine"], relations);
      const maybePlace = locationRelationId ? entityMap.get(locationRelationId) : null;
      if (maybePlace?.type !== "luogo") {
        locationRelationId = null;
      }
    }

    const geography = resolvePlaceHierarchy(locationRelationId);

    if (entity.type !== "luogo" && geography.placeName && !metadata.luogo?.trim()) {
      metadata.luogo = geography.placeName;
    }

    if (geography.regionName && !metadata.regione?.trim()) {
      metadata.regione = geography.regionName;
    }

    return {
      ...entity,
      metadata,
    };
  });
}

function hashStringToIndex(value: string, modulo: number) {
  if (!value || modulo <= 0) return 0;

  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash % modulo;
}

function getRegionAccentColor(baseTypeColor: string, regionName: string | undefined) {
  if (!regionName?.trim()) return baseTypeColor;

  const palette = [
    "#60a5fa",
    "#34d399",
    "#f59e0b",
    "#c084fc",
    "#f472b6",
    "#2dd4bf",
  ];

  return palette[hashStringToIndex(regionName.trim().toLowerCase(), palette.length)] ?? baseTypeColor;
}

function buildGraphMetaLabel(entity: Entity) {
  const metadata = entity.metadata ?? {};
  const parts: string[] = [];

  if (entity.type === "personaggio") {
    const race = metadata.razza?.trim();
    const region = metadata.regione?.trim();
    const place = metadata.luogo?.trim();

    if (race) parts.push(race);
    if (region) parts.push(`Regione: ${region}`);
    else if (place) parts.push(`Luogo: ${place}`);

    return parts.slice(0, 2).join(" · ");
  }

  if (entity.type === "luogo") {
    const region = metadata.regione?.trim();
    if (region && region.toLowerCase() !== entity.name.trim().toLowerCase()) {
      return `Regione: ${region}`;
    }
    return region || "";
  }

  if (entity.type === "fazione") {
    const region = metadata.regione?.trim();
    const territory = metadata.territorio?.trim();
    if (region) parts.push(`Regione: ${region}`);
    if (territory) parts.push(`Territorio: ${territory}`);
    return parts.slice(0, 2).join(" · ");
  }

  if (entity.type === "evento") {
    const place = metadata.luogo?.trim();
    const region = metadata.regione?.trim();
    if (place) parts.push(place);
    if (region) parts.push(region);
    return parts.slice(0, 2).join(" · ");
  }

  if (entity.type === "oggetto") {
    const origin = metadata.origine?.trim();
    const region = metadata.regione?.trim();
    if (origin) parts.push(`Origine: ${origin}`);
    if (region) parts.push(region);
    return parts.slice(0, 2).join(" · ");
  }

  return metadata.regione?.trim() ?? "";
}

function relationMatchesGraphFilter(relation: Relation, graphRelationFilter: string) {
  const normalizedFilter = normalizeRelationType(graphRelationFilter);
  if (!normalizedFilter || normalizedFilter === "all") return true;
  return normalizeRelationType(relation.type) === normalizedFilter;
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

function buildImportedEntityName(entities: Entity[], source: Entity): string {
  const baseName = `${source.name} (import)`;

  if (!hasDuplicateEntityName(entities, source.type, baseName)) {
    return baseName;
  }

  let copyIndex = 2;
  while (hasDuplicateEntityName(entities, source.type, `${baseName} ${copyIndex}`)) {
    copyIndex += 1;
  }

  return `${baseName} ${copyIndex}`;
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
                .filter(
                  (field: MetadataFieldDefinition | null): field is MetadataFieldDefinition =>
                    field !== null
                )
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
    const existing = map.get(item.id);

    if (!existing) {
      map.set(item.id, item);
      return;
    }

    const existingFields = existing.fields ?? [];
    const incomingFields = item.fields ?? [];
    const fieldMap = new Map<string, MetadataFieldDefinition>();

    existingFields.forEach((field) => fieldMap.set(field.key, field));
    incomingFields.forEach((field) => {
      const current = fieldMap.get(field.key);
      fieldMap.set(field.key, current ? { ...field, ...current } : field);
    });

    map.set(item.id, {
      ...existing,
      ...item,
      builtIn: Boolean(existing.builtIn || item.builtIn),
      fields: Array.from(fieldMap.values()),
    });
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
  graphTypeFilters: Record<string, boolean>,
  graphNeighborhoodDepth: GraphNeighborhoodDepth,
  graphRelationFilter: string
) {
  const allowedRelations = relations.filter((relation) =>
    relationMatchesGraphFilter(relation, graphRelationFilter)
  );
  const graphEntityIds = new Set<string>([selectedEntity.id]);
  let frontier = new Set<string>([selectedEntity.id]);

  for (let depth = 1; depth <= graphNeighborhoodDepth; depth += 1) {
    const nextFrontier = new Set<string>();

    allowedRelations.forEach((relation) => {
      if (graphFilter === "all" || graphFilter === "outgoing") {
        if (frontier.has(relation.fromEntityId) && relation.toEntityId !== selectedEntity.id) {
          nextFrontier.add(relation.toEntityId);
        }
      }

      if (graphFilter === "all" || graphFilter === "incoming") {
        if (frontier.has(relation.toEntityId) && relation.fromEntityId !== selectedEntity.id) {
          nextFrontier.add(relation.fromEntityId);
        }
      }
    });

    frontier = new Set(
      [...nextFrontier].filter((entityId) => {
        if (entityId === selectedEntity.id) return true;
        const entity = entities.find((candidate) => candidate.id === entityId);
        if (!entity) return false;
        return Boolean(graphTypeFilters[entity.type]);
      })
    );

    frontier.forEach((entityId) => graphEntityIds.add(entityId));
  }

  const allowedEntityIds = new Set<string>();

  entities.forEach((entity) => {
    const isSelected = entity.id === selectedEntity.id;
    if (isSelected || graphTypeFilters[entity.type]) {
      allowedEntityIds.add(entity.id);
    }
  });

  const filteredGraphEntityIds = new Set(
    [...graphEntityIds].filter((id) => allowedEntityIds.has(id))
  );

  const localEntities = entities.filter((entity) => filteredGraphEntityIds.has(entity.id));

  const localRelations = allowedRelations.filter((relation) => {
    const bothInside =
      filteredGraphEntityIds.has(relation.fromEntityId) &&
      filteredGraphEntityIds.has(relation.toEntityId);

    if (!bothInside) return false;
    return true;
  });

  return {
    localEntities,
    localRelations,
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
    const baseAccentColor = getTypeColor(entity.type, entityTypes);
    const accentColor =
      entity.type === "personaggio"
        ? getRegionAccentColor(baseAccentColor, entity.metadata?.regione)
        : baseAccentColor;
    const typeLabel = getTypeLabel(entity.type, entityTypes);
    const metaLabel = buildGraphMetaLabel(entity);
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
        metaLabel: metaLabel || undefined,
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
        stats: normalizeDndStats(entity?.stats),
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


type ImageAssetRecord = {
  id: string;
  dataUrl: string;
  mimeType?: string;
};

type WorldDataWithImages = WorldData & {
  imageAssets?: ImageAssetRecord[];
};

const IMAGE_DB_NAME = "worldbuilder-assets";
const IMAGE_STORE_NAME = "images";
const IMAGE_ASSET_PREFIX = "asset://";

function openImageAssetDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(IMAGE_DB_NAME, 1);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(IMAGE_STORE_NAME)) {
        database.createObjectStore(IMAGE_STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Impossibile aprire IndexedDB"));
  });
}

function isAssetImageRef(value?: string | null): boolean {
  return typeof value === "string" && value.startsWith(IMAGE_ASSET_PREFIX);
}

function buildAssetImageRef(assetId: string): string {
  return `${IMAGE_ASSET_PREFIX}${assetId}`;
}

function parseAssetImageRef(value?: string | null): string | null {
  if (!isAssetImageRef(value)) return null;
  return String(value).slice(IMAGE_ASSET_PREFIX.length) || null;
}

function getAssetIdsFromImageRefs(imageRefs: Array<string | undefined | null>): string[] {
  return Array.from(
    new Set(
      imageRefs
        .map((imageRef) => parseAssetImageRef(imageRef))
        .filter((assetId): assetId is string => Boolean(assetId))
    )
  );
}

function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(",");
  if (parts.length < 2) {
    throw new Error("Data URL non valido");
  }

  const header = parts[0] ?? "";
  const body = parts.slice(1).join(",");
  const mimeMatch = header.match(/data:(.*?);base64/);
  const mimeType = mimeMatch?.[1] || "application/octet-stream";
  const binary = window.atob(body);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: mimeType });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Impossibile convertire il blob in data URL"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Errore FileReader"));
    reader.readAsDataURL(blob);
  });
}

async function getImageBlobByAssetId(assetId: string): Promise<Blob | null> {
  const database = await openImageAssetDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(IMAGE_STORE_NAME, "readonly");
    const store = transaction.objectStore(IMAGE_STORE_NAME);
    const request = store.get(assetId);

    request.onsuccess = () => {
      database.close();
      const result = request.result;
      resolve(result instanceof Blob ? result : null);
    };
    request.onerror = () => {
      database.close();
      reject(request.error ?? new Error("Impossibile leggere l'immagine"));
    };
  });
}

async function putImageBlob(blob: Blob, forcedId?: string): Promise<string> {
  const database = await openImageAssetDatabase();

  return new Promise((resolve, reject) => {
    const assetId = forcedId ?? crypto.randomUUID();
    const transaction = database.transaction(IMAGE_STORE_NAME, "readwrite");
    const store = transaction.objectStore(IMAGE_STORE_NAME);

    transaction.oncomplete = () => {
      database.close();
      resolve(assetId);
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error("Impossibile salvare l'immagine"));
    };

    store.put(blob, assetId);
  });
}

async function saveDataUrlImageAsAssetRef(dataUrl: string): Promise<string> {
  const blob = dataUrlToBlob(dataUrl);
  const assetId = await putImageBlob(blob);
  return buildAssetImageRef(assetId);
}

async function collectImageAssetsForExport(
  imageRefs: string[]
): Promise<ImageAssetRecord[]> {
  const uniqueAssetIds = Array.from(
    new Set(
      imageRefs
        .map((imageRef) => parseAssetImageRef(imageRef))
        .filter((assetId): assetId is string => Boolean(assetId))
    )
  );

  const assets = await Promise.all(
    uniqueAssetIds.map(async (assetId): Promise<ImageAssetRecord | null> => {
      const blob = await getImageBlobByAssetId(assetId);
      if (!blob) return null;

      return {
        id: assetId,
        dataUrl: await blobToDataUrl(blob),
        ...(blob.type ? { mimeType: blob.type } : {}),
      };
    })
  );

  return assets.filter((asset): asset is ImageAssetRecord => asset !== null);
}


async function importImageAssetsFromWorldData(imageAssets?: ImageAssetRecord[]): Promise<void> {
  if (!Array.isArray(imageAssets) || imageAssets.length === 0) return;

  for (const asset of imageAssets) {
    if (!asset || typeof asset.id !== "string" || typeof asset.dataUrl !== "string") {
      continue;
    }

    const blob = dataUrlToBlob(asset.dataUrl);
    await putImageBlob(blob, asset.id);
  }
}

async function deleteAllImageAssets(): Promise<void> {
  const database = await openImageAssetDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(IMAGE_STORE_NAME, "readwrite");
    const store = transaction.objectStore(IMAGE_STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => {
      database.close();
      resolve();
    };
    request.onerror = () => {
      database.close();
      reject(request.error ?? new Error("Impossibile cancellare le immagini"));
    };
  });
}

async function deleteImageAssetById(assetId: string): Promise<void> {
  const database = await openImageAssetDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(IMAGE_STORE_NAME, "readwrite");
    const store = transaction.objectStore(IMAGE_STORE_NAME);
    const request = store.delete(assetId);

    request.onsuccess = () => {
      database.close();
      resolve();
    };
    request.onerror = () => {
      database.close();
      reject(request.error ?? new Error("Impossibile cancellare l'immagine"));
    };
  });
}

async function deleteImageAssetsByIds(assetIds: string[]): Promise<void> {
  const uniqueAssetIds = Array.from(new Set(assetIds.filter(Boolean)));
  await Promise.all(
    uniqueAssetIds.map((assetId) => deleteImageAssetById(assetId))
  );
}

export default function App() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const floatingMenuRef = useRef<HTMLDivElement | null>(null);
  const viewportWidth = useViewportWidth();
  const isCompactWorkspace = viewportWidth < 1240;
  const isStackedWorkspace = viewportWidth < 940;
  const isCompactTopBar = viewportWidth < 1040;

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

  const sanitizedEntities = useMemo(() => sanitizeEntities(rawEntities), [rawEntities]);
  const relations = useMemo(() => sanitizeRelations(rawRelations), [rawRelations]);

  const [rawEntityTypes, setRawEntityTypes] = useLocalStorageState<EntityTypeDefinition[]>(
    ENTITY_TYPES_STORAGE_KEY,
    DEFAULT_ENTITY_TYPES
  );

  const entityTypes = useMemo(
    () => sanitizeEntityTypes(rawEntityTypes, sanitizedEntities),
    [rawEntityTypes, sanitizedEntities]
  );

  const entities = useMemo(
    () => enrichEntitiesWithDerivedMetadata(sanitizedEntities, relations),
    [sanitizedEntities, relations]
  );

  const [packageModalOpen, setPackageModalOpen] = useState(false);
  const [pendingImportPreview, setPendingImportPreview] =
    useState<PendingImportPreview | null>(null);
  const [isApplyingImport, setIsApplyingImport] = useState(false);
  const [relationAutomationRules, setRelationAutomationRules] =
    useLocalStorageState<RelationAutomationRule[]>(
      AUTOMATION_RULES_STORAGE_KEY,
      DEFAULT_RELATION_AUTOMATION_RULES
    );
  const [workspacePresets, setWorkspacePresets] = useLocalStorageState<WorkspacePreset[]>(
    WORKSPACE_PRESETS_STORAGE_KEY,
    []
  );
  const [workspaceGuideState, setWorkspaceGuideState] = useLocalStorageState<{
    dismissed: boolean;
  }>(WORKSPACE_GUIDE_STORAGE_KEY, { dismissed: false });

  const {
    selectedId,
    setSelectedId,
    view,
    setView,
    search,
    setSearch,
    archiveTypeFilter,
    setArchiveTypeFilter,
    tagFilter,
    setTagFilter,
    sortMode,
    setSortMode,
    semanticView,
    setSemanticView,
    isCreatingEntity,
    setIsCreatingEntity,
    createEntityType,
    setCreateEntityType,
    isFloatingCreateOpen,
    setIsFloatingCreateOpen,
    newTag,
    setNewTag,
    relationType,
    setRelationType,
    relationInverseType,
    setRelationInverseType,
    relationTargetId,
    setRelationTargetId,
    graphViewMode,
    setGraphViewMode,
    graphFilter,
    setGraphFilter,
    graphViewType,
    setGraphViewType,
    graphViewTag,
    setGraphViewTag,
    graphRelationFilter,
    setGraphRelationFilter,
    graphNeighborhoodDepth,
    setGraphNeighborhoodDepth,
    graphTypeFilters,
    setGraphTypeFilters,
    timelinePeriodFilter,
    setTimelinePeriodFilter,
    workspaceRailView,
    setWorkspaceRailView,
    isWorkspaceToolsOpen,
    setIsWorkspaceToolsOpen,
    allTags,
    filteredEntities,
    selectedEntity,
    relationSuggestions,
    semanticScope,
    availableRelationTargets,
    selectedEntityRelations,
    timelineEvents,
    timelinePeriods,
    workspaceRailTabs,
    quickCreateOptions,
    toggleGraphTypeFilter,
  } = useWorkspaceState({
    entities,
    relations,
    entityTypes,
    relationAutomationRules,
    initialSelectedId: initialEntities[0]?.id ?? "",
    defaultRelationType: RELATION_PRESETS[DEFAULT_RELATION_PRESET_INDEX]?.type ?? "",
    defaultRelationInverseType:
      RELATION_PRESETS[DEFAULT_RELATION_PRESET_INDEX]?.inverseType ?? "",
  });

  const showWorkspaceGuide =
    view === "workspace" &&
    !workspaceGuideState.dismissed &&
    (entities.length <= 12 || relations.length <= 18);

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
  }, [setIsFloatingCreateOpen]);

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

  function handleUpdateEntityType(nextTypeInput: EntityTypeDefinition): boolean {
    const currentType = entityTypes.find((type) => type.id === nextTypeInput.id);

    if (!currentType || currentType.builtIn) {
      alert("Puoi modificare solo tipi custom esistenti.");
      return false;
    }

    const normalizedLabel = normalizeText(nextTypeInput.label ?? "");
    if (!normalizedLabel) {
      alert("Il nome del tipo è obbligatorio.");
      return false;
    }

    const duplicateLabel = entityTypes.some(
      (type) =>
        type.id !== currentType.id &&
        normalizeText(type.label).toLowerCase() === normalizedLabel.toLowerCase()
    );

    if (duplicateLabel) {
      alert("Esiste già un tipo con questo nome.");
      return false;
    }

    const nextFields: MetadataFieldDefinition[] = (nextTypeInput.fields ?? []).map((field) => ({
      key: field.key.trim(),
      label: normalizeText(field.label ?? ""),
      kind:
        field.kind === "textarea" || field.kind === "entity-reference"
          ? field.kind
          : "text",
      placeholder: normalizeText(field.placeholder ?? "") || undefined,
      required: Boolean(field.required) || undefined,
      allowedEntityTypes:
        field.kind === "entity-reference" && Array.isArray(field.allowedEntityTypes)
          ? field.allowedEntityTypes.filter((typeId) =>
              entityTypes.some((type) => type.id === typeId)
            )
          : undefined,
      relationType:
        field.kind === "entity-reference"
          ? normalizeText(field.relationType ?? "") || undefined
          : undefined,
      relationInverseType:
        field.kind === "entity-reference"
          ? normalizeText(field.relationInverseType ?? "") || undefined
          : undefined,
      autoCreateTarget:
        field.kind === "entity-reference" && field.autoCreateTarget
          ? true
          : undefined,
      autoCreateTargetType:
        field.kind === "entity-reference" &&
        typeof field.autoCreateTargetType === "string" &&
        entityTypes.some((type) => type.id === field.autoCreateTargetType)
          ? field.autoCreateTargetType
          : undefined,
    }));

    if (nextFields.some((field) => !field.key || !field.label)) {
      alert("Ogni campo deve avere almeno chiave ed etichetta.");
      return false;
    }

    const fieldKeySet = new Set<string>();
    for (const field of nextFields) {
      const normalizedKey = field.key.toLowerCase();
      if (fieldKeySet.has(normalizedKey)) {
        alert(`La chiave campo "${field.key}" è duplicata.`);
        return false;
      }
      fieldKeySet.add(normalizedKey);
    }

    const entitiesOfType = entities.filter((entity) => entity.type === currentType.id);
    const nextFieldKeys = new Set(nextFields.map((field) => field.key));
    const removedFieldKeys = (currentType.fields ?? [])
      .map((field) => field.key)
      .filter((fieldKey) => !nextFieldKeys.has(fieldKey));

    const blockedFieldKey = removedFieldKeys.find((fieldKey) =>
      entitiesOfType.some((entity) => entity.metadata?.[fieldKey]?.trim())
    );

    if (blockedFieldKey) {
      alert(
        `Il campo "${blockedFieldKey}" contiene ancora dati in alcune entità. Svuotalo prima di rimuoverlo o rinominarlo.`
      );
      return false;
    }

    const nextType: EntityTypeDefinition = {
      ...currentType,
      label: normalizedLabel,
      color: nextTypeInput.color?.trim() || currentType.color,
      fields: nextFields,
    };

    const disabledMetadataRelationFieldKeys = (currentType.fields ?? [])
      .filter((field) => field.kind === "entity-reference")
      .map((field) => field.key)
      .filter((fieldKey) => {
        const nextField = nextFields.find((field) => field.key === fieldKey);
        if (!nextField) return true;
        if (nextField.kind !== "entity-reference") return true;
        return !normalizeText(nextField.relationType ?? "");
      });

    const entityIdSet = new Set(entitiesOfType.map((entity) => entity.id));
    const nowIso = new Date().toISOString();
    const nowMs = Date.now();

    setRawEntityTypes((current) =>
      sanitizeEntityTypes(current).map((type) =>
        type.id === nextType.id ? nextType : type
      )
    );

    setRawEntities((current) =>
      sanitizeEntities(current).map((entity) => {
        if (entity.type !== nextType.id) return entity;

        const metadata = Object.fromEntries(
          nextFields.map((field) => [
            field.key,
            normalizeMetadataValue(entity.metadata?.[field.key] ?? ""),
          ])
        );

        return {
          ...entity,
          metadata,
          updatedAt: nowIso,
          lastModified: nowMs,
        };
      })
    );

    if (disabledMetadataRelationFieldKeys.length > 0) {
      const disabledFieldKeySet = new Set(disabledMetadataRelationFieldKeys);

      setRawRelations((current) =>
        sanitizeRelations(current).filter(
          (relation) =>
            !(
              relation.source === "metadata" &&
              entityIdSet.has(relation.fromEntityId) &&
              relation.sourceFieldKey &&
              disabledFieldKeySet.has(relation.sourceFieldKey)
            )
        )
      );
    }

    return true;
  }

  function handleDeleteEntityType(typeId: EntityType): boolean {
    const currentType = entityTypes.find((type) => type.id === typeId);

    if (!currentType || currentType.builtIn) {
      alert("Puoi eliminare solo tipi custom.");
      return false;
    }

    const usageCount = entities.filter((entity) => entity.type === typeId).length;
    if (usageCount > 0) {
      alert(
        `Il tipo "${currentType.label}" è ancora usato da ${usageCount} entità. Sposta o elimina prima quelle entità.`
      );
      return false;
    }

    const confirmed = window.confirm(
      `Vuoi davvero eliminare il tipo "${currentType.label}"?`
    );
    if (!confirmed) return false;

    setRawEntityTypes((current) =>
      sanitizeEntityTypes(current).filter((type) => type.id !== typeId || type.builtIn)
    );

    if (createEntityType === typeId) {
      setCreateEntityType(entityTypes[0]?.id ?? "luogo");
    }

    if (archiveTypeFilter === typeId) {
      setArchiveTypeFilter("all");
    }

    if (graphViewType === typeId) {
      setGraphViewType("all");
    }

    setGraphTypeFilters((current) => {
      const next = { ...current };
      delete next[typeId];
      return next;
    });

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

  const deleteSelectedEntity = useCallback(() => {
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

    const remainingEntities = entities.filter(
      (entity) => entity.id !== selectedEntity.id
    );
    setSelectedId(remainingEntities[0]?.id ?? "");
    setNewTag("");
    setRelationTargetId("");
  }, [entities, selectedEntity, setNewTag, setRawEntities, setRawRelations, setRelationTargetId, setSelectedId]);

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
  }, [
    deleteSelectedEntity,
    isCreatingEntity,
    isFloatingCreateOpen,
    selectedEntity,
    setIsCreatingEntity,
    setIsFloatingCreateOpen,
  ]);

  function resetAllData() {
    const confirmed = window.confirm(
      "Vuoi davvero cancellare tutti i dati salvati e ripartire da zero?"
    );
    if (!confirmed) return;

    void deleteAllImageAssets().catch((error) => {
      console.error(error);
    });

    localStorage.removeItem(ENTITIES_STORAGE_KEY);
    localStorage.removeItem(RELATIONS_STORAGE_KEY);
    localStorage.removeItem(ENTITY_TYPES_STORAGE_KEY);
    localStorage.removeItem(AUTOMATION_RULES_STORAGE_KEY);
    localStorage.removeItem(WORKSPACE_PRESETS_STORAGE_KEY);

    void Promise.all([
      removePersistedValue(ENTITIES_STORAGE_KEY),
      removePersistedValue(RELATIONS_STORAGE_KEY),
      removePersistedValue(ENTITY_TYPES_STORAGE_KEY),
      removePersistedValue(AUTOMATION_RULES_STORAGE_KEY),
      removePersistedValue(WORKSPACE_PRESETS_STORAGE_KEY),
    ]).catch((error) => {
      console.error(error);
    });

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
    setSemanticView("default");
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
    setGraphRelationFilter("all");
    setGraphNeighborhoodDepth(2);
    setTimelinePeriodFilter("all");
    setGraphTypeFilters(buildDefaultGraphTypeFilters(DEFAULT_ENTITY_TYPES));
    setIsFloatingCreateOpen(false);
    setPendingImportPreview(null);
    setPackageModalOpen(false);
    setRelationAutomationRules(DEFAULT_RELATION_AUTOMATION_RULES);
    setWorkspacePresets([]);
  }

  async function exportData() {
    try {
      const imageAssets = await collectImageAssetsForExport(
        entities.map((entity) => entity.image ?? "")
      );

      const data: WorldDataWithImages = {
        version: WORLD_DATA_VERSION,
        entityTypes,
        entities,
        relations,
        imageAssets,
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
    } catch (error) {
      console.error(error);
      window.alert("Impossibile esportare il backup completo con le immagini.");
    }
  }

  function isValidWorldData(data: unknown): data is WorldData {
    if (!data || typeof data !== "object") return false;

    const candidate = data as WorldDataWithImages;

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

    const imageAssetsValid =
      typeof candidate.imageAssets === "undefined" ||
      candidate.imageAssets.every((item) => {
        return (
          item &&
          typeof item.id === "string" &&
          typeof item.dataUrl === "string" &&
          (typeof item.mimeType === "undefined" || typeof item.mimeType === "string")
        );
      });

    return entitiesValid && relationsValid && entityTypesValid && imageAssetsValid;
  }

  function buildImportDraft(parsed: WorldDataWithImages): PreparedImportDraft {
    const importedEntities = sanitizeEntities(parsed.entities);
    const importedEntityIdSet = new Set(importedEntities.map((entity) => entity.id));
    const importedEntityTypes = sanitizeEntityTypes(
      parsed.entityTypes ?? DEFAULT_ENTITY_TYPES,
      importedEntities
    );

    const importedRelations = parsed.relations
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
          importedEntityIdSet.has(relation.fromEntityId) &&
          importedEntityIdSet.has(relation.toEntityId)
      );

    return {
      entityTypes: importedEntityTypes,
      entities: importedEntities,
      relations: importedRelations,
      imageAssets: parsed.imageAssets,
    };
  }

  async function materializeImportDraft(
    draft: PreparedImportDraft
  ): Promise<PreparedImportDraft> {
    const importedEntities = await Promise.all(
      draft.entities.map(async (entity) => {
        if (
          typeof entity.image === "string" &&
          entity.image.startsWith("data:image/")
        ) {
          try {
            const image = await saveDataUrlImageAsAssetRef(entity.image);
            return { ...entity, image };
          } catch (error) {
            console.error(error);
          }
        }

        return entity;
      })
    );

    await importImageAssetsFromWorldData(draft.imageAssets);

    const importedEntityIdSet = new Set(importedEntities.map((entity) => entity.id));
    const importedRelations = draft.relations.filter(
      (relation) =>
        importedEntityIdSet.has(relation.fromEntityId) &&
        importedEntityIdSet.has(relation.toEntityId)
    );

    return {
      ...draft,
      entityTypes: sanitizeEntityTypes(draft.entityTypes ?? DEFAULT_ENTITY_TYPES, importedEntities),
      entities: importedEntities,
      relations: importedRelations,
    };
  }

  function resetWorkspaceUi(nextEntityTypes: EntityTypeDefinition[], nextSelectedId: string) {
    setSelectedId(nextSelectedId);
    setSearch("");
    setArchiveTypeFilter("all");
    setTagFilter("");
    setSortMode("lastModified-desc");
    setIsCreatingEntity(false);
    setCreateEntityType(nextEntityTypes[0]?.id ?? "luogo");
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
    setGraphRelationFilter("all");
    setGraphNeighborhoodDepth(2);
    setTimelinePeriodFilter("all");
    setGraphTypeFilters(buildDefaultGraphTypeFilters(nextEntityTypes));
    setIsFloatingCreateOpen(false);
  }

  function applyReplaceImport(draft: PreparedImportDraft) {
    const currentAssetIds = getAssetIdsFromImageRefs(entities.map((entity) => entity.image));
    const importedAssetIds = new Set(
      getAssetIdsFromImageRefs(draft.entities.map((entity) => entity.image))
    );
    const obsoleteAssetIds = currentAssetIds.filter(
      (assetId) => !importedAssetIds.has(assetId)
    );

    setRawEntityTypes(draft.entityTypes ?? DEFAULT_ENTITY_TYPES);
    setRawEntities(draft.entities);
    setRawRelations(draft.relations);
    resetWorkspaceUi(draft.entityTypes ?? DEFAULT_ENTITY_TYPES, draft.entities[0]?.id ?? "");

    void deleteImageAssetsByIds(obsoleteAssetIds).catch((error) => {
      console.error(error);
    });
  }

  function applyMergeImport(
    draft: PreparedImportDraft,
    entityReviews: ImportEntityReview[],
    mergedEntityTypes: EntityTypeDefinition[]
  ) {
    const currentEntities = sanitizeEntities(rawEntities);
    const currentRelations = sanitizeRelations(rawRelations);
    const nextEntities = [...currentEntities];
    const usedIds = new Set(nextEntities.map((entity) => entity.id));
    const currentEntitiesById = new Map(
      nextEntities.map((entity) => [entity.id, entity] as const)
    );
    const idMap = new Map<string, string>();
    const reviewByImportedId = new Map(
      entityReviews.map((review) => [review.importedEntity.id, review] as const)
    );

    draft.entities.forEach((importedEntity) => {
      const review = reviewByImportedId.get(importedEntity.id);
      const matchedEntity = review?.matchedEntity;

      if (review?.status === "duplicate" && matchedEntity) {
        idMap.set(importedEntity.id, matchedEntity.id);
        return;
      }

      if (review?.status === "probable-match" && matchedEntity) {
        const currentMatched = currentEntitiesById.get(matchedEntity.id) ?? matchedEntity;
        const mergedEntity: Entity = {
          ...currentMatched,
          shortDescription:
            currentMatched.shortDescription || importedEntity.shortDescription,
          notes: currentMatched.notes || importedEntity.notes,
          image: currentMatched.image || importedEntity.image,
          tags: Array.from(new Set([...currentMatched.tags, ...importedEntity.tags])),
          metadata: {
            ...(importedEntity.metadata ?? {}),
            ...(currentMatched.metadata ?? {}),
          },
          updatedAt: new Date().toISOString(),
          lastModified: Date.now(),
        };

        const index = nextEntities.findIndex((entity) => entity.id === currentMatched.id);
        if (index >= 0) {
          nextEntities[index] = mergedEntity;
        }

        currentEntitiesById.set(mergedEntity.id, mergedEntity);
        idMap.set(importedEntity.id, mergedEntity.id);
        return;
      }

      let nextId = importedEntity.id;
      if (usedIds.has(nextId)) {
        nextId = crypto.randomUUID();
      }

      const entityToInsert: Entity = {
        ...importedEntity,
        id: nextId,
        name: hasDuplicateEntityName(nextEntities, importedEntity.type, importedEntity.name)
          ? buildImportedEntityName(nextEntities, importedEntity)
          : importedEntity.name,
      };

      usedIds.add(entityToInsert.id);
      nextEntities.push(entityToInsert);
      currentEntitiesById.set(entityToInsert.id, entityToInsert);
      idMap.set(importedEntity.id, entityToInsert.id);
    });

    const relationSignatureSet = new Set(
      currentRelations.map((relation) =>
        [
          relation.fromEntityId,
          relation.toEntityId,
          normalizeRelationType(relation.type),
          normalizeOptionalRelationType(relation.inverseType) ?? "",
          relation.source ?? "",
          relation.sourceFieldKey ?? "",
        ].join("::")
      )
    );

    const nextRelations = [...currentRelations];

    draft.relations.forEach((relation) => {
      const mappedFrom = idMap.get(relation.fromEntityId);
      const mappedTo = idMap.get(relation.toEntityId);

      if (!mappedFrom || !mappedTo || mappedFrom === mappedTo) return;

      const normalizedType = normalizeRelationType(relation.type);
      const normalizedInverseType = normalizeOptionalRelationType(relation.inverseType);
      const signature = [
        mappedFrom,
        mappedTo,
        normalizedType,
        normalizedInverseType ?? "",
        relation.source ?? "",
        relation.sourceFieldKey ?? "",
      ].join("::");

      if (relationSignatureSet.has(signature)) return;

      relationSignatureSet.add(signature);
      nextRelations.push({
        ...relation,
        id: crypto.randomUUID(),
        fromEntityId: mappedFrom,
        toEntityId: mappedTo,
        type: normalizedType,
        inverseType: normalizedInverseType,
      });
    });

    setRawEntityTypes(mergedEntityTypes);
    setRawEntities(nextEntities);
    setRawRelations(nextRelations);
    resetWorkspaceUi(mergedEntityTypes, nextEntities[0]?.id ?? "");
  }

  async function applyPendingImportPreview() {
    if (!pendingImportPreview) return;

    setIsApplyingImport(true);

    try {
      const materializedDraft = await materializeImportDraft(pendingImportPreview.draft);

      if (pendingImportPreview.mode === "replace") {
        applyReplaceImport(materializedDraft);
        window.alert("Import completato in modalità replace.");
      } else {
        applyMergeImport(
          materializedDraft,
          pendingImportPreview.entityReviews,
          pendingImportPreview.mergedEntityTypes
        );
        window.alert("Import completato in modalità merge assistito.");
      }

      setPendingImportPreview(null);
    } catch (error) {
      console.error(error);
      window.alert("Impossibile completare l'import. Controlla che il backup sia valido.");
    } finally {
      setIsApplyingImport(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function importData(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = async () => {
      try {
        const text = reader.result;
        if (typeof text !== "string") {
          throw new Error("File non leggibile.");
        }

        const parsed = JSON.parse(text);

        if (!isValidWorldData(parsed)) {
          throw new Error("Formato JSON non valido.");
        }

        const draft = buildImportDraft(parsed as WorldDataWithImages);
        const currentEntities = sanitizeEntities(rawEntities);
        const currentEntityTypes = sanitizeEntityTypes(rawEntityTypes, currentEntities);
        const mergedEntityTypes = mergeEntityTypesForImport(
          currentEntityTypes,
          draft.entityTypes ?? DEFAULT_ENTITY_TYPES
        );

        setPendingImportPreview({
          fileName: file.name,
          mode: "merge",
          draft,
          mergedEntityTypes,
          entityReviews: classifyImportEntities(currentEntities, draft.entities),
        });
        return;

        /*
       const importMode = window.prompt(
  [
    "Scegli modalità import:",
    "- scrivi REPLACE per sostituire tutto",
    "- scrivi MERGE per aggiungere ai dati esistenti",
  ].join("\n"),
  "MERGE"
);

        if (!importMode) {
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
          return;
        }

        const normalizedMode = importMode.trim().toLowerCase();

        if (normalizedMode !== "replace" && normalizedMode !== "merge") {
          alert('Valore non valido. Scrivi solo "REPLACE" oppure "MERGE".');
          return;
        }

        const importedEntitiesRaw = sanitizeEntities(parsed.entities);
        const importedEntities = await Promise.all(
          importedEntitiesRaw.map(async (entity) => {
            if (
              typeof entity.image === "string" &&
              entity.image.startsWith("data:image/")
            ) {
              try {
                const image = await saveDataUrlImageAsAssetRef(entity.image);
                return { ...entity, image };
              } catch (error) {
                console.error(error);
              }
            }

            return entity;
          })
        );

        await importImageAssetsFromWorldData((parsed as WorldDataWithImages).imageAssets);

        const importedEntityIdSet = new Set(importedEntities.map((entity) => entity.id));
        const importedEntityTypes = sanitizeEntityTypes(
          parsed.entityTypes ?? DEFAULT_ENTITY_TYPES,
          importedEntities
        );

        const importedRelations = parsed.relations
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
              importedEntityIdSet.has(relation.fromEntityId) &&
              importedEntityIdSet.has(relation.toEntityId)
          );

        if (normalizedMode === "replace") {
          const currentAssetIds = getAssetIdsFromImageRefs(
            entities.map((entity) => entity.image)
          );
          const importedAssetIds = new Set(
            getAssetIdsFromImageRefs(importedEntities.map((entity) => entity.image))
          );
          const obsoleteAssetIds = currentAssetIds.filter(
            (assetId) => !importedAssetIds.has(assetId)
          );
          setRawEntityTypes(importedEntityTypes);
          setRawEntities(importedEntities);
          setRawRelations(importedRelations);

          setSelectedId(importedEntities[0]?.id ?? "");
          setSearch("");
          setArchiveTypeFilter("all");
          setTagFilter("");
          setSortMode("lastModified-desc");
          setIsCreatingEntity(false);
          setCreateEntityType(importedEntityTypes[0]?.id ?? "luogo");
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
          setGraphTypeFilters(buildDefaultGraphTypeFilters(importedEntityTypes));
          setIsFloatingCreateOpen(false);

          void deleteImageAssetsByIds(obsoleteAssetIds).catch((error) => {
            console.error(error);
          });

          alert("Import completato in modalità replace.");
          return;
        }

        const currentEntities = sanitizeEntities(rawEntities);
        const currentRelations = sanitizeRelations(rawRelations);
        const currentEntityTypes = sanitizeEntityTypes(rawEntityTypes, currentEntities);

        const mergedEntityTypes = mergeEntityTypesForImport(
          currentEntityTypes,
          importedEntityTypes
        );

        const nextEntities = [...currentEntities];
        const idMap = new Map<string, string>();
        const usedIds = new Set(nextEntities.map((entity) => entity.id));
        const currentEntitiesById = new Map(
          nextEntities.map((entity) => [entity.id, entity] as const)
        );

        const exactNameMap = new Map<string, Entity>();

        nextEntities.forEach((entity) => {
          exactNameMap.set(
            `${entity.type}::${normalizeEntityName(entity.name).toLowerCase()}`,
            entity
          );
        });

        importedEntities.forEach((importedEntity) => {
          const normalizedNameKey = `${importedEntity.type}::${normalizeEntityName(
            importedEntity.name
          ).toLowerCase()}`;

          const sameById = currentEntitiesById.get(importedEntity.id);
          const sameByName = exactNameMap.get(normalizedNameKey);
          const matchedEntity = sameById ?? sameByName;

          if (matchedEntity) {
            const mergedEntity: Entity = {
              ...matchedEntity,
              shortDescription:
                matchedEntity.shortDescription || importedEntity.shortDescription,
              notes: matchedEntity.notes || importedEntity.notes,
              image: matchedEntity.image || importedEntity.image,
              tags: Array.from(new Set([...matchedEntity.tags, ...importedEntity.tags])),
              metadata: {
                ...(importedEntity.metadata ?? {}),
                ...(matchedEntity.metadata ?? {}),
              },
              updatedAt: new Date().toISOString(),
              lastModified: Date.now(),
            };

            const index = nextEntities.findIndex((entity) => entity.id === matchedEntity.id);
            if (index >= 0) {
              nextEntities[index] = mergedEntity;
            }

            currentEntitiesById.set(mergedEntity.id, mergedEntity);
            exactNameMap.set(normalizedNameKey, mergedEntity);

            idMap.set(importedEntity.id, matchedEntity.id);
            return;
          }

          let nextId = importedEntity.id;
          if (usedIds.has(nextId)) {
            nextId = crypto.randomUUID();
          }

          const entityToInsert: Entity = {
            ...importedEntity,
            id: nextId,
            name: hasDuplicateEntityName(nextEntities, importedEntity.type, importedEntity.name)
              ? buildImportedEntityName(nextEntities, importedEntity)
              : importedEntity.name,
          };

          usedIds.add(entityToInsert.id);
          nextEntities.push(entityToInsert);
          idMap.set(importedEntity.id, entityToInsert.id);
          currentEntitiesById.set(entityToInsert.id, entityToInsert);

          exactNameMap.set(
            `${entityToInsert.type}::${normalizeEntityName(entityToInsert.name).toLowerCase()}`,
            entityToInsert
          );
        });

        const relationSignatureSet = new Set(
          currentRelations.map((relation) =>
            [
              relation.fromEntityId,
              relation.toEntityId,
              normalizeRelationType(relation.type),
              normalizeOptionalRelationType(relation.inverseType) ?? "",
              relation.source ?? "",
              relation.sourceFieldKey ?? "",
            ].join("::")
          )
        );

        const nextRelations = [...currentRelations];

        importedRelations.forEach((relation) => {
          const mappedFrom = idMap.get(relation.fromEntityId);
          const mappedTo = idMap.get(relation.toEntityId);

          if (!mappedFrom || !mappedTo) return;
          if (mappedFrom === mappedTo) return;

          const normalizedType = normalizeRelationType(relation.type);
          const normalizedInverseType = normalizeOptionalRelationType(relation.inverseType);

          const signature = [
            mappedFrom,
            mappedTo,
            normalizedType,
            normalizedInverseType ?? "",
            relation.source ?? "",
            relation.sourceFieldKey ?? "",
          ].join("::");

          if (relationSignatureSet.has(signature)) {
            return;
          }

          relationSignatureSet.add(signature);
          nextRelations.push({
            ...relation,
            id: crypto.randomUUID(),
            fromEntityId: mappedFrom,
            toEntityId: mappedTo,
            type: normalizedType,
            inverseType: normalizedInverseType,
          });
        });

        setRawEntityTypes(mergedEntityTypes);
        setRawEntities(nextEntities);
        setRawRelations(nextRelations);

        if (!selectedId && nextEntities.length > 0) {
          setSelectedId(nextEntities[0].id);
        }

        setGraphTypeFilters(buildDefaultGraphTypeFilters(mergedEntityTypes));

        alert("Import completato in modalità merge.");
        */
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

  function patchEntityMetadataById(entityId: string, metadataPatch: Record<string, string>) {
    const normalizedPatch = Object.fromEntries(
      Object.entries(metadataPatch)
        .map(([key, value]) => [key, normalizeMetadataValue(value)] as const)
        .filter(([key, value]) => key.trim() && value)
    );

    if (Object.keys(normalizedPatch).length === 0) return;

    setRawEntities((current) =>
      sanitizeEntities(current).map((entity) => {
        if (entity.id !== entityId) return entity;

        return {
          ...entity,
          metadata: {
            ...(entity.metadata ?? {}),
            ...normalizedPatch,
          },
          updatedAt: new Date().toISOString(),
          lastModified: Date.now(),
        };
      })
    );
  }

  function syncManualGenealogyMetadata(relation: Relation) {
    const sourceEntity = entities.find((entity) => entity.id === relation.fromEntityId);
    const targetEntity = entities.find((entity) => entity.id === relation.toEntityId);

    if (!sourceEntity || !targetEntity) return;
    if (sourceEntity.type !== "personaggio" || targetEntity.type !== "personaggio") return;

    const normalizedType = normalizeRelationType(relation.type);

    if (normalizedType === "padre di") {
      patchEntityMetadataById(targetEntity.id, { padre: sourceEntity.name });
      return;
    }

    if (normalizedType === "madre di") {
      patchEntityMetadataById(targetEntity.id, { madre: sourceEntity.name });
      return;
    }

    if (normalizedType === "coniuge di" || normalizedType === "partner di") {
      patchEntityMetadataById(sourceEntity.id, { coniuge: targetEntity.name });
      patchEntityMetadataById(targetEntity.id, { coniuge: sourceEntity.name });
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
    syncManualGenealogyMetadata(newRelation);
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

  function addAutomationRule() {
    setRelationAutomationRules((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        label: "Nuova regola",
        enabled: true,
        sourceEntityType: "all",
        sourceMetadataKey: "",
        targetEntityType: "all",
        targetMetadataKey: "",
        relationType: "",
        inverseType: "",
        mode: "suggest",
      },
    ]);
  }

  function updateAutomationRule(ruleId: string, patch: Partial<RelationAutomationRule>) {
    setRelationAutomationRules((current) =>
      current.map((rule) => (rule.id === ruleId ? { ...rule, ...patch } : rule))
    );
  }

  function deleteAutomationRule(ruleId: string) {
    setRelationAutomationRules((current) => current.filter((rule) => rule.id !== ruleId));
  }

  function applyRelationSuggestion(suggestion: RelationSuggestion) {
    const signature = [
      suggestion.sourceEntity.id,
      suggestion.targetEntity.id,
      normalizeRelationType(suggestion.relationType),
      normalizeOptionalRelationType(suggestion.inverseType) ?? "",
    ].join("::");

    const alreadyExists = relations.some(
      (relation) =>
        [
          relation.fromEntityId,
          relation.toEntityId,
          normalizeRelationType(relation.type),
          normalizeOptionalRelationType(relation.inverseType) ?? "",
        ].join("::") === signature
    );

    if (alreadyExists) return;

    setRawRelations((current) => [
      {
        id: crypto.randomUUID(),
        fromEntityId: suggestion.sourceEntity.id,
        toEntityId: suggestion.targetEntity.id,
        type: normalizeRelationType(suggestion.relationType),
        inverseType: normalizeOptionalRelationType(suggestion.inverseType),
        source: "manual",
      },
      ...sanitizeRelations(current),
    ]);
  }

  function applyAllRelationSuggestions() {
    setRawRelations((current) => {
      const existing = sanitizeRelations(current);
      const signatures = new Set(
        existing.map((relation) =>
          [
            relation.fromEntityId,
            relation.toEntityId,
            normalizeRelationType(relation.type),
            normalizeOptionalRelationType(relation.inverseType) ?? "",
          ].join("::")
        )
      );

      const additions: Relation[] = [];
      relationSuggestions.forEach((suggestion) => {
        const signature = [
          suggestion.sourceEntity.id,
          suggestion.targetEntity.id,
          normalizeRelationType(suggestion.relationType),
          normalizeOptionalRelationType(suggestion.inverseType) ?? "",
        ].join("::");
        if (signatures.has(signature)) return;
        signatures.add(signature);
        additions.push({
          id: crypto.randomUUID(),
          fromEntityId: suggestion.sourceEntity.id,
          toEntityId: suggestion.targetEntity.id,
          type: normalizeRelationType(suggestion.relationType),
          inverseType: normalizeOptionalRelationType(suggestion.inverseType),
          source: "manual",
        });
      });

      return [...additions, ...existing];
    });
  }

  function saveWorkspacePreset() {
    const nextPreset: WorkspacePreset = {
      id: crypto.randomUUID(),
      label: `Workspace ${workspacePresets.length + 1}`,
      semanticView,
      graphViewMode,
      graphFilter,
      graphViewType,
      graphViewTag,
      graphRelationFilter,
      graphNeighborhoodDepth,
      graphTypeFilters,
    };

    setWorkspacePresets((current) => [...current, nextPreset]);
  }

  function loadWorkspacePreset(presetId: string) {
    const preset = workspacePresets.find((item) => item.id === presetId);
    if (!preset) return;

    setSemanticView(preset.semanticView);
    setGraphViewMode(preset.graphViewMode as GraphViewMode);
    setGraphFilter(preset.graphFilter as FocusedGraphFilter);
    setGraphViewType(preset.graphViewType as "all" | EntityType);
    setGraphViewTag(preset.graphViewTag);
    setGraphRelationFilter(preset.graphRelationFilter);
    setGraphNeighborhoodDepth(preset.graphNeighborhoodDepth as GraphNeighborhoodDepth);
    setGraphTypeFilters(preset.graphTypeFilters);
  }

  function deleteWorkspacePreset(presetId: string) {
    setWorkspacePresets((current) => current.filter((item) => item.id !== presetId));
  }

  async function exportNarrativePackage(params: {
    packageType: "region" | "storyline" | "faction" | "cast";
    seed: string;
    label: string;
  }) {
    const seedEntity = entities.find((entity) => entity.id === params.seed);
    if (!seedEntity) return;

    const scoped = buildNarrativePackageScope({
      packageType: params.packageType,
      seedEntity,
      entities,
      relations,
    });

    const imageAssets = await collectImageAssetsForExport(
      scoped.entities.map((entity) => entity.image ?? "")
    );

    const packageTypeSet = new Set(scoped.entities.map((entity) => entity.type));
    const packageEntityTypes = entityTypes.filter((type) => packageTypeSet.has(type.id));
    const data: WorldDataWithImages = {
      version: WORLD_DATA_VERSION,
      entityTypes: packageEntityTypes,
      entities: scoped.entities,
      relations: scoped.relations,
      imageAssets,
      packageMeta: {
        packageType: params.packageType,
        seed: seedEntity.id,
        label: params.label.trim(),
        createdAt: new Date().toISOString(),
      },
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeLabel = params.label.trim().replace(/[^a-z0-9-_]+/gi, "-").toLowerCase();
    link.href = url;
    link.download = `worldbuilder-package-${safeLabel || "lore"}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setPackageModalOpen(false);
  }

  const graphData = useMemo(() => {
    if (!selectedEntity) {
      return { nodes: [], edges: [] };
    }

    if (graphViewMode === "focused") {
      const focused = getActiveGraphEntitiesByFocusedMode(
        semanticScope.entities,
        semanticScope.relations,
        selectedEntity,
        graphFilter,
        graphTypeFilters,
        graphNeighborhoodDepth,
        graphRelationFilter
      );

      return buildGraphElements(
        focused.localEntities,
        focused.localRelations,
        entityTypes,
        selectedEntity.id
      );
    }

    if (graphViewMode === "global") {
      const baseEntities = semanticScope.entities.filter((entity) => graphTypeFilters[entity.type]);

      const allowedIds = new Set(baseEntities.map((entity) => entity.id));

      const localRelations = semanticScope.relations.filter(
        (relation) =>
          relationMatchesGraphFilter(relation, graphRelationFilter) &&
          allowedIds.has(relation.fromEntityId) &&
          allowedIds.has(relation.toEntityId)
      );

      return buildGraphElements(
        baseEntities,
        localRelations,
        entityTypes,
        selectedEntity.id
      );
    }

    if (graphViewMode === "type-only") {
      const localEntities =
        graphViewType === "all"
          ? semanticScope.entities
          : semanticScope.entities.filter((entity) => entity.type === graphViewType);

      const allowedIds = new Set(localEntities.map((entity) => entity.id));

      const localRelations = semanticScope.relations.filter(
        (relation) =>
          relationMatchesGraphFilter(relation, graphRelationFilter) &&
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
      ? semanticScope.entities.filter((entity) =>
          entity.tags.some((tag) => normalizeTag(tag) === normalizedTag)
        )
      : [];

    const allowedIds = new Set(localEntities.map((entity) => entity.id));

    const localRelations = semanticScope.relations.filter(
      (relation) =>
        relationMatchesGraphFilter(relation, graphRelationFilter) &&
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
    semanticScope,
    entityTypes,
    selectedEntity,
    graphViewMode,
    graphFilter,
    graphTypeFilters,
    graphNeighborhoodDepth,
    graphRelationFilter,
    graphViewType,
    graphViewTag,
  ]);

  const showEmptyState = !selectedEntity;
  const currentSemanticLabel =
    SEMANTIC_VIEW_REGISTRY.find((item) => item.id === semanticView)?.label ?? "Vista libera";
  const selectedEntityTypeLabel = selectedEntity
    ? entityTypes.find((item) => item.id === selectedEntity.type)?.label ?? selectedEntity.type
    : "";
  const selectedEntityRelationCount = selectedEntityRelations.length;

  return view === "reader" ? (
    <ReaderModeView
      entityTypes={entityTypes}
      entities={semanticScope.entities}
      relations={semanticScope.relations}
      selectedEntity={selectedEntity}
      semanticView={semanticView}
      onBack={() => setView("workspace")}
      onSelectEntity={setSelectedId}
    />
  ) : view === "dashboard" ? (
    <div
      style={{
        ...pageStyle,
        background:
          "radial-gradient(circle at top left, rgba(201,166,107,0.08), transparent 18%), radial-gradient(circle at 82% 0%, rgba(127,158,199,0.1), transparent 20%), linear-gradient(180deg, #09090d 0%, #0d1016 42%, #0b1118 100%)",
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
          "radial-gradient(circle at 20% 30%, rgba(80,120,255,0.16), transparent 0, transparent 28%), radial-gradient(circle at 80% 70%, rgba(255,140,80,0.1), transparent 0, transparent 24%), radial-gradient(circle at 55% 0%, rgba(120,255,220,0.07), transparent 0, transparent 22%), linear-gradient(180deg, #05070d 0%, #080b12 42%, #0a0f18 100%)",
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
          graphRelationFilter={graphRelationFilter}
          graphNeighborhoodDepth={graphNeighborhoodDepth}
          semanticView={semanticView}
          allTags={allTags}
          graphData={graphData}
          onGraphViewModeChange={setGraphViewMode}
          onGraphFilterChange={setGraphFilter}
          onToggleGraphTypeFilter={toggleGraphTypeFilter}
          onGraphViewTypeChange={setGraphViewType}
          onGraphViewTagChange={setGraphViewTag}
          onGraphRelationFilterChange={setGraphRelationFilter}
          onGraphNeighborhoodDepthChange={setGraphNeighborhoodDepth}
          onSemanticViewChange={setSemanticView}
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
            display: "grid",
            gap: "22px",
          }}
        >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isCompactTopBar
                    ? "1fr"
                    : "minmax(0, 1.78fr) minmax(320px, 0.92fr)",
                  gap: 28,
                  alignItems: "stretch",
                  padding: "8px 0 18px",
                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                }}
              >
              <div
                style={{
                  display: "grid",
                  gap: 18,
                  alignContent: "start",
                  paddingRight: isCompactTopBar ? 0 : 18,
                }}
              >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  width: "fit-content",
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.18em",
                  color: cinematicTypography.gold,
                  fontWeight: 800,
                }}
              >
                Workspace narrativo
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                <h1
                  style={{
                    margin: 0,
                    fontFamily: cinematicTypography.displayFont,
                    fontSize: isCompactTopBar ? 40 : 54,
                    lineHeight: 0.98,
                    color: cinematicTypography.inkStrong,
                    maxWidth: 840,
                  }}
                >
                  Worldbuilder
                </h1>
                <p
                  style={{
                    margin: 0,
                    color: cinematicTypography.ink,
                    maxWidth: 760,
                    lineHeight: 1.78,
                    fontSize: 15,
                  }}
                >
                  Costruisci il tuo mondo come un atlante narrativo moderno: indice, schede,
                  relazioni, timeline e viste semantiche convivono in uno spazio di lavoro piu
                  aperto, con un focus centrale piu forte e meno rumore da dashboard.
                </p>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 22,
                  flexWrap: "wrap",
                  alignItems: "flex-start",
                }}
              >
                {[
                  {
                    label: "Archivio",
                    value: `${entities.length}`,
                    helper: "entita in archivio",
                  },
                  {
                    label: "Rete",
                    value: `${relations.length}`,
                    helper: "relazioni attive",
                  },
                  {
                    label: "Vista",
                    value: currentSemanticLabel,
                    helper: "taglio semantico",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      display: "grid",
                      gap: 4,
                      minWidth: 110,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        color: cinematicTypography.inkSoft,
                        fontWeight: 800,
                      }}
                    >
                      {item.label}
                    </span>
                    <strong
                      style={{
                        fontFamily: cinematicTypography.displayFont,
                        fontSize: item.label === "Vista" ? 22 : 28,
                        lineHeight: 1.05,
                        color: cinematicTypography.inkStrong,
                      }}
                    >
                      {item.value}
                    </strong>
                    <span style={{ color: cinematicTypography.inkMuted, fontSize: 12 }}>
                      {item.helper}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gap: 16,
                alignContent: "start",
                paddingLeft: isCompactTopBar ? 0 : 24,
                borderLeft: isCompactTopBar ? "none" : "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.18em",
                  color: cinematicTypography.gold,
                  fontWeight: 800,
                }}
              >
                Focus attuale
              </span>
              {selectedEntity ? (
                <>
                  <div style={{ display: "grid", gap: 6 }}>
                    <strong
                      style={{
                        fontFamily: cinematicTypography.displayFont,
                        fontSize: 30,
                        lineHeight: 1.04,
                        color: cinematicTypography.inkStrong,
                      }}
                    >
                      {selectedEntity.name}
                    </strong>
                    <span
                      style={{
                        color: cinematicTypography.inkMuted,
                        fontSize: 12,
                        textTransform: "uppercase",
                        letterSpacing: "0.14em",
                      }}
                    >
                      {selectedEntityTypeLabel}
                    </span>
                  </div>
                  <p
                    style={{
                      margin: 0,
                      color: cinematicTypography.ink,
                      fontSize: 14,
                      lineHeight: 1.6,
                    }}
                  >
                    {selectedEntity.shortDescription?.trim()
                      ? selectedEntity.shortDescription
                      : "Apri la scheda per sviluppare dettagli, collegamenti e tono narrativo dell'entita selezionata."}
                  </p>
                  <div
                    style={{
                      display: "flex",
                      gap: 18,
                      flexWrap: "wrap",
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gap: 4,
                        minWidth: 82,
                      }}
                    >
                      <span
                        style={{
                          color: cinematicTypography.inkSoft,
                          fontSize: 11,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          fontWeight: 800,
                        }}
                      >
                        Tag
                      </span>
                      <strong style={{ color: cinematicTypography.inkStrong, fontSize: 22 }}>
                        {selectedEntity.tags.length}
                      </strong>
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gap: 4,
                        minWidth: 98,
                      }}
                    >
                      <span
                        style={{
                          color: cinematicTypography.inkSoft,
                          fontSize: 11,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          fontWeight: 800,
                        }}
                      >
                        Legami
                      </span>
                      <strong style={{ color: cinematicTypography.inkStrong, fontSize: 22 }}>
                        {selectedEntityRelationCount}
                      </strong>
                    </div>
                  </div>
                  <div
                    style={{
                      paddingTop: 4,
                      borderTop: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <div
                      style={{
                        color: cinematicTypography.gold,
                        fontSize: 11,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        fontWeight: 800,
                        marginBottom: 6,
                      }}
                    >
                      Centro narrativo
                    </div>
                    <div style={{ color: cinematicTypography.ink, fontSize: 13, lineHeight: 1.65 }}>
                      Questa entita e il suo contesto ora sono il fulcro della shell. Archivio e
                      rail restano presenti, ma con un peso visivo secondario.
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <strong
                    style={{
                      fontFamily: cinematicTypography.displayFont,
                      fontSize: 22,
                      lineHeight: 1.1,
                      color: cinematicTypography.inkStrong,
                    }}
                  >
                    Nessuna entita selezionata
                  </strong>
                  <p
                    style={{
                      margin: 0,
                      color: cinematicTypography.ink,
                      fontSize: 14,
                      lineHeight: 1.6,
                    }}
                  >
                    Scegli una voce dall'archivio o crea una nuova entita per dare subito un centro
                    narrativo al workspace.
                  </p>
                </>
              )}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gap: 16,
              padding: "0 0 18px",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: isCompactTopBar ? "stretch" : "center",
                gap: 14,
                flexWrap: "wrap",
              }}
            >
                <div style={{ display: "grid", gap: 6 }}>
                  <span
                    style={{
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: "0.18em",
                    color: cinematicTypography.gold,
                    fontWeight: 800,
                  }}
                >
                  Azioni principali
                </span>
                <p
                  style={{
                    margin: 0,
                    color: cinematicTypography.inkMuted,
                    fontSize: 14,
                    maxWidth: 680,
                    lineHeight: 1.55,
                  }}
                >
                  Mantieni il focus sul lavoro corrente; gli strumenti di import, export e gestione
                  avanzata restano disponibili in un secondo livello piu ordinato.
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap",
                  justifyContent: isCompactTopBar ? "flex-start" : "flex-end",
                }}
              >
                <button
                  type="button"
                  onClick={() => handleOpenCreateEntity()}
                  style={{
                    ...primaryButtonLargeStyle,
                    minWidth: isCompactTopBar ? undefined : 168,
                  }}
                >
                  + Nuova entita
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
                  onClick={() => setView("reader")}
                  style={secondaryButtonLargeStyle}
                  disabled={!selectedEntity}
                >
                  Modalita consultazione
                </button>

                <button
                  type="button"
                  onClick={() => setView("dashboard")}
                  style={secondaryButtonLargeStyle}
                >
                  Dashboard
                </button>

                <button
                  type="button"
                  onClick={() => setIsWorkspaceToolsOpen((current) => !current)}
                  style={ghostButtonStyle}
                >
                  {isWorkspaceToolsOpen ? "Nascondi strumenti" : "Strumenti progetto"}
                </button>
              </div>
            </div>

            {isWorkspaceToolsOpen ? (
              <div
                style={{
                  display: "grid",
                  gap: 16,
                  padding: "6px 0 0",
                }}
              >
                <div style={{ display: "grid", gap: 4 }}>
                  <strong
                    style={{
                      fontFamily: cinematicTypography.displayFont,
                      fontSize: 24,
                      color: cinematicTypography.inkStrong,
                    }}
                  >
                    Strumenti progetto
                  </strong>
                  <p
                    style={{
                      margin: 0,
                      color: cinematicTypography.inkMuted,
                      fontSize: 14,
                      lineHeight: 1.55,
                    }}
                  >
                    Gestisci viste salvate, cambia il taglio semantico del workspace e accedi alle
                    operazioni di import ed export senza sovraccaricare la testata.
                  </p>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <select
                    value={semanticView}
                    onChange={(event) => setSemanticView(event.target.value as SemanticViewId)}
                    style={{
                      minWidth: 220,
                      padding: "12px 14px",
                      borderRadius: 16,
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: "rgba(255,255,255,0.04)",
                      color: cinematicTypography.inkStrong,
                      backdropFilter: "blur(18px)",
                      WebkitBackdropFilter: "blur(18px)",
                    }}
                  >
                    {SEMANTIC_VIEW_REGISTRY.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>

                  {workspacePresets.length > 0 ? (
                    <select
                      defaultValue=""
                      onChange={(event) => {
                        if (event.target.value) {
                          loadWorkspacePreset(event.target.value);
                          event.currentTarget.value = "";
                        }
                      }}
                      style={{
                        minWidth: 220,
                        padding: "12px 14px",
                        borderRadius: 16,
                        border: "1px solid rgba(255,255,255,0.08)",
                        background: "rgba(255,255,255,0.04)",
                        color: cinematicTypography.inkStrong,
                        backdropFilter: "blur(18px)",
                        WebkitBackdropFilter: "blur(18px)",
                      }}
                    >
                      <option value="">Carica vista salvata</option>
                      {workspacePresets.map((preset) => (
                        <option key={preset.id} value={preset.id}>
                          {preset.label}
                        </option>
                      ))}
                    </select>
                  ) : null}

                  <button type="button" onClick={saveWorkspacePreset} style={secondaryButtonLargeStyle}>
                    Salva vista corrente
                  </button>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <button type="button" onClick={exportData} style={successButtonLargeStyle}>
                    Esporta mondo
                  </button>

                  <button
                    type="button"
                    onClick={() => setPackageModalOpen(true)}
                    style={successButtonLargeStyle}
                  >
                    Esporta pacchetto
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={purpleButtonLargeStyle}
                  >
                    Importa mondo
                  </button>

                  <button type="button" onClick={resetAllData} style={secondaryButtonLargeStyle}>
                    Reset dati
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {showWorkspaceGuide ? (
          <div
            style={{
              marginBottom: 16,
              display: "grid",
              gap: 16,
              borderTop: "1px solid rgba(127,158,199,0.14)",
              borderBottom: "1px solid rgba(127,158,199,0.14)",
              background:
                "radial-gradient(circle at top right, rgba(127,158,199,0.12), transparent 28%), rgba(255,255,255,0.02)",
              padding: "20px 0",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 14,
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "grid", gap: 6, maxWidth: 860 }}>
                <div style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: cinematicTypography.gold }}>
                  Avvio guidato
                </div>
                <div style={{ color: cinematicTypography.inkStrong, fontSize: 24, fontWeight: 800, lineHeight: 1.2 }}>
                  Il workspace adesso respira come un atlante di lavoro.
                </div>
                <div style={{ color: cinematicTypography.ink, fontSize: 14, lineHeight: 1.7 }}>
                  Se vuoi orientarti in fretta, parti da tre passi: definisci i tipi e i campi
                  principali, collega subito le entita piu importanti e poi passa al grafo con un
                  preset semantico.
                </div>
              </div>

              <button
                type="button"
                onClick={() => setWorkspaceGuideState({ dismissed: true })}
                style={ghostButtonStyle}
              >
                Nascondi guida
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 12,
              }}
            >
              {[
                {
                  title: "1. Imposta la struttura",
                  text: "Usa Archivio e Schema tipi per definire personaggi, luoghi, fazioni e i campi che ti servono davvero.",
                },
                {
                  title: "2. Collega il nucleo del mondo",
                  text: "Apri una scheda, compila i dettagli chiave e aggiungi subito le relazioni forti che rendono leggibile la lore.",
                },
                {
                  title: "3. Leggi il mondo dal grafo",
                  text: "Passa al grafo con preset come Politica, Genealogia o Eventi per ridurre il rumore e vedere i pattern principali.",
                },
              ].map((step) => (
                <div
                  key={step.title}
                  style={{
                    padding: "0 18px 0 0",
                    borderRight: "1px solid rgba(255,255,255,0.06)",
                    display: "grid",
                    gap: 6,
                  }}
                >
                  <div style={{ color: cinematicTypography.inkStrong, fontWeight: 800 }}>{step.title}</div>
                  <div style={{ color: cinematicTypography.inkMuted, fontSize: 13, lineHeight: 1.65 }}>{step.text}</div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {isWorkspaceToolsOpen && workspacePresets.length > 0 ? (
          <div
            style={{
                  display: "flex",
                  gap: 18,
                  flexWrap: "wrap",
                  marginBottom: 16,
                }}
              >
            {workspacePresets.map((preset) => (
              <div
                key={preset.id}
                style={{
                  display: "inline-flex",
                  gap: 6,
                  alignItems: "center",
                  paddingBottom: 6,
                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <button
                  type="button"
                  onClick={() => loadWorkspacePreset(preset.id)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: cinematicTypography.inkStrong,
                    cursor: "pointer",
                    fontWeight: 700,
                  }}
                >
                  {preset.label}
                </button>
                <button
                  type="button"
                  onClick={() => deleteWorkspacePreset(preset.id)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: cinematicTypography.inkMuted,
                    cursor: "pointer",
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : null}

        {showEmptyState ? (
          <div
            style={{
              ...panelStyle,
              maxWidth: 760,
              margin: "0 auto",
              border: "1px solid rgba(216,194,152,0.08)",
              boxShadow: "0 24px 60px rgba(4,7,12,0.18)",
              display: "grid",
              gap: 18,
              padding: 24,
              background: "rgba(255,255,255,0.045)",
              backdropFilter: "blur(28px)",
              WebkitBackdropFilter: "blur(28px)",
            }}
          >
            <div>
              <h2 style={{ marginBottom: 8 }}>Nessuna entità disponibile</h2>
              <div style={{ color: cinematicTypography.inkMuted, fontSize: 14, lineHeight: 1.6 }}>
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
              gridTemplateColumns: isStackedWorkspace
                ? "minmax(0, 1fr)"
                : isCompactWorkspace
                ? "minmax(0, 1fr)"
                : "286px minmax(0, 1.42fr) minmax(300px, 0.8fr)",
              gap: isCompactWorkspace ? "20px" : "28px",
              alignItems: "start",
            }}
          >
            <div
              style={{
                order: isCompactWorkspace ? 3 : 1,
                minWidth: 0,
                paddingRight: isCompactWorkspace ? 0 : 8,
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
                onUpdateEntityType={handleUpdateEntityType}
                onDeleteEntityType={handleDeleteEntityType}
                searchInputRef={searchInputRef}
              />
            </div>

            <div
              style={{
                display: "grid",
                gap: "22px",
                minWidth: 0,
                order: isCompactWorkspace ? 1 : 2,
                alignContent: "start",
                paddingInline: isCompactWorkspace ? 0 : "14px 18px",
                borderLeft: isCompactWorkspace ? "none" : "1px solid rgba(255,255,255,0.06)",
                borderRight: isCompactWorkspace ? "none" : "1px solid rgba(255,255,255,0.06)",
              }}
            >
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
            </div>

            <div
              style={{
                display: "grid",
                gap: "20px",
                minWidth: 0,
                order: isCompactWorkspace ? 2 : 3,
                alignContent: "start",
                paddingLeft: isCompactWorkspace ? 0 : 18,
                borderLeft: isCompactWorkspace ? "none" : "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gap: 14,
                  paddingBottom: 16,
                  borderBottom: "1px solid rgba(255,255,255,0.08)",
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
                  <div style={{ display: "grid", gap: 6 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: cinematicTypography.gold }}>
                      Rail contestuale
                    </div>
                    <div style={{ color: cinematicTypography.inkStrong, fontWeight: 800, fontSize: 15 }}>
                      Un pannello attivo per volta, cosi il contesto pesa meno del focus.
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                      justifyContent: "flex-end",
                    }}
                  >
                    {workspaceRailTabs.map((tab) => {
                      const isActive = workspaceRailView === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setWorkspaceRailView(tab.id)}
                          style={{
                            padding: "10px 12px",
                            borderRadius: 0,
                            border: "none",
                            borderBottom: isActive
                              ? "2px solid rgba(127,158,199,0.28)"
                              : "2px solid transparent",
                            background: "transparent",
                            color: cinematicTypography.inkStrong,
                            cursor: "pointer",
                            display: "grid",
                            gap: 2,
                            minWidth: 118,
                            textAlign: "left",
                            paddingBottom: 8,
                          }}
                        >
                          <span style={{ fontWeight: 800, fontSize: 13 }}>{tab.label}</span>
                          <span style={{ fontSize: 11, color: isActive ? cinematicTypography.ink : cinematicTypography.inkSoft }}>
                            {tab.helper}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {workspaceRailView === "relations" ? (
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
              ) : null}

              {workspaceRailView === "timeline" ? (
                <TimelineWorkbench
                  events={timelineEvents}
                  periods={timelinePeriods}
                  periodFilter={timelinePeriodFilter}
                  onPeriodFilterChange={setTimelinePeriodFilter}
                  selectedEntityId={selectedEntity.id}
                  onSelectEntity={setSelectedId}
                  getStatusColor={getTimelineBadgeColor}
                />
              ) : null}

              {workspaceRailView === "automation" ? (
                <AutomationStudio
                  entityTypes={entityTypes}
                  rules={relationAutomationRules}
                  suggestions={relationSuggestions}
                  onAddRule={addAutomationRule}
                  onUpdateRule={updateAutomationRule}
                  onDeleteRule={deleteAutomationRule}
                  onApplySuggestion={applyRelationSuggestion}
                  onApplyAllSuggestions={applyAllRelationSuggestions}
                />
              ) : null}
            </div>
          </div>
        )}
      </div>

      <ImportAssistantModal
        open={Boolean(pendingImportPreview)}
        fileName={pendingImportPreview?.fileName ?? ""}
        mode={pendingImportPreview?.mode ?? "merge"}
        draft={
          pendingImportPreview?.draft ?? {
            entityTypes: [],
            entities: [],
            relations: [],
            imageAssets: [],
          }
        }
        mergedEntityTypes={pendingImportPreview?.mergedEntityTypes ?? []}
        entityReviews={pendingImportPreview?.entityReviews ?? []}
        isApplying={isApplyingImport}
        onModeChange={(mode) =>
          setPendingImportPreview((current) =>
            current
              ? {
                  ...current,
                  mode,
                }
              : current
          )
        }
        onCancel={() => {
          setPendingImportPreview(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        }}
        onConfirm={() => {
          void applyPendingImportPreview();
        }}
      />

      <NarrativePackageModal
        open={packageModalOpen}
        entities={entities}
        onClose={() => setPackageModalOpen(false)}
        onExport={(params) => {
          void exportNarrativePackage(params);
        }}
      />

      {!showEmptyState ? (
        <div
          ref={floatingMenuRef}
          style={{
            position: "fixed",
            right: isCompactWorkspace ? "16px" : "24px",
            bottom: isCompactWorkspace ? "16px" : "24px",
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
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "16px",
                padding: "12px",
                boxShadow: "0 20px 40px rgba(0,0,0,0.24)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
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
              width: isCompactWorkspace ? "56px" : "62px",
              height: isCompactWorkspace ? "56px" : "62px",
              borderRadius: "999px",
              border: "1px solid rgba(146,182,255,0.22)",
              background: "rgba(255,255,255,0.08)",
              color: "#f4f7ff",
              fontSize: isCompactWorkspace ? "30px" : "34px",
              lineHeight: 1,
              cursor: "pointer",
              boxShadow: "0 18px 38px rgba(0,0,0,0.26), 0 0 24px rgba(100,150,255,0.12)",
              fontWeight: 500,
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
            }}
          >
            {isFloatingCreateOpen ? "×" : "+"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
