import { useEffect, useMemo, useRef, useState } from "react";
import { MarkerType, type Edge, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { getEntityTypeIcon, uiIcons } from "./utils/icons";

import Sidebar from "./components/Sidebar";
import EntityEditor from "./components/EntityEditor";
import GraphPanel from "./components/GraphPanel";
import RelationsPanel from "./components/RelationsPanel";
import NewEntityForm from "./components/NewEntityForm";

import type {
  FocusedGraphFilter,
  GraphViewMode,
} from "./components/GraphPanel";

import {
  DEFAULT_GRAPH_TYPE_FILTERS,
  DEFAULT_GRAPH_VIEW_TYPE,
  DEFAULT_RELATION_PRESET_INDEX,
  QUICK_CREATE_OPTIONS,
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
  createEntity,
  getDefaultMetadata,
  getEntityTypeLabel,
  getSuggestedInverseRelationType,
  getTypeColor,
  getTypeIconGlyph,
  hasDuplicateEntityName,
  normalizeEntityName,
  normalizeMetadata,
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
import type { Entity, EntityType, Relation, WorldData } from "./types";

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

function getActiveGraphEntitiesByFocusedMode(
  entities: Entity[],
  relations: Relation[],
  selectedEntity: Entity,
  graphFilter: FocusedGraphFilter,
  graphTypeFilters: Record<EntityType, boolean>
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
    const accentColor = getTypeColor(entity.type);
    const typeLabel = getEntityTypeLabel(entity.type);
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

function isValidEntityType(value: unknown): value is EntityType {
  return (
    value === "luogo" ||
    value === "personaggio" ||
    value === "fazione" ||
    value === "oggetto" ||
    value === "evento"
  );
}

function sanitizeEntities(rawEntities: unknown): Entity[] {
  if (!Array.isArray(rawEntities)) {
    return initialEntities;
  }

  return rawEntities
    .map((entity) => {
      const safeType = isValidEntityType(entity?.type) ? entity.type : "luogo";
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
            ? remapMetadataForType(entity.metadata, safeType)
            : getDefaultMetadata(safeType),
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
    initialEntities
  );

  const [rawRelations, setRawRelations] = useLocalStorageState<Relation[]>(
    RELATIONS_STORAGE_KEY,
    initialRelations
  );

  const entities = useMemo(() => sanitizeEntities(rawEntities), [rawEntities]);
  const relations = useMemo(() => sanitizeRelations(rawRelations), [rawRelations]);

  const [selectedId, setSelectedId] = useState<string>(
    () => initialEntities[0]?.id ?? ""
  );
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
  const [graphViewType, setGraphViewType] = useState<"all" | EntityType>(
    DEFAULT_GRAPH_VIEW_TYPE
  );
  const [graphViewTag, setGraphViewTag] = useState("");
  const [graphTypeFilters, setGraphTypeFilters] = useState<Record<EntityType, boolean>>({
    ...DEFAULT_GRAPH_TYPE_FILTERS,
  });

  const [timelinePeriodFilter, setTimelinePeriodFilter] = useState("all");

  useEffect(() => {
    const exists = entities.some((entity) => entity.id === selectedId);
    if (!exists) {
      setSelectedId(entities[0]?.id ?? "");
    }
  }, [entities, selectedId]);

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
        entity.tags.some((tag) => tag.toLowerCase().includes(q)) ||
        metadataMatches;

      return matchesType && matchesTag && matchesSearch;
    });

    result.sort((a, b) => {
      if (sortMode === "name-asc") {
        return a.name.localeCompare(b.name, "it");
      }

      if (sortMode === "type") {
        const typeCompare = a.type.localeCompare(b.type, "it");
        if (typeCompare !== 0) return typeCompare;
        return a.name.localeCompare(b.name, "it");
      }

      return b.lastModified - a.lastModified;
    });

    return result;
  }, [entities, search, archiveTypeFilter, tagFilter, sortMode]);

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

  function getEntityById(id: string) {
    return entities.find((entity) => entity.id === id);
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
    const nextType = normalizedPatch.type ?? selectedEntity.type;

    if (typeof normalizedPatch.name === "string") {
      const trimmedName = normalizeEntityName(normalizedPatch.name);

      if (!trimmedName) {
        return;
      }

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
        normalizedPatch.type
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
                getDefaultMetadata(nextType),
            }
          : entity
      )
    );
  }

  function handleOpenCreateEntity(type: EntityType = "luogo") {
    setCreateEntityType(type);
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

    if (!normalizedName) {
      alert("Il nome è obbligatorio.");
      return false;
    }

    if (hasDuplicateEntityName(entities, data.type, normalizedName)) {
      alert("Esiste già un'entità dello stesso tipo con questo nome.");
      return false;
    }

    const newEntity = createEntity(entities, {
      type: data.type,
      name: normalizedName,
      shortDescription: normalizedDescription,
    });

    setRawEntities((current) => [newEntity, ...sanitizeEntities(current)]);
    setSelectedId(newEntity.id);
    setNewTag("");
    setIsCreatingEntity(false);
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

    setRawEntities(initialEntities);
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
    setGraphViewType(DEFAULT_GRAPH_VIEW_TYPE);
    setGraphViewTag("");
    setTimelinePeriodFilter("all");
    setGraphTypeFilters({ ...DEFAULT_GRAPH_TYPE_FILTERS });
    setIsFloatingCreateOpen(false);
  }

  function exportData() {
    const data: WorldData = {
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

    const entitiesValid = candidate.entities.every((entity) => {
      return (
        entity &&
        typeof entity.id === "string" &&
        typeof entity.type === "string" &&
        typeof entity.name === "string" &&
        typeof entity.shortDescription === "string" &&
        typeof entity.notes === "string" &&
        Array.isArray(entity.tags)
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
          typeof relation.inverseType === "string")
      );
    });

    return entitiesValid && relationsValid;
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

        const sanitizedEntities = parsed.entities.map((entity) => {
          const nowIso = new Date().toISOString();
          const nowNum = Date.now();

          return {
            ...entity,
            id:
              typeof entity.id === "string" && entity.id
                ? entity.id
                : crypto.randomUUID(),
            name: normalizeEntityName(entity.name),
            shortDescription: normalizeText(entity.shortDescription),
            notes: entity.notes,
            tags: entity.tags
              .map(normalizeTag)
              .filter(Boolean)
              .filter(
                (tag, index, array) =>
                  array.findIndex((currentTag) => currentTag === tag) === index
              ),
            metadata: remapMetadataForType(
              normalizeMetadata(entity.metadata),
              entity.type
            ),
            createdAt:
              typeof entity.createdAt === "string" ? entity.createdAt : nowIso,
            updatedAt:
              typeof entity.updatedAt === "string" ? entity.updatedAt : nowIso,
            lastModified:
              typeof entity.lastModified === "number"
                ? entity.lastModified
                : nowNum,
          } satisfies Entity;
        });

        const entityIdSet = new Set(sanitizedEntities.map((entity) => entity.id));

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

        setRawEntities(sanitizedEntities);
        setRawRelations(sanitizedRelations);

        setSelectedId(sanitizedEntities[0]?.id ?? "");
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
        setGraphViewType(DEFAULT_GRAPH_VIEW_TYPE);
        setGraphViewTag("");
        setTimelinePeriodFilter("all");
        setGraphTypeFilters({ ...DEFAULT_GRAPH_TYPE_FILTERS });
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

      return buildGraphElements(localEntities, localRelations, selectedEntity.id);
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

      return buildGraphElements(localEntities, localRelations, selectedEntity.id);
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

    return buildGraphElements(localEntities, localRelations, selectedEntity.id);
  }, [
    entities,
    relations,
    selectedEntity,
    graphViewMode,
    graphFilter,
    graphTypeFilters,
    graphViewType,
    graphViewTag,
  ]);

  const showEmptyState = !selectedEntity;

  return (
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
              entities={filteredEntities}
              allTags={allTags}
              selectedEntityId={selectedId}
              searchTerm={search}
              setSearchTerm={setSearch}
              typeFilter={archiveTypeFilter === "all" ? "tutti" : archiveTypeFilter}
              setTypeFilter={(value) =>
                setArchiveTypeFilter(value === "tutti" ? "all" : value)
              }
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
              searchInputRef={searchInputRef}
            />

            <div style={{ display: "grid", gap: "16px", minWidth: 0 }}>
              <EntityEditor
                selectedEntity={selectedEntity}
                newTag={newTag}
                onUpdateEntity={updateSelectedEntity}
                onNewTagChange={setNewTag}
                onAddTag={addTag}
                onRemoveTag={removeTag}
                onDuplicateEntity={duplicateSelectedEntity}
                onDeleteEntity={deleteSelectedEntity}
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

              <GraphPanel
                graphViewMode={graphViewMode}
                graphFilter={graphFilter}
                graphTypeFilters={graphTypeFilters}
                graphViewType={graphViewType}
                graphViewTag={graphViewTag}
                allTags={allTags}
                selectedEntityId={selectedEntity.id}
                graphData={graphData}
                onGraphViewModeChange={setGraphViewMode}
                onGraphFilterChange={setGraphFilter}
                onToggleGraphTypeFilter={toggleGraphTypeFilter}
                onGraphViewTypeChange={setGraphViewType}
                onGraphViewTagChange={setGraphViewTag}
                onNodeClick={setSelectedId}
                getEntityById={getEntityById}
              />
            </div>

            <RelationsPanel
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
              {QUICK_CREATE_OPTIONS.map((option) => (
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
                      backgroundColor: getTypeColor(option.value),
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