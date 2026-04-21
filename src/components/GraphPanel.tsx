import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  applyNodeChanges,
  Background,
  BaseEdge,
  Controls,
  EdgeLabelRenderer,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  getSmoothStepPath,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeChange,
  type NodeProps,
  type ReactFlowInstance,
} from "@xyflow/react";
import {
  GRAPH_FOCUSED_FILTER_OPTIONS,
  GRAPH_VIEW_MODE_DESCRIPTIONS,
  GRAPH_VIEW_MODE_OPTIONS,
  UI_TEXT,
} from "../config";
import {
  cinematicTypography,
  ghostButtonStyle,
  inputStyle,
  modeButtonStyle,
  selectStyle,
  typeToggleStyle,
} from "../styles";
import type { Entity, EntityType, EntityTypeDefinition } from "../types";
import { getEntityTypeLabel, getTypeColor } from "../utils/entity";

export type GraphViewMode = "focused" | "global" | "type-only" | "tag-based";
export type FocusedGraphFilter = "all" | "outgoing" | "incoming";
export type GraphNeighborhoodDepth = 1 | 2 | 3;
export type GraphLayoutMode = "auto" | "free" | "map";
type GraphClusterMode = "none" | "region" | "faction" | "genealogy" | "storyline";
type GraphDetailMode = "full" | "compact";
type GraphNodeLimit = 120 | 240 | "all";
type GraphRelationFamily = "political" | "genealogy" | "geography" | "event" | "neutral";
type GraphPresetId = "focus" | "political" | "genealogy" | "events" | "factions";

type ManualNodePosition = { x: number; y: number };
type ManualNodePositionMap = Record<string, ManualNodePosition>;

type GraphNodeData = {
  label: string;
  name: string;
  entityType: EntityType;
  typeLabel: string;
  shortDescription: string;
  iconGlyph?: string;
  accentColor?: string;
  isSelected?: boolean;
  isConnectedToSelection?: boolean;
  isDimmed?: boolean;
  level?: 0 | 1 | 2;
  metaLabel?: string;
  compact?: boolean;
  density?: "normal" | "dense" | "overloaded";
};

type ClusterBackgroundData = {
  label: string;
  accentColor: string;
  subtitle?: string;
};

type GraphEdgeData = {
  relationLabel?: string;
  showLabel?: boolean;
  family?: GraphRelationFamily;
  emphasis?: "focus" | "context" | "ambient";
  density?: "normal" | "dense" | "overloaded";
};

type GraphPanelProps = {
  entityTypes: EntityTypeDefinition[];
  graphViewMode: GraphViewMode;
  graphFilter: FocusedGraphFilter;
  graphTypeFilters: Record<EntityType, boolean>;
  graphViewType: "all" | EntityType;
  graphViewTag: string;
  graphSearch: string;
  graphRelationFilter: string;
  graphNeighborhoodDepth: GraphNeighborhoodDepth;
  allTags: string[];
  selectedEntityId: string;
  graphData: {
    nodes: Node[];
    edges: Edge[];
  };
  onGraphViewModeChange: (value: GraphViewMode) => void;
  onGraphFilterChange: (value: FocusedGraphFilter) => void;
  onToggleGraphTypeFilter: (type: EntityType) => void;
  onGraphViewTypeChange: (value: "all" | EntityType) => void;
  onGraphViewTagChange: (value: string) => void;
  onGraphSearchChange: (value: string) => void;
  onGraphRelationFilterChange: (value: string) => void;
  onGraphNeighborhoodDepthChange: (value: GraphNeighborhoodDepth) => void;
  onNodeClick: (entityId: string) => void;
  getEntityById: (id: string) => Entity | undefined;
  compactControlsOnly?: boolean;
  graphOnly?: boolean;
};

const GRAPH_LAYOUT_MODE_STORAGE_KEY = "worldbuilder_graph_layout_mode_v2";
const GRAPH_CLUSTER_MODE_STORAGE_KEY = "worldbuilder_graph_cluster_mode_v2";
const GRAPH_NODE_POSITIONS_STORAGE_KEY = "worldbuilder_graph_manual_positions_v2";
const GRAPH_DETAIL_MODE_STORAGE_KEY = "worldbuilder_graph_detail_mode_v1";
const GRAPH_NODE_LIMIT_STORAGE_KEY = "worldbuilder_graph_node_limit_v1";
const GRAPH_COLLAPSED_CLUSTERS_STORAGE_KEY = "worldbuilder_graph_collapsed_clusters_v1";

function safeStorageGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeStorageSet(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore storage failures
  }
}

function readStoredLayoutMode(): GraphLayoutMode {
  const raw = safeStorageGet(GRAPH_LAYOUT_MODE_STORAGE_KEY);
  return raw === "free" || raw === "map" ? raw : "auto";
}

function readStoredClusterMode(): GraphClusterMode {
  const raw = safeStorageGet(GRAPH_CLUSTER_MODE_STORAGE_KEY);
  return raw === "region" || raw === "faction" || raw === "genealogy" || raw === "storyline"
    ? raw
    : "none";
}

function readStoredManualPositions(): ManualNodePositionMap {
  try {
    const raw = safeStorageGet(GRAPH_NODE_POSITIONS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};

    const result: ManualNodePositionMap = {};
    Object.entries(parsed).forEach(([key, value]) => {
      const maybe = value as ManualNodePosition;
      if (typeof maybe?.x === "number" && typeof maybe?.y === "number") {
        result[key] = { x: maybe.x, y: maybe.y };
      }
    });
    return result;
  } catch {
    return {};
  }
}

function readStoredDetailMode(): GraphDetailMode {
  return safeStorageGet(GRAPH_DETAIL_MODE_STORAGE_KEY) === "compact" ? "compact" : "full";
}

function readStoredNodeLimit(): GraphNodeLimit {
  const raw = safeStorageGet(GRAPH_NODE_LIMIT_STORAGE_KEY);
  if (raw === "120") return 120;
  if (raw === "240") return 240;
  return "all";
}

function readStoredCollapsedClusters(): Partial<Record<GraphClusterMode, string[]>> {
  try {
    const raw = safeStorageGet(GRAPH_COLLAPSED_CLUSTERS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object"
      ? (parsed as Partial<Record<GraphClusterMode, string[]>>)
      : {};
  } catch {
    return {};
  }
}

type SharedGraphState = {
  layoutMode: GraphLayoutMode;
  clusterMode: GraphClusterMode;
  manualNodePositions: ManualNodePositionMap;
  detailMode: GraphDetailMode;
  nodeLimit: GraphNodeLimit;
  collapsedClusters: Partial<Record<GraphClusterMode, string[]>>;
};

const sharedGraphState: SharedGraphState = {
  layoutMode: readStoredLayoutMode(),
  clusterMode: readStoredClusterMode(),
  manualNodePositions: readStoredManualPositions(),
  detailMode: readStoredDetailMode(),
  nodeLimit: readStoredNodeLimit(),
  collapsedClusters: readStoredCollapsedClusters(),
};

const sharedListeners = new Set<() => void>();

function updateSharedGraphState(patch: Partial<SharedGraphState>) {
  let changed = false;

  (Object.keys(patch) as Array<keyof SharedGraphState>).forEach((key) => {
    const nextValue = patch[key];
    if (nextValue === undefined) return;
    if (sharedGraphState[key] !== nextValue) {
      sharedGraphState[key] = nextValue as never;
      changed = true;
    }
  });

  if (!changed) return;

  safeStorageSet(GRAPH_LAYOUT_MODE_STORAGE_KEY, sharedGraphState.layoutMode);
  safeStorageSet(GRAPH_CLUSTER_MODE_STORAGE_KEY, sharedGraphState.clusterMode);
  safeStorageSet(GRAPH_DETAIL_MODE_STORAGE_KEY, sharedGraphState.detailMode);
  safeStorageSet(GRAPH_NODE_LIMIT_STORAGE_KEY, String(sharedGraphState.nodeLimit));
  safeStorageSet(
    GRAPH_COLLAPSED_CLUSTERS_STORAGE_KEY,
    JSON.stringify(sharedGraphState.collapsedClusters)
  );
  safeStorageSet(
    GRAPH_NODE_POSITIONS_STORAGE_KEY,
    JSON.stringify(sharedGraphState.manualNodePositions)
  );

  sharedListeners.forEach((listener) => listener());
}

function subscribeSharedGraphState(listener: () => void) {
  sharedListeners.add(listener);
  return () => {
    sharedListeners.delete(listener);
  };
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}+/gu, "")
    .trim()
    .toLowerCase();
}


function getClusterAccent(clusterMode: GraphClusterMode, label: string): string {
  if (clusterMode === "region") {
    const normalized = normalizeText(label);
    if (normalized.includes("costa")) return "#2dd4bf";
    if (normalized.includes("giungla") || normalized.includes("foresta")) return "#22c55e";
    if (normalized.includes("rovine")) return "#f59e0b";
    if (normalized.includes("mont")) return "#94a3b8";
    if (normalized.includes("isola")) return "#38bdf8";
    if (normalized.includes("citt") || normalized.includes("porto")) return "#60a5fa";
    return "#34d399";
  }

  if (clusterMode === "faction") {
    const palette = ["#c084fc", "#f472b6", "#60a5fa", "#f59e0b", "#34d399", "#fb7185"];
    const index = Array.from(label).reduce((acc, char) => acc + char.charCodeAt(0), 0) % palette.length;
    return palette[index];
  }

  if (clusterMode === "genealogy") {
    const palette = ["#f59e0b", "#fb7185", "#c084fc", "#60a5fa", "#34d399", "#f97316"];
    const index = Array.from(label).reduce((acc, char) => acc + char.charCodeAt(0), 0) % palette.length;
    return palette[index];
  }

  if (clusterMode === "storyline") {
    const palette = ["#38bdf8", "#f59e0b", "#34d399", "#fb7185", "#c084fc", "#f97316"];
    const index = Array.from(label).reduce((acc, char) => acc + char.charCodeAt(0), 0) % palette.length;
    return palette[index];
  }

  return "#64748b";
}

function pickFirstMetadataValue(entity: Entity | undefined, keys: string[]): string {
  if (!entity?.metadata) return "";

  for (const [rawKey, rawValue] of Object.entries(entity.metadata)) {
    if (typeof rawValue !== "string") continue;
    const normalized = rawKey.trim().toLowerCase();
    if (keys.includes(normalized) && rawValue.trim()) {
      return rawValue.trim();
    }
  }

  return "";
}



function normalizeRelationLabel(value: string | undefined): string {
  return normalizeText(value ?? "");
}

function isPlaceEntity(entity: Entity | undefined): boolean {
  return normalizeText(entity?.type ?? "").includes("luog");
}

function isCharacterEntity(entity: Entity | undefined): boolean {
  const normalized = normalizeText(entity?.type ?? "");
  return normalized.includes("person") || normalized.includes("char") || normalized.includes("npc");
}

function extractEdgeRelationLabel(edge: Edge): string {
  if (typeof edge.label === "string") return edge.label;
  if (edge.data && typeof edge.data === "object" && "relationLabel" in edge.data) {
    const maybe = (edge.data as { relationLabel?: unknown }).relationLabel;
    return typeof maybe === "string" ? maybe : "";
  }
  if (edge.data && typeof edge.data === "object" && "label" in edge.data) {
    const maybe = (edge.data as { label?: unknown }).label;
    return typeof maybe === "string" ? maybe : "";
  }
  return "";
}

type GraphRelationshipEdge = {
  sourceId: string;
  targetId: string;
  relationLabel: string;
};

type ClusterComputationContext = {
  entitiesById: Map<string, Entity>;
  outgoingById: Map<string, GraphRelationshipEdge[]>;
  incomingById: Map<string, GraphRelationshipEdge[]>;
};


type GenealogyTreeData = {
  parentIdsById: Record<string, string[]>;
  childIdsById: Record<string, string[]>;
  partnerIdsById: Record<string, string[]>;
};

function buildClusterComputationContext(
  nodes: Node[],
  edges: Edge[],
  getEntityById: (id: string) => Entity | undefined
): ClusterComputationContext {
  const entitiesById = new Map<string, Entity>();
  nodes.forEach((node) => {
    const entity = getEntityById(String(node.id));
    if (entity) {
      entitiesById.set(String(node.id), entity);
    }
  });

  const outgoingById = new Map<string, GraphRelationshipEdge[]>();
  const incomingById = new Map<string, GraphRelationshipEdge[]>();

  const register = (
    map: Map<string, GraphRelationshipEdge[]>,
    key: string,
    value: GraphRelationshipEdge
  ) => {
    const current = map.get(key) ?? [];
    current.push(value);
    map.set(key, current);
  };

  edges.forEach((edge) => {
    const relationLabel = extractEdgeRelationLabel(edge);
    const item: GraphRelationshipEdge = {
      sourceId: String(edge.source),
      targetId: String(edge.target),
      relationLabel,
    };
    register(outgoingById, item.sourceId, item);
    register(incomingById, item.targetId, item);
  });

  return { entitiesById, outgoingById, incomingById };
}

const PLACE_PARENT_RELATIONS = [
  "si trova in",
  "si trova dentro",
  "fa parte di",
  "appartiene a",
  "dentro",
  "in",
];

const PLACE_CHILD_RELATIONS = [
  "contiene",
  "include",
  "ospita",
];

const ENTITY_TO_PLACE_RELATIONS = [
  "abita in",
  "vive in",
  "si trova in",
  "si svolge in",
  "ha luogo in",
  "proviene da",
  "origine",
  "originario di",
  "controlla",
  "territorio",
];

const GENEALOGY_RELATION_HINTS = [
  "padre",
  "madre",
  "genitore",
  "figlio",
  "figlia",
  "figli",
  "discende",
  "discendente",
  "coniuge",
  "sposa",
  "sposo",
  "partner",
  "marito",
  "moglie",
  "fratello",
  "sorella",
  "fratell",
  "sorell",
  "famiglia",
  "casata",
  "parente",
];

function relationLabelMatches(label: string, candidates: string[]): boolean {
  const normalized = normalizeRelationLabel(label);
  return candidates.some((candidate) => normalized.includes(normalizeRelationLabel(candidate)));
}

function getDirectParentPlaceId(placeId: string, context: ClusterComputationContext): string | null {
  const outgoing = context.outgoingById.get(placeId) ?? [];
  for (const edge of outgoing) {
    const targetEntity = context.entitiesById.get(edge.targetId);
    if (!isPlaceEntity(targetEntity)) continue;
    if (relationLabelMatches(edge.relationLabel, PLACE_PARENT_RELATIONS)) {
      return edge.targetId;
    }
  }

  const incoming = context.incomingById.get(placeId) ?? [];
  for (const edge of incoming) {
    const sourceEntity = context.entitiesById.get(edge.sourceId);
    if (!isPlaceEntity(sourceEntity)) continue;
    if (relationLabelMatches(edge.relationLabel, PLACE_CHILD_RELATIONS)) {
      return edge.sourceId;
    }
  }

  return null;
}

function resolveRootPlaceId(placeId: string, context: ClusterComputationContext): string {
  const visited = new Set<string>();
  let currentId = placeId;

  while (!visited.has(currentId)) {
    visited.add(currentId);
    const parentId = getDirectParentPlaceId(currentId, context);
    if (!parentId) {
      return currentId;
    }
    currentId = parentId;
  }

  return currentId;
}

function findBestPlaceForEntity(entityId: string, context: ClusterComputationContext): string | null {
  const entity = context.entitiesById.get(entityId);
  if (!entity) return null;

  if (isPlaceEntity(entity)) {
    return entity.id;
  }

  const outgoing = context.outgoingById.get(entityId) ?? [];
  for (const edge of outgoing) {
    const targetEntity = context.entitiesById.get(edge.targetId);
    if (!isPlaceEntity(targetEntity)) continue;
    if (relationLabelMatches(edge.relationLabel, ENTITY_TO_PLACE_RELATIONS)) {
      return edge.targetId;
    }
  }

  const incoming = context.incomingById.get(entityId) ?? [];
  for (const edge of incoming) {
    const sourceEntity = context.entitiesById.get(edge.sourceId);
    if (!isPlaceEntity(sourceEntity)) continue;
    if (relationLabelMatches(edge.relationLabel, PLACE_CHILD_RELATIONS)) {
      return edge.sourceId;
    }
  }

  return null;
}

function resolveRegionClusterLabel(entityId: string, context: ClusterComputationContext): string {
  const entity = context.entitiesById.get(entityId);
  if (!entity) return "Area non definita";

  const directRegion = pickFirstMetadataValue(entity, [
    "regione",
    "region",
    "area",
    "zona",
    "territorio",
    "territory",
    "bioma",
    "macroarea",
    "macro-area",
    "district",
  ]);

  const placeId = findBestPlaceForEntity(entityId, context);
  if (placeId) {
    const rootPlaceId = resolveRootPlaceId(placeId, context);
    const rootPlace = context.entitiesById.get(rootPlaceId);
    if (rootPlace?.name?.trim()) {
      return rootPlace.name.trim();
    }
  }

  return directRegion || "Area non definita";
}

function isGenealogyRelation(edge: GraphRelationshipEdge, context: ClusterComputationContext): boolean {
  const sourceEntity = context.entitiesById.get(edge.sourceId);
  const targetEntity = context.entitiesById.get(edge.targetId);
  if (!isCharacterEntity(sourceEntity) || !isCharacterEntity(targetEntity)) {
    return false;
  }

  return relationLabelMatches(edge.relationLabel, GENEALOGY_RELATION_HINTS);
}

function buildGenealogyClusterMap(context: ClusterComputationContext): Record<string, string> {
  const characterIds = Array.from(context.entitiesById.values())
    .filter((entity) => isCharacterEntity(entity))
    .map((entity) => entity.id);

  if (characterIds.length === 0) return {};

  const adjacency = new Map<string, Set<string>>();
  const ensure = (id: string) => {
    if (!adjacency.has(id)) adjacency.set(id, new Set());
    return adjacency.get(id)!;
  };

  characterIds.forEach((id) => ensure(id));

  const allEdges = new Set<GraphRelationshipEdge>();
  context.outgoingById.forEach((items) => items.forEach((item) => allEdges.add(item)));

  Array.from(allEdges).forEach((edge) => {
    if (!isGenealogyRelation(edge, context)) return;
    ensure(edge.sourceId).add(edge.targetId);
    ensure(edge.targetId).add(edge.sourceId);
  });

  const labelsById: Record<string, string> = {};
  const visited = new Set<string>();

  characterIds.forEach((startId) => {
    if (visited.has(startId)) return;

    const queue = [startId];
    const component: string[] = [];
    visited.add(startId);

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      component.push(currentId);

      const neighbors = adjacency.get(currentId) ?? new Set<string>();
      neighbors.forEach((neighborId) => {
        if (visited.has(neighborId)) return;
        visited.add(neighborId);
        queue.push(neighborId);
      });
    }

    const namedEntities = component
      .map((id) => context.entitiesById.get(id))
      .filter((entity): entity is Entity => Boolean(entity))
      .sort((a, b) => a.name.localeCompare(b.name, "it", { sensitivity: "base" }));

    const anchor = namedEntities[0];
    const label =
      component.length <= 1
        ? `Linea di ${anchor?.name ?? "personaggio"}`
        : `Albero di ${anchor?.name ?? "famiglia"}`;

    component.forEach((id) => {
      labelsById[id] = label;
    });
  });

  return labelsById;
}

function buildClusterKeyMap(
  clusterMode: GraphClusterMode,
  context: ClusterComputationContext
): Record<string, string> {
  const labelsById: Record<string, string> = {};

  if (clusterMode === "none") {
    context.entitiesById.forEach((_, entityId) => {
      labelsById[entityId] = "Tutto";
    });
    return labelsById;
  }

  if (clusterMode === "region") {
    context.entitiesById.forEach((_, entityId) => {
      labelsById[entityId] = resolveRegionClusterLabel(entityId, context);
    });
    return labelsById;
  }

  if (clusterMode === "genealogy") {
    const genealogyLabels = buildGenealogyClusterMap(context);
    context.entitiesById.forEach((entity, entityId) => {
      labelsById[entityId] =
        genealogyLabels[entityId] ??
        (isCharacterEntity(entity) ? `Linea di ${entity.name}` : "Fuori genealogia");
    });
    return labelsById;
  }

  if (clusterMode === "storyline") {
    context.entitiesById.forEach((entity, entityId) => {
      const metadataStoryline =
        pickFirstMetadataValue(entity, [
          "storyline",
          "story",
          "plot",
          "trama",
          "arco",
          "arc",
          "campagna",
          "questline",
        ]) || "";

      const tagStoryline =
        entity.tags.find((tag) => {
          const normalized = normalizeText(tag);
          return (
            normalized.startsWith("story:") ||
            normalized.startsWith("storyline:") ||
            normalized.startsWith("arco:") ||
            normalized.startsWith("plot:")
          );
        }) ??
        entity.tags.find((tag) => {
          const normalized = normalizeText(tag);
          return (
            normalized.includes("story") ||
            normalized.includes("trama") ||
            normalized.includes("quest") ||
            normalized.includes("capitolo") ||
            normalized.includes("atto")
          );
        }) ??
        entity.tags[0] ??
        "";

      labelsById[entityId] = metadataStoryline || tagStoryline || "Storyline libera";
    });
    return labelsById;
  }

  context.entitiesById.forEach((entity, entityId) => {
    labelsById[entityId] =
      pickFirstMetadataValue(entity, [
        "fazione",
        "faction",
        "clan",
        "tribù",
        "tribu",
        "tribe",
        "organizzazione",
        "organization",
        "casata",
        "ordine",
      ]) || "Fazione non definita";
  });

  return labelsById;
}

function getUniqueSortedIds(values: string[]): string[] {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b, "it", { sensitivity: "base" }));
}

function buildGenealogyTreeData(context: ClusterComputationContext): GenealogyTreeData {
  const parentIdsById: Record<string, string[]> = {};
  const childIdsById: Record<string, string[]> = {};
  const partnerIdsById: Record<string, string[]> = {};

  const pushPair = (record: Record<string, string[]>, key: string, value: string) => {
    record[key] = record[key] ?? [];
    record[key].push(value);
  };

  const allEdges = new Set<GraphRelationshipEdge>();
  context.outgoingById.forEach((items) => items.forEach((item) => allEdges.add(item)));

  Array.from(allEdges).forEach((edge) => {
    if (!isGenealogyRelation(edge, context)) return;

    const normalized = normalizeRelationLabel(edge.relationLabel);

    const isPartner = ["coniuge", "partner", "moglie", "marito", "sposa", "sposo"].some((hint) =>
      normalized.includes(hint)
    );

    if (isPartner) {
      pushPair(partnerIdsById, edge.sourceId, edge.targetId);
      pushPair(partnerIdsById, edge.targetId, edge.sourceId);
      return;
    }

    let parentId = edge.sourceId;
    let childId = edge.targetId;

    const childFirstHints = ["figlio", "figlia", "figli", "discende", "discendente"];
    const parentFirstHints = ["padre", "madre", "genitore"];

    if (childFirstHints.some((hint) => normalized.includes(hint))) {
      parentId = edge.targetId;
      childId = edge.sourceId;
    } else if (!parentFirstHints.some((hint) => normalized.includes(hint))) {
      parentId = edge.sourceId;
      childId = edge.targetId;
    }

    pushPair(parentIdsById, childId, parentId);
    pushPair(childIdsById, parentId, childId);
  });

  Object.keys(parentIdsById).forEach((key) => {
    parentIdsById[key] = getUniqueSortedIds(parentIdsById[key] ?? []);
  });
  Object.keys(childIdsById).forEach((key) => {
    childIdsById[key] = getUniqueSortedIds(childIdsById[key] ?? []);
  });
  Object.keys(partnerIdsById).forEach((key) => {
    partnerIdsById[key] = getUniqueSortedIds(partnerIdsById[key] ?? []);
  });

  return { parentIdsById, childIdsById, partnerIdsById };
}

function buildGeographicClusterLayout(
  clusterNodes: Node<GraphNodeData>[],
  layoutMode: GraphLayoutMode
): { positions: ManualNodePositionMap; width: number; height: number } {
  const columns = Math.max(2, Math.ceil(Math.sqrt(clusterNodes.length * 1.8)));
  const spacingX = layoutMode === "map" ? 560 : 500;
  const spacingY = layoutMode === "map" ? 290 : 250;
  const positions: ManualNodePositionMap = {};

  clusterNodes.forEach((node, index) => {
    const shape = getNodeShape(node.data.entityType);
    const col = index % columns;
    const row = Math.floor(index / columns);
    const centeredX = col * spacingX - ((columns - 1) * spacingX) / 2;
    const staggerX = row % 2 === 0 ? 0 : 42;
    let localX = centeredX + staggerX;
    let localY = row * spacingY;

    if (shape.orientation === "wide") localY -= 38;
    if (shape.orientation === "badge") localX += 28;
    if (shape.orientation === "compact") localY += 24;
    if (shape.orientation === "timeline") localX -= 18;

    positions[String(node.id)] = { x: localX, y: localY };
  });

  const relaxed = relaxNodePositions(clusterNodes, positions, 110);
  const maxWidth = Math.max(...clusterNodes.map((node) => getNodeShape(node.data.entityType).width));
  const maxHeight = Math.max(...clusterNodes.map((node) => getNodeShape(node.data.entityType).minHeight));
  const rows = Math.max(1, Math.ceil(clusterNodes.length / columns));

  return {
    positions: relaxed,
    width: Math.max(760, (columns - 1) * spacingX + maxWidth + 320),
    height: Math.max(420, (rows - 1) * spacingY + maxHeight + 220),
  };
}

function buildGenealogyClusterLayout(
  clusterNodes: Node<GraphNodeData>[],
  genealogyTree: GenealogyTreeData | undefined
): { positions: ManualNodePositionMap; width: number; height: number } {
  const positions: ManualNodePositionMap = {};
  const nodeIds = new Set(clusterNodes.map((node) => String(node.id)));
  const nodesById = new Map(clusterNodes.map((node) => [String(node.id), node] as const));
  const parentIdsById = genealogyTree?.parentIdsById ?? {};
  const childIdsById = genealogyTree?.childIdsById ?? {};
  const partnerIdsById = genealogyTree?.partnerIdsById ?? {};

  const depthMemo = new Map<string, number>();
  const visiting = new Set<string>();

  const getDepth = (id: string): number => {
    if (depthMemo.has(id)) return depthMemo.get(id) ?? 0;
    if (visiting.has(id)) return 0;
    visiting.add(id);
    const parents = (parentIdsById[id] ?? []).filter((parentId) => nodeIds.has(parentId));
    const depth = parents.length === 0 ? 0 : Math.max(...parents.map((parentId) => getDepth(parentId) + 1));
    visiting.delete(id);
    depthMemo.set(id, depth);
    return depth;
  };

  clusterNodes.forEach((node) => {
    getDepth(String(node.id));
  });

  const levelMap = new Map<number, string[]>();
  clusterNodes.forEach((node) => {
    const id = String(node.id);
    const depth = depthMemo.get(id) ?? 0;
    const bucket = levelMap.get(depth) ?? [];
    bucket.push(id);
    levelMap.set(depth, bucket);
  });

  const levels = Array.from(levelMap.keys()).sort((a, b) => a - b);
  const horizontalSpacing = 290;
  const verticalSpacing = 260;
  let maxRowWidth = 0;

  levels.forEach((level) => {
    const ids = (levelMap.get(level) ?? []).sort((a, b) => {
      const aPartners = (partnerIdsById[a] ?? []).filter((partnerId) => nodeIds.has(partnerId)).join("|");
      const bPartners = (partnerIdsById[b] ?? []).filter((partnerId) => nodeIds.has(partnerId)).join("|");
      const aChildren = (childIdsById[a] ?? []).filter((childId) => nodeIds.has(childId)).length;
      const bChildren = (childIdsById[b] ?? []).filter((childId) => nodeIds.has(childId)).length;
      if (aPartners !== bPartners) return aPartners.localeCompare(bPartners, "it");
      if (aChildren !== bChildren) return bChildren - aChildren;
      const aName = nodesById.get(a)?.data.name ?? a;
      const bName = nodesById.get(b)?.data.name ?? b;
      return aName.localeCompare(bName, "it", { sensitivity: "base" });
    });

    const placed = new Set<string>();
    const ordered: string[] = [];
    ids.forEach((id) => {
      if (placed.has(id)) return;
      ordered.push(id);
      placed.add(id);
      const partner = (partnerIdsById[id] ?? []).find((partnerId) => ids.includes(partnerId) && !placed.has(partnerId));
      if (partner) {
        ordered.push(partner);
        placed.add(partner);
      }
    });

    const rowWidth = Math.max(0, (ordered.length - 1) * horizontalSpacing);
    maxRowWidth = Math.max(maxRowWidth, rowWidth);

    ordered.forEach((id, index) => {
      const x = index * horizontalSpacing - rowWidth / 2;
      const y = level * verticalSpacing;
      positions[id] = { x, y };
    });
  });

  const relaxed = relaxNodePositions(clusterNodes, positions, 40);
  return {
    positions: relaxed,
    width: Math.max(760, maxRowWidth + 520),
    height: Math.max(480, Math.max(1, levels.length) * verticalSpacing + 220),
  };
}

function getTypeGlyph(entityType: EntityType) {
  const normalized = String(entityType).toLowerCase();
  if (normalized.includes("luog") || normalized.includes("place") || normalized.includes("region")) return "⌘";
  if (normalized.includes("person") || normalized.includes("char") || normalized.includes("npc")) return "◉";
  if (normalized.includes("fazi") || normalized.includes("faction") || normalized.includes("clan")) return "✦";
  if (normalized.includes("ogg") || normalized.includes("item") || normalized.includes("artifact")) return "◆";
  if (normalized.includes("event") || normalized.includes("evento") || normalized.includes("storia")) return "⟡";
  return "•";
}

function getNodeShape(entityType: EntityType) {
  const normalized = String(entityType).toLowerCase();
  if (normalized.includes("luog") || normalized.includes("place") || normalized.includes("region")) {
    return { width: 276, minHeight: 104, radius: 22, orientation: "wide" as const };
  }
  if (normalized.includes("person") || normalized.includes("char") || normalized.includes("npc")) {
    return { width: 218, minHeight: 124, radius: 22, orientation: "tall" as const };
  }
  if (normalized.includes("fazi") || normalized.includes("faction") || normalized.includes("clan")) {
    return { width: 236, minHeight: 110, radius: 20, orientation: "badge" as const };
  }
  if (normalized.includes("ogg") || normalized.includes("item") || normalized.includes("artifact")) {
    return { width: 188, minHeight: 88, radius: 18, orientation: "compact" as const };
  }
  if (normalized.includes("event") || normalized.includes("evento") || normalized.includes("storia")) {
    return { width: 250, minHeight: 92, radius: 999, orientation: "timeline" as const };
  }
  return { width: 226, minHeight: 98, radius: 20, orientation: "default" as const };
}

function getNodeSemanticTone(entityType: EntityType) {
  const normalized = String(entityType).toLowerCase();
  if (normalized.includes("luog") || normalized.includes("place") || normalized.includes("region")) {
    return {
      familyLabel: "Geografia",
        surface: "linear-gradient(180deg, rgba(15,29,40,0.46) 0%, rgba(9,16,24,0.28) 100%)",
        overlay: "radial-gradient(circle at 18% 18%, rgba(56,189,248,0.18) 0%, transparent 38%), linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 58%)",
    };
  }
  if (normalized.includes("person") || normalized.includes("char") || normalized.includes("npc")) {
    return {
      familyLabel: "Personaggio",
        surface: "linear-gradient(180deg, rgba(41,20,28,0.44) 0%, rgba(18,12,18,0.28) 100%)",
        overlay: "radial-gradient(circle at 18% 18%, rgba(251,113,133,0.18) 0%, transparent 38%), linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 58%)",
    };
  }
  if (normalized.includes("fazi") || normalized.includes("faction") || normalized.includes("clan")) {
    return {
      familyLabel: "Fazione",
        surface: "linear-gradient(180deg, rgba(44,28,12,0.44) 0%, rgba(18,14,10,0.28) 100%)",
        overlay: "radial-gradient(circle at 18% 18%, rgba(245,158,11,0.18) 0%, transparent 38%), linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 58%)",
    };
  }
  if (normalized.includes("ogg") || normalized.includes("item") || normalized.includes("artifact")) {
    return {
      familyLabel: "Oggetto",
        surface: "linear-gradient(180deg, rgba(14,34,28,0.44) 0%, rgba(9,20,18,0.28) 100%)",
        overlay: "radial-gradient(circle at 18% 18%, rgba(52,211,153,0.18) 0%, transparent 38%), linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 58%)",
    };
  }
  if (normalized.includes("event") || normalized.includes("evento") || normalized.includes("storia")) {
    return {
      familyLabel: "Evento",
        surface: "linear-gradient(180deg, rgba(28,20,44,0.45) 0%, rgba(13,11,23,0.28) 100%)",
        overlay: "radial-gradient(circle at 18% 18%, rgba(167,139,250,0.18) 0%, transparent 38%), linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 58%)",
    };
  }
  return {
    familyLabel: "Entità",
    surface: "linear-gradient(180deg, rgba(18,22,30,0.44) 0%, rgba(9,13,19,0.28) 100%)",
    overlay: "radial-gradient(circle at 18% 18%, rgba(148,163,184,0.16) 0%, transparent 38%), linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 55%)",
  };
}

function classifyRelationFamily(label: string): GraphRelationFamily {
  const normalized = normalizeRelationLabel(label);
  if (!normalized) return "neutral";
  if (
    normalized.includes("figlio") ||
    normalized.includes("madre") ||
    normalized.includes("padre") ||
    normalized.includes("coniuge") ||
    normalized.includes("discende") ||
    normalized.includes("famiglia")
  ) {
    return "genealogy";
  }
  if (
    normalized.includes("controlla") ||
    normalized.includes("governa") ||
    normalized.includes("leader") ||
    normalized.includes("membro") ||
    normalized.includes("alleato") ||
    normalized.includes("nemico")
  ) {
    return "political";
  }
  if (
    normalized.includes("abita") ||
    normalized.includes("vive") ||
    normalized.includes("si trova") ||
    normalized.includes("ospita") ||
    normalized.includes("territorio") ||
    normalized.includes("proviene")
  ) {
    return "geography";
  }
  if (
    normalized.includes("svolge") ||
    normalized.includes("caus") ||
    normalized.includes("inizia") ||
    normalized.includes("termina") ||
    normalized.includes("distrutto") ||
    normalized.includes("evento")
  ) {
    return "event";
  }
  return "neutral";
}

function getRelationFamilyTheme(family: GraphRelationFamily) {
  if (family === "political") {
    return { accent: "#f59e0b", dash: "8 4", label: "Politica" };
  }
  if (family === "genealogy") {
    return { accent: "#fb7185", dash: undefined, label: "Genealogia" };
  }
  if (family === "geography") {
    return { accent: "#38bdf8", dash: "2 0", label: "Geografia" };
  }
  if (family === "event") {
    return { accent: "#a78bfa", dash: "5 6", label: "Eventi" };
  }
  return { accent: "#94a3b8", dash: "3 5", label: "Generale" };
}

function GraphAutoFocus({
  selectedEntityId,
  nodes,
  layoutMode,
  reactFlow,
}: {
  selectedEntityId: string;
  nodes: Node[];
  layoutMode: GraphLayoutMode;
  reactFlow: ReactFlowInstance<Node, Edge> | null;
}) {
  useEffect(() => {
    if (!reactFlow || !nodes.length || layoutMode === "free") return;

    const targetNode = nodes.find((node) => String(node.id) === selectedEntityId);
    if (!targetNode) {
      const fitPadding = nodes.length > 180 ? 0.38 : nodes.length > 100 ? 0.3 : 0.22;
      window.requestAnimationFrame(() => {
        reactFlow.fitView({ padding: fitPadding, duration: 380, includeHiddenNodes: true });
      });
      return;
    }

    const width = typeof targetNode.width === "number" ? targetNode.width : 240;
    const height = typeof targetNode.height === "number" ? targetNode.height : 100;
    const targetZoom = nodes.length > 180 ? 0.86 : nodes.length > 100 ? 0.96 : 1.08;

    window.requestAnimationFrame(() => {
      reactFlow.setCenter(targetNode.position.x + width / 2, targetNode.position.y + height / 2, {
        zoom: targetZoom,
        duration: 420,
      });
    });
  }, [reactFlow, selectedEntityId, nodes, layoutMode]);

  return null;
}

function WorldNode({ data }: NodeProps<Node<GraphNodeData>>) {
  const [isHovered, setIsHovered] = useState(false);
  const accent = data.accentColor ?? "#64748b";
  const shape = getNodeShape(data.entityType);
  const tone = getNodeSemanticTone(data.entityType);
  const isSelected = Boolean(data.isSelected);
  const isConnected = Boolean(data.isConnectedToSelection);
  const isDimmed = Boolean(data.isDimmed);
  const level = data.level ?? 1;
  const compact = Boolean(data.compact);
  const density = data.density ?? "normal";
  const denseOpacity = density === "overloaded" ? 0.14 : density === "dense" ? 0.22 : 0.3;
  const lift = isSelected ? -8 : isHovered ? -4 : isConnected ? -2 : 0;
  const scale = isSelected ? 1.035 : isConnected ? 1.012 : density === "overloaded" && isDimmed ? 0.985 : 1;

  const border = isSelected
    ? `1px solid ${accent}88`
    : isConnected
    ? `1px solid ${accent}4a`
    : level === 2
    ? "1px dashed rgba(255,255,255,0.12)"
    : "1px solid rgba(255,255,255,0.08)";

  const shadow = isSelected
    ? `0 18px 40px rgba(0,0,0,0.24), 0 0 32px ${accent}18, inset 0 1px 0 rgba(255,255,255,0.14)`
    : isConnected
    ? `0 14px 30px rgba(0,0,0,0.22), 0 0 24px ${accent}12, inset 0 1px 0 rgba(255,255,255,0.1)`
    : "0 14px 28px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.08)";

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: shape.width,
        minHeight: shape.minHeight,
        opacity: isDimmed ? denseOpacity : isConnected && density !== "normal" ? 0.94 : 1,
        transition: "opacity 220ms ease, transform 280ms ease, filter 280ms ease",
        transform: `translateY(${lift}px) scale(${scale})`,
        filter: isSelected ? "saturate(1.08)" : isConnected ? "saturate(1.02)" : "none",
      }}
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />

      {isHovered && data.shortDescription && !compact ? (
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: "calc(100% + 12px)",
            transform: "translateX(-50%)",
            width: 274,
            maxWidth: 274,
            zIndex: 40,
            borderRadius: 16,
            border: `1px solid ${accent}30`,
            background: "rgba(10,14,21,0.52)",
            padding: "12px 14px",
            boxShadow: `0 18px 36px rgba(0,0,0,0.28), 0 0 22px ${accent}14`,
            backdropFilter: "blur(18px)",
            WebkitBackdropFilter: "blur(18px)",
            pointerEvents: "none",
            fontFamily: graphBodyFont,
          }}
        >
          <div style={{ fontSize: 12, lineHeight: 1.6, color: cinematicTypography.ink }}>{data.shortDescription}</div>
        </div>
      ) : null}

      <div
        style={{
          position: "relative",
          minHeight: shape.minHeight,
          borderRadius: shape.radius,
          border,
          boxShadow: shadow,
          background: tone.surface,
          overflow: "hidden",
          padding: shape.orientation === "compact" ? "11px 13px" : "14px 15px",
          fontFamily: graphBodyFont,
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: tone.overlay,
            pointerEvents: "none",
          }}
        />
        {isSelected ? (
          <div
            style={{
              position: "absolute",
              inset: "-18%",
              background: `radial-gradient(circle, ${accent}1a 0%, transparent 60%)`,
              filter: "blur(20px)",
              pointerEvents: "none",
            }}
          />
        ) : null}

        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            background: `linear-gradient(90deg, ${accent} 0%, ${accent}55 100%)`,
            opacity: isDimmed ? 0.42 : 1,
          }}
        />

        <div
          style={{
            display: "flex",
            alignItems: shape.orientation === "tall" ? "flex-start" : "center",
            gap: 12,
            position: "relative",
          }}
        >
          <div
            style={{
               width: shape.orientation === "compact" ? 28 : 34,
               height: shape.orientation === "compact" ? 28 : 34,
               borderRadius: shape.orientation === "timeline" ? 12 : 14,
               background: `${accent}14`,
               border: `1px solid ${accent}26`,
               color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: 14,
              flexShrink: 0,
               boxShadow: `inset 0 1px 0 rgba(255,255,255,0.08), 0 10px 18px ${accent}10`,
               backdropFilter: "blur(14px)",
               WebkitBackdropFilter: "blur(14px)",
             }}
           >
            {data.iconGlyph ?? "•"}
          </div>

          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                marginBottom: 8,
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  color: cinematicTypography.inkSoft,
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  fontFamily: graphBodyFont,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 999,
                    background: accent,
                    boxShadow: `0 0 12px ${accent}55`,
                    flexShrink: 0,
                  }}
                />
                {tone.familyLabel}
              </div>
              {data.metaLabel && compact ? (
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                     color: cinematicTypography.inkMuted,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  {data.metaLabel}
                </div>
              ) : null}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
                marginBottom: 6,
              }}
            >
              <div
                style={{
                   fontSize: shape.orientation === "wide" ? 17 : 15,
                   fontWeight: 700,
                   color: cinematicTypography.inkStrong,
                  lineHeight: 1.25,
                  wordBreak: "break-word",
                  fontFamily: graphDisplayFont,
                  letterSpacing: "0.01em",
                }}
              >
                {data.name}
              </div>
              {isSelected ? (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: accent,
                    fontFamily: graphBodyFont,
                  }}
                >
                  attivo
                </span>
              ) : null}
            </div>

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                color: cinematicTypography.ink,
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                fontFamily: graphBodyFont,
              }}
            >
              <span
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.72)",
                  opacity: 0.7,
                }}
              />
              {data.typeLabel}
            </div>

            {data.metaLabel && !compact ? (
              <div
                style={{
                  marginTop: 10,
                  fontSize: 12,
                  lineHeight: 1.45,
                   color: cinematicTypography.inkMuted,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {data.metaLabel}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function ClusterBackgroundNode({
  data,
  width,
  height,
}: NodeProps<Node<ClusterBackgroundData>>) {
  return (
    <div
      style={{
        width: typeof width === "number" ? `${width}px` : "420px",
        height: typeof height === "number" ? `${height}px` : "260px",
        borderRadius: "28px",
        border: `1px dashed ${data.accentColor}24`,
        background: `radial-gradient(circle at top left, ${data.accentColor}14 0%, transparent 42%), linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(15,23,42,0.04) 100%)`,
        boxShadow: `inset 0 0 0 1px ${data.accentColor}08, 0 18px 42px rgba(0,0,0,0.08)`,
        position: "relative",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "14px",
          left: "16px",
          display: "inline-flex",
          flexDirection: "column",
          gap: "4px",
          color: cinematicTypography.inkStrong,
          maxWidth: "70%",
          fontFamily: graphBodyFont,
          textShadow: "0 6px 20px rgba(0,0,0,0.22)",
        }}
      >
        <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: cinematicTypography.gold }}>
          cluster
        </div>
        <div style={{ fontSize: "17px", fontWeight: 700, lineHeight: 1.2, fontFamily: graphDisplayFont }}>{data.label}</div>
        {data.subtitle ? (
          <div style={{ fontSize: "12px", color: cinematicTypography.inkMuted, lineHeight: 1.5 }}>
            {data.subtitle}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function RelationEdge(props: EdgeProps<Edge<GraphEdgeData>>) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    markerEnd,
    style,
    data,
  } = props;

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 18,
  });

  const relationLabel = typeof data?.relationLabel === "string" ? data.relationLabel.trim() : "";
  const showLabel = Boolean(data?.showLabel);
  const family = data?.family ?? "neutral";
  const familyTheme = getRelationFamilyTheme(family);
  const emphasis = data?.emphasis ?? "ambient";
  const density = data?.density ?? "normal";
  const mainStrokeWidth = emphasis === "focus" ? 2.5 : emphasis === "context" ? 1.9 : density === "overloaded" ? 0.95 : 1.25;
  const glowWidth = emphasis === "focus" ? mainStrokeWidth + 4 : emphasis === "context" ? mainStrokeWidth + 2.6 : mainStrokeWidth + 1.5;
  const glowStroke =
    emphasis === "focus"
      ? `${familyTheme.accent}38`
      : emphasis === "context"
      ? `${familyTheme.accent}20`
      : density === "overloaded"
      ? "rgba(148,163,184,0.06)"
      : `${familyTheme.accent}12`;
  const labelFontSize = density === "overloaded" ? 11 : 12;

  return (
    <>
      <BaseEdge
        id={`${id}-glow`}
        path={edgePath}
        style={{
          stroke: glowStroke,
          strokeWidth: glowWidth,
          strokeDasharray: style?.strokeDasharray,
          strokeLinecap: "round",
        }}
      />
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeLinecap: "round",
        }}
      />
      {relationLabel && showLabel ? (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: "none",
              zIndex: 50,
              padding: "6px 10px",
              borderRadius: 999,
              background: "rgba(8,12,20,0.42)",
              border: `1px solid ${familyTheme.accent}40`,
              color: "#fff8ea",
              fontSize: labelFontSize,
              fontWeight: 800,
              whiteSpace: "nowrap",
              boxShadow: `0 10px 24px rgba(0,0,0,0.24), 0 0 18px ${familyTheme.accent}12`,
              fontFamily: graphBodyFont,
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
            }}
          >
            {relationLabel}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

const nodeTypes = { worldNode: WorldNode, clusterBackground: ClusterBackgroundNode };
const edgeTypes = { relationEdge: RelationEdge };
const graphDisplayFont =
  '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif';
const graphBodyFont =
  '"Source Sans 3", "Segoe UI", "Trebuchet MS", system-ui, sans-serif';

const controlsSectionStyle: React.CSSProperties = {
  display: "grid",
  gap: 18,
  fontFamily: graphBodyFont,
};
const graphSectionCardStyle: React.CSSProperties = {
  display: "grid",
  gap: 12,
  paddingTop: "14px",
  borderTop: "1px solid rgba(255,255,255,0.08)",
};
const graphCanvasStyle: React.CSSProperties = {
  height: "680px",
  background:
    "radial-gradient(circle at 28% 18%, rgba(120,150,255,0.12), transparent 22%), radial-gradient(circle at 76% 16%, rgba(255,150,92,0.1), transparent 22%), linear-gradient(180deg, rgba(11,14,20,0.88) 0%, rgba(9,13,20,0.96) 100%)",
  borderRadius: "24px",
  border: "1px solid rgba(255,255,255,0.08)",
  overflow: "hidden",
  boxShadow: "0 20px 46px rgba(0,0,0,0.2), 0 0 28px rgba(100,150,255,0.08)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
};

function getEntityTypeLayoutPriority(entityType: EntityType): number {
  const normalized = normalizeText(entityType);
  if (normalized.includes("luog") || normalized.includes("place") || normalized.includes("region")) return 0;
  if (normalized.includes("person") || normalized.includes("char") || normalized.includes("npc")) return 1;
  if (normalized.includes("fazi") || normalized.includes("faction") || normalized.includes("clan")) return 2;
  if (normalized.includes("ogg") || normalized.includes("item") || normalized.includes("artifact")) return 3;
  if (normalized.includes("event") || normalized.includes("evento")) return 4;
  return 5;
}

function estimateClusterColumns(nodeCount: number, clusterMode: GraphClusterMode) {
  if (clusterMode === "genealogy") {
    return Math.max(2, Math.ceil(Math.sqrt(nodeCount)));
  }
  if (clusterMode === "region") {
    return Math.max(2, Math.ceil(Math.sqrt(nodeCount * 0.85)));
  }
  return Math.max(1, Math.ceil(Math.sqrt(nodeCount)));
}

function relaxNodePositions(
  nodes: Node<GraphNodeData>[],
  positions: ManualNodePositionMap,
  iterations = 80
): ManualNodePositionMap {
  if (nodes.length <= 1) return positions;

  const next: ManualNodePositionMap = Object.fromEntries(
    Object.entries(positions).map(([id, pos]) => [id, { ...pos }])
  );

  const getGapX = (a: Node<GraphNodeData>, b: Node<GraphNodeData>) => {
    const hasWide = getNodeShape(a.data.entityType).orientation === "wide" || getNodeShape(b.data.entityType).orientation === "wide";
    return hasWide ? 90 : 72;
  };

  const getGapY = (a: Node<GraphNodeData>, b: Node<GraphNodeData>) => {
    const tallPair = getNodeShape(a.data.entityType).orientation === "tall" || getNodeShape(b.data.entityType).orientation === "tall";
    return tallPair ? 78 : 56;
  };

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    let changed = false;

    for (let index = 0; index < nodes.length; index += 1) {
      const a = nodes[index];
      const shapeA = getNodeShape(a.data.entityType);
      const posA = next[String(a.id)];
      if (!posA) continue;

      for (let innerIndex = index + 1; innerIndex < nodes.length; innerIndex += 1) {
        const b = nodes[innerIndex];
        const shapeB = getNodeShape(b.data.entityType);
        const posB = next[String(b.id)];
        if (!posB) continue;

        const gapX = getGapX(a, b);
        const gapY = getGapY(a, b);
        const centerAX = posA.x + shapeA.width / 2;
        const centerAY = posA.y + shapeA.minHeight / 2;
        const centerBX = posB.x + shapeB.width / 2;
        const centerBY = posB.y + shapeB.minHeight / 2;
        const requiredX = shapeA.width / 2 + shapeB.width / 2 + gapX;
        const requiredY = shapeA.minHeight / 2 + shapeB.minHeight / 2 + gapY;
        const dx = centerBX - centerAX;
        const dy = centerBY - centerAY;
        const overlapX = requiredX - Math.abs(dx);
        const overlapY = requiredY - Math.abs(dy);

        if (overlapX <= 0 || overlapY <= 0) continue;

        changed = true;
        if (overlapX < overlapY) {
          const push = overlapX / 2 + 2;
          const direction = dx === 0 ? (index % 2 === 0 ? -1 : 1) : Math.sign(dx);
          posA.x -= push * direction;
          posB.x += push * direction;
        } else {
          const push = overlapY / 2 + 2;
          const direction = dy === 0 ? (innerIndex % 2 === 0 ? -1 : 1) : Math.sign(dy);
          posA.y -= push * direction;
          posB.y += push * direction;
        }
      }
    }

    if (!changed) break;
  }

  return next;
}

function buildClusteredPositions(
  nodes: Node<GraphNodeData>[],
  clusterKeyById: Record<string, string>,
  layoutMode: GraphLayoutMode,
  clusterMode: GraphClusterMode,
  selectedEntityId?: string,
  genealogyTree?: GenealogyTreeData
): ManualNodePositionMap {
  if (!nodes.length) return {};

  const clusterMap = new Map<string, Node<GraphNodeData>[]>();
  nodes.forEach((node) => {
    const clusterKey = clusterKeyById[String(node.id)] ?? "Tutto";
    const bucket = clusterMap.get(clusterKey) ?? [];
    bucket.push(node);
    clusterMap.set(clusterKey, bucket);
  });

  const clusterKeys = Array.from(clusterMap.keys()).sort((a, b) => {
    const aHasSelection = (clusterMap.get(a) ?? []).some((node) => String(node.id) === selectedEntityId);
    const bHasSelection = (clusterMap.get(b) ?? []).some((node) => String(node.id) === selectedEntityId);
    if (aHasSelection && !bHasSelection) return -1;
    if (!aHasSelection && bHasSelection) return 1;
    return a.localeCompare(b, "it", { sensitivity: "base" });
  });

  const clusterColumns = clusterMode === "region"
    ? Math.max(1, Math.ceil(Math.sqrt(clusterKeys.length * 1.8)))
    : clusterMode === "genealogy"
    ? Math.max(1, Math.ceil(Math.sqrt(clusterKeys.length * 0.75)))
    : Math.max(1, Math.ceil(Math.sqrt(clusterKeys.length)));
  const positions: ManualNodePositionMap = {};
  const clusterBounds = new Map<string, { width: number; height: number }>();

  clusterKeys.forEach((key) => {
    const clusterNodes = [...(clusterMap.get(key) ?? [])].sort((a, b) => {
      const aSelected = String(a.id) === selectedEntityId;
      const bSelected = String(b.id) === selectedEntityId;
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;

      const typePriority =
        getEntityTypeLayoutPriority(a.data.entityType) -
        getEntityTypeLayoutPriority(b.data.entityType);
      if (typePriority !== 0) return typePriority;

      return a.data.name.localeCompare(b.data.name, "it", { sensitivity: "base" });
    });

    const clusterLayout =
      clusterMode === "genealogy"
        ? buildGenealogyClusterLayout(clusterNodes, genealogyTree)
        : clusterMode === "region"
        ? buildGeographicClusterLayout(clusterNodes, layoutMode)
        : (() => {
            const columns = estimateClusterColumns(clusterNodes.length, clusterMode);
            const baseSpacingX = layoutMode === "map" ? 500 : 430;
            const baseSpacingY = layoutMode === "map" ? 360 : 300;
            const spacingX = baseSpacingX;
            const spacingY = baseSpacingY;
            const rows = Math.max(1, Math.ceil(clusterNodes.length / columns));
            const maxWidth = Math.max(...clusterNodes.map((node) => getNodeShape(node.data.entityType).width));
            const maxHeight = Math.max(...clusterNodes.map((node) => getNodeShape(node.data.entityType).minHeight));
            const localPositions: ManualNodePositionMap = {};

            clusterNodes.forEach((node, index) => {
              const shape = getNodeShape(node.data.entityType);
              const col = index % columns;
              const row = Math.floor(index / columns);
              const centeredX = col * spacingX - ((columns - 1) * spacingX) / 2;
              const staggerX = row % 2 === 0 ? 0 : 36;
              let localX = centeredX + staggerX;
              let localY = row * spacingY;

              if (layoutMode === "map") {
                if (shape.orientation === "wide") localY -= 60;
                if (shape.orientation === "badge") localX += 44;
                if (shape.orientation === "compact") localY += 44;
                if (shape.orientation === "timeline") localX -= 32;
              }

              localPositions[String(node.id)] = { x: localX, y: localY };
            });

            return {
              positions: relaxNodePositions(clusterNodes, localPositions, 90),
              width: Math.max(560, (columns - 1) * spacingX + maxWidth + 240),
              height: Math.max(420, (rows - 1) * spacingY + maxHeight + 220),
            };
          })();

    clusterBounds.set(key, { width: clusterLayout.width, height: clusterLayout.height });
    clusterNodes.forEach((node) => {
      positions[String(node.id)] = clusterLayout.positions[String(node.id)];
    });
  });

  const clusterGapX = clusterMode === "region" ? (layoutMode === "map" ? 420 : 360) : layoutMode === "map" ? 360 : 300;
  const clusterGapY = clusterMode === "genealogy" ? (layoutMode === "map" ? 380 : 320) : layoutMode === "map" ? 320 : 250;

  clusterKeys.forEach((key, clusterIndex) => {
    const clusterNodes = clusterMap.get(key) ?? [];
    const clusterCol = clusterIndex % clusterColumns;
    const clusterRow = Math.floor(clusterIndex / clusterColumns);

    const rowKeys = clusterKeys.filter((_, index) => Math.floor(index / clusterColumns) === clusterRow);
    const colKeys = clusterKeys.filter((_, index) => index % clusterColumns === clusterCol);

    const offsetX = rowKeys
      .slice(0, rowKeys.indexOf(key))
      .reduce((acc, currentKey) => acc + (clusterBounds.get(currentKey)?.width ?? 760) + clusterGapX, 0);
    const offsetY = colKeys
      .slice(0, colKeys.indexOf(key))
      .reduce((acc, currentKey) => acc + (clusterBounds.get(currentKey)?.height ?? 520) + clusterGapY, 0);

    clusterNodes.forEach((node) => {
      const next = positions[String(node.id)];
      if (!next) return;
      positions[String(node.id)] = {
        x: next.x + offsetX,
        y: next.y + offsetY,
      };
    });

    if (clusterIndex === 0) {
      clusterNodes.forEach((node) => {
        const next = positions[String(node.id)];
        if (!next) return;
        positions[String(node.id)] = {
          x: next.x + 120,
          y: next.y + 80,
        };
      });
    }
  });

  return relaxNodePositions(nodes, positions, 120);
}

function buildClusterBackgroundNodes(
  nodes: Node<GraphNodeData>[],
  positions: ManualNodePositionMap,
  clusterKeyById: Record<string, string>,
  layoutMode: GraphLayoutMode,
  clusterMode: GraphClusterMode
): Array<Node<ClusterBackgroundData>> {
  if (clusterMode === "none" || layoutMode === "free" || !nodes.length) return [];

  const grouped = new Map<string, Node<GraphNodeData>[]>();
  nodes.forEach((node) => {
    const clusterKey = clusterKeyById[String(node.id)] ?? "Tutto";
    const bucket = grouped.get(clusterKey) ?? [];
    bucket.push(node);
    grouped.set(clusterKey, bucket);
  });

  return Array.from(grouped.entries()).map(([label, clusterNodes]) => {
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    clusterNodes.forEach((node) => {
      const shape = getNodeShape(node.data.entityType);
      const position = positions[String(node.id)] ?? node.position ?? { x: 0, y: 0 };
      minX = Math.min(minX, position.x);
      minY = Math.min(minY, position.y);
      maxX = Math.max(maxX, position.x + shape.width);
      maxY = Math.max(maxY, position.y + shape.minHeight);
    });

    const accentColor = getClusterAccent(clusterMode, label);
    const paddingX = layoutMode === "map" ? 88 : 64;
    const paddingTop = layoutMode === "map" ? 104 : 82;
    const paddingBottom = layoutMode === "map" ? 82 : 64;

    return {
      id: `cluster-bg:${clusterMode}:${label}`,
      type: "clusterBackground",
      position: { x: minX - paddingX, y: minY - paddingTop },
      draggable: false,
      selectable: false,
      connectable: false,
      focusable: false,
      deletable: false,
      zIndex: -10,
      style: {
        width: Math.max(420, maxX - minX + paddingX * 2),
        height: Math.max(250, maxY - minY + paddingTop + paddingBottom),
      },
      data: {
        label,
        accentColor,
        subtitle:
          clusterMode === "region"
            ? "macro-area geografica derivata dalla gerarchia dei luoghi"
            : clusterMode === "genealogy"
            ? "albero genealogico o ramo familiare"
            : "gruppo sociale o politico",
      },
    } as Node<ClusterBackgroundData>;
  });
}

export default function GraphPanel({
  entityTypes,
  graphViewMode,
  graphFilter,
  graphTypeFilters,
  graphViewType,
  graphViewTag,
  graphSearch,
  graphRelationFilter,
  graphNeighborhoodDepth,
  allTags,
  selectedEntityId,
  graphData,
  onGraphViewModeChange,
  onGraphFilterChange,
  onToggleGraphTypeFilter,
  onGraphViewTypeChange,
  onGraphViewTagChange,
  onGraphSearchChange,
  onGraphRelationFilterChange,
  onGraphNeighborhoodDepthChange,
  onNodeClick,
  getEntityById,
  compactControlsOnly = false,
  graphOnly = false,
}: GraphPanelProps) {
  const [showAdvancedControls, setShowAdvancedControls] = useState(false);
  const [graphLayoutMode, setGraphLayoutModeState] = useState<GraphLayoutMode>(sharedGraphState.layoutMode);
  const [graphClusterMode, setGraphClusterModeState] = useState<GraphClusterMode>(sharedGraphState.clusterMode);
  const [manualNodePositions, setManualNodePositionsState] = useState<ManualNodePositionMap>(sharedGraphState.manualNodePositions);
  const [graphDetailMode, setGraphDetailModeState] = useState<GraphDetailMode>(sharedGraphState.detailMode);
  const [graphNodeLimit, setGraphNodeLimitState] = useState<GraphNodeLimit>(sharedGraphState.nodeLimit);
  const [collapsedClusters, setCollapsedClustersState] = useState<Partial<Record<GraphClusterMode, string[]>>>(
    sharedGraphState.collapsedClusters
  );
  const [renderNodes, setRenderNodes] = useState<Node[]>([]);
  const reactFlowRef = useRef<ReactFlowInstance<Node, Edge> | null>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance<Node, Edge> | null>(null);
  const lastAppliedLayoutRef = useRef<string>("");

  useEffect(() => {
    return subscribeSharedGraphState(() => {
      setGraphLayoutModeState(sharedGraphState.layoutMode);
      setGraphClusterModeState(sharedGraphState.clusterMode);
      setManualNodePositionsState(sharedGraphState.manualNodePositions);
      setGraphDetailModeState(sharedGraphState.detailMode);
      setGraphNodeLimitState(sharedGraphState.nodeLimit);
      setCollapsedClustersState(sharedGraphState.collapsedClusters);
    });
  }, []);

  const setGraphLayoutMode = useCallback((value: GraphLayoutMode) => {
    updateSharedGraphState({ layoutMode: value });
  }, []);

  const setGraphClusterMode = useCallback((value: GraphClusterMode) => {
    updateSharedGraphState({ clusterMode: value });
  }, []);

  const setManualNodePositions = useCallback((value: ManualNodePositionMap | ((current: ManualNodePositionMap) => ManualNodePositionMap)) => {
    const next = typeof value === "function" ? value(sharedGraphState.manualNodePositions) : value;
    updateSharedGraphState({ manualNodePositions: next });
  }, []);

  const setGraphDetailMode = useCallback((value: GraphDetailMode) => {
    updateSharedGraphState({ detailMode: value });
  }, []);

  const setGraphNodeLimit = useCallback((value: GraphNodeLimit) => {
    updateSharedGraphState({ nodeLimit: value });
  }, []);

  const applyGraphPreset = useCallback(
    (presetId: GraphPresetId) => {
      onGraphSearchChange("");
      onGraphRelationFilterChange("all");

      if (presetId === "focus") {
        onGraphViewModeChange("focused");
        onGraphFilterChange("all");
        onGraphNeighborhoodDepthChange(2);
        setGraphClusterMode("none");
        setGraphDetailMode("full");
        setGraphNodeLimit("all");
        setGraphLayoutMode("auto");
        return;
      }

      if (presetId === "political") {
        onGraphViewModeChange("global");
        onGraphFilterChange("all");
        setGraphClusterMode("faction");
        setGraphDetailMode("compact");
        setGraphNodeLimit(240);
        setGraphLayoutMode("map");
        return;
      }

      if (presetId === "genealogy") {
        onGraphViewModeChange("global");
        onGraphFilterChange("all");
        setGraphClusterMode("genealogy");
        setGraphDetailMode("full");
        setGraphNodeLimit(120);
        setGraphLayoutMode("auto");
        return;
      }

      if (presetId === "events") {
        onGraphViewModeChange("global");
        onGraphFilterChange("all");
        setGraphClusterMode("storyline");
        setGraphDetailMode("compact");
        setGraphNodeLimit(240);
        setGraphLayoutMode("auto");
        return;
      }

      onGraphViewModeChange("global");
      onGraphFilterChange("all");
      setGraphClusterMode("faction");
      setGraphDetailMode("compact");
      setGraphNodeLimit(240);
      setGraphLayoutMode("auto");
    },
    [
      onGraphFilterChange,
      onGraphNeighborhoodDepthChange,
      onGraphRelationFilterChange,
      onGraphSearchChange,
      onGraphViewModeChange,
      setGraphClusterMode,
      setGraphDetailMode,
      setGraphLayoutMode,
      setGraphNodeLimit,
    ]
  );

  const toggleCollapsedCluster = useCallback((clusterLabel: string) => {
    const current = sharedGraphState.collapsedClusters[graphClusterMode] ?? [];
    const next = current.includes(clusterLabel)
      ? current.filter((item) => item !== clusterLabel)
      : [...current, clusterLabel];
    updateSharedGraphState({
      collapsedClusters: {
        ...sharedGraphState.collapsedClusters,
        [graphClusterMode]: next,
      },
    });
  }, [graphClusterMode]);

  const showFocusedDirectionControls = graphViewMode === "focused";
  const showTypeToggles = graphViewMode === "focused" || graphViewMode === "global";
  const showTypeSelector = graphViewMode === "type-only";
  const showTagSelector = graphViewMode === "tag-based";
  const availableRelationLabels = useMemo(() => {
    return Array.from(
      new Set(
        graphData.edges
          .map((edge) => extractEdgeRelationLabel(edge).trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b, "it", { sensitivity: "base" }));
  }, [graphData.edges]);
  const availableClusterLabels = useMemo(() => {
    const context = buildClusterComputationContext(graphData.nodes, graphData.edges, getEntityById);
    const keys = buildClusterKeyMap(graphClusterMode, context);
    return Array.from(new Set(Object.values(keys))).sort((a, b) =>
      a.localeCompare(b, "it", { sensitivity: "base" })
    );
  }, [graphClusterMode, graphData.edges, graphData.nodes, getEntityById]);

  const visibleGraphData = useMemo(() => {
    const query = graphSearch.trim().toLowerCase();
    const clusterContext = buildClusterComputationContext(
      graphData.nodes,
      graphData.edges,
      getEntityById
    );
    const clusterKeyById = buildClusterKeyMap(graphClusterMode, clusterContext);
    const genealogyTree = buildGenealogyTreeData(clusterContext);

    const baseNodes = graphData.nodes.map((node) => {
      const entity = clusterContext.entitiesById.get(String(node.id));
      const typeLabel = entity ? getEntityTypeLabel(entity.type, entityTypes) : "Entità";
      const accentColor = entity ? getTypeColor(entity.type, entityTypes) : "#64748b";
      const clusterLabel = clusterKeyById[String(node.id)] ?? undefined;

      const incomingData = (node.data ?? {}) as Partial<GraphNodeData>;
      const data: GraphNodeData = {
        label: entity?.name ?? incomingData.label ?? String(node.id),
        name: entity?.name ?? incomingData.name ?? String(node.id),
        entityType: entity?.type ?? incomingData.entityType ?? "entity",
        typeLabel: incomingData.typeLabel ?? typeLabel,
        shortDescription: entity?.shortDescription ?? incomingData.shortDescription ?? "",
        iconGlyph: incomingData.iconGlyph ?? getTypeGlyph(entity?.type ?? "entity"),
        accentColor: incomingData.accentColor ?? accentColor,
        metaLabel: incomingData.metaLabel ?? clusterLabel ?? undefined,
      };

      const shape = getNodeShape(data.entityType);
      return {
        ...node,
        type: "worldNode",
        width: shape.width,
        height: shape.minHeight,
        data,
      } as Node<GraphNodeData>;
    });

    const normalizedRelationFilter = normalizeRelationLabel(graphRelationFilter);
    const styledEdges = graphData.edges
      .map((edge) => {
      const relationLabel =
        typeof edge.label === "string" && edge.label.trim()
          ? edge.label.trim()
          : edge.data && typeof edge.data === "object" && "label" in edge.data && typeof (edge.data as { label?: unknown }).label === "string"
          ? String((edge.data as { label?: unknown }).label)
          : "";

      const family = classifyRelationFamily(relationLabel);
      const familyTheme = getRelationFamilyTheme(family);

      return {
        ...edge,
        type: "relationEdge",
        label: undefined,
        animated: false,
        style: {
          stroke: `${familyTheme.accent}aa`,
          strokeWidth: 1.5,
          strokeDasharray: familyTheme.dash,
        },
        data: {
          ...(edge.data ?? {}),
          relationLabel,
          family,
        },
      } as Edge<GraphEdgeData>;
      })
      .filter((edge) => {
        if (!normalizedRelationFilter || normalizedRelationFilter === "all") return true;
        return normalizeRelationLabel(extractEdgeRelationLabel(edge)) === normalizedRelationFilter;
      });

    let workingNodes = baseNodes;
    let workingEdges = styledEdges;

    if (!query) {
      if (normalizedRelationFilter && normalizedRelationFilter !== "all") {
        const relatedIds = new Set<string>();
        styledEdges.forEach((edge) => {
          relatedIds.add(String(edge.source));
          relatedIds.add(String(edge.target));
        });
        if (selectedEntityId) {
          relatedIds.add(selectedEntityId);
        }
        workingNodes = baseNodes.filter((node) => relatedIds.has(String(node.id)));
      }
    } else {
      const matchedIds = new Set<string>();
      baseNodes.forEach((node) => {
        const entity = clusterContext.entitiesById.get(String(node.id));
        const haystack = [
          String(node.id),
          entity?.name ?? "",
          entity?.type ?? "",
          entity?.shortDescription ?? "",
          entity?.notes ?? "",
          ...(entity?.tags ?? []),
          ...Object.values(entity?.metadata ?? {}),
        ]
          .join(" ")
          .toLowerCase();

        if (haystack.includes(query)) matchedIds.add(String(node.id));
      });

      const relatedIds = new Set<string>(matchedIds);
      styledEdges.forEach((edge) => {
        const source = String(edge.source);
        const target = String(edge.target);
        if (matchedIds.has(source) || matchedIds.has(target)) {
          relatedIds.add(source);
          relatedIds.add(target);
        }
      });
      if (selectedEntityId) relatedIds.add(selectedEntityId);

      workingNodes = baseNodes.filter((node) => relatedIds.has(String(node.id)));
      workingEdges = styledEdges.filter(
        (edge) => relatedIds.has(String(edge.source)) && relatedIds.has(String(edge.target))
      );
    }

    const collapsedLabels = new Set(collapsedClusters[graphClusterMode] ?? []);
    if (graphClusterMode !== "none" && collapsedLabels.size > 0) {
      const visibleIds = new Set(
        workingNodes
          .filter((node) => {
            const label = clusterKeyById[String(node.id)] ?? "";
            if (String(node.id) === selectedEntityId) return true;
            return !collapsedLabels.has(label);
          })
          .map((node) => String(node.id))
      );
      workingNodes = workingNodes.filter((node) => visibleIds.has(String(node.id)));
      workingEdges = workingEdges.filter(
        (edge) => visibleIds.has(String(edge.source)) && visibleIds.has(String(edge.target))
      );
    }

    if (graphNodeLimit !== "all" && workingNodes.length > graphNodeLimit) {
      const directIds = new Set<string>();
      if (selectedEntityId) {
        directIds.add(selectedEntityId);
        workingEdges.forEach((edge) => {
          if (String(edge.source) === selectedEntityId) directIds.add(String(edge.target));
          if (String(edge.target) === selectedEntityId) directIds.add(String(edge.source));
        });
      }

      const prioritized = [
        ...workingNodes.filter((node) => directIds.has(String(node.id))),
        ...workingNodes
          .filter((node) => !directIds.has(String(node.id)))
          .sort((a, b) => String(a.id).localeCompare(String(b.id), "it", { sensitivity: "base" })),
      ].slice(0, graphNodeLimit);

      const visibleIds = new Set(prioritized.map((node) => String(node.id)));
      workingNodes = prioritized;
      workingEdges = workingEdges.filter(
        (edge) => visibleIds.has(String(edge.source)) && visibleIds.has(String(edge.target))
      );
    }

    const highlightLabels =
      graphViewMode === "focused" ||
      Boolean(query) ||
      (normalizedRelationFilter !== "" && normalizedRelationFilter !== "all");
    const selectedNeighborIds = new Set<string>();

    if (selectedEntityId !== "") {
      workingEdges.forEach((edge) => {
        const sourceId = String(edge.source);
        const targetId = String(edge.target);
        if (sourceId === selectedEntityId) selectedNeighborIds.add(targetId);
        if (targetId === selectedEntityId) selectedNeighborIds.add(sourceId);
      });
    }

    const graphDensity: GraphEdgeData["density"] =
      workingNodes.length > 180 ? "overloaded" : workingNodes.length > 96 ? "dense" : "normal";

    workingEdges = workingEdges.map((edge) => {
      const sourceId = String(edge.source);
      const targetId = String(edge.target);
      const isSelectedEdge =
        selectedEntityId !== "" &&
        (sourceId === selectedEntityId || targetId === selectedEntityId);
      const isContextEdge =
        selectedEntityId !== "" &&
        !isSelectedEdge &&
        (selectedNeighborIds.has(sourceId) || selectedNeighborIds.has(targetId));
      const mutedBase = !highlightLabels;
      const familyTheme = getRelationFamilyTheme(edge.data?.family ?? "neutral");
      const emphasis: GraphEdgeData["emphasis"] = isSelectedEdge
        ? "focus"
        : isContextEdge
        ? "context"
        : "ambient";
      const ambientStroke =
        graphDensity === "overloaded"
          ? "rgba(110, 125, 151, 0.18)"
          : graphDensity === "dense"
          ? `${familyTheme.accent}52`
          : mutedBase
          ? "rgba(100, 116, 139, 0.28)"
          : `${familyTheme.accent}74`;
      const ambientWidth = graphDensity === "overloaded" ? 0.95 : mutedBase ? 1 : 1.35;

      return {
        ...edge,
        style: {
          stroke: isSelectedEdge
            ? `${familyTheme.accent}ee`
            : isContextEdge
            ? `${familyTheme.accent}a6`
            : ambientStroke,
          strokeWidth: isSelectedEdge ? 2.4 : isContextEdge ? 1.8 : ambientWidth,
          strokeDasharray: familyTheme.dash,
        },
        data: {
          ...(edge.data ?? {}),
          relationLabel: extractEdgeRelationLabel(edge),
          family: edge.data?.family ?? classifyRelationFamily(extractEdgeRelationLabel(edge)),
          emphasis,
          density: graphDensity,
          showLabel:
            highlightLabels &&
            workingEdges.length <= (graphDensity === "overloaded" ? 42 : graphDensity === "dense" ? 72 : 90) &&
            (isSelectedEdge || Boolean(query) || (normalizedRelationFilter !== "" && normalizedRelationFilter !== "all")),
        },
      } as Edge<GraphEdgeData>;
    });

    return {
      nodes: workingNodes,
      edges: workingEdges,
      entitiesById: clusterContext.entitiesById,
      clusterKeyById,
      genealogyTree,
    };
  }, [
    graphSearch,
    graphData,
    getEntityById,
    entityTypes,
    selectedEntityId,
    graphViewMode,
    graphClusterMode,
    graphRelationFilter,
    collapsedClusters,
    graphNodeLimit,
  ]);

  const layoutedNodes = useMemo(() => {
    const ids = visibleGraphData.nodes.map((node) => String(node.id)).join("|");
    const signature = `${graphLayoutMode}__${graphClusterMode}__${ids}__${selectedEntityId}`;

    const selectionNeighborhood = new Set<string>();
    if (selectedEntityId) {
      selectionNeighborhood.add(selectedEntityId);
      visibleGraphData.edges.forEach((edge) => {
        const source = String(edge.source);
        const target = String(edge.target);
        if (source === selectedEntityId) selectionNeighborhood.add(target);
        if (target === selectedEntityId) selectionNeighborhood.add(source);
      });
    }

    const positions =
      graphLayoutMode === "free"
        ? null
        : buildClusteredPositions(
            visibleGraphData.nodes,
            visibleGraphData.clusterKeyById,
            graphLayoutMode,
            graphClusterMode,
            selectedEntityId,
            visibleGraphData.genealogyTree
          );

    const entityNodes = visibleGraphData.nodes.map((node) => {
      const isSelected = String(node.id) === selectedEntityId;
      const isConnected = selectionNeighborhood.has(String(node.id)) && !isSelected;
      const isDimmed = Boolean(selectedEntityId) && !isSelected && !isConnected;
      const density: GraphNodeData["density"] =
        visibleGraphData.nodes.length > 180 ? "overloaded" : visibleGraphData.nodes.length > 96 ? "dense" : "normal";

      return {
        ...node,
        draggable: graphLayoutMode === "free",
        position:
          graphLayoutMode === "free"
            ? manualNodePositions[String(node.id)] ?? node.position
            : positions?.[String(node.id)] ?? node.position,
        data: {
          ...(node.data as GraphNodeData),
          isSelected,
          isConnectedToSelection: isConnected,
          isDimmed,
          level: isSelected ? 0 : isConnected ? 1 : 2,
          compact: graphDetailMode === "compact" || visibleGraphData.nodes.length > 160,
          density,
        },
      } as Node<GraphNodeData>;
    });

    const backgroundNodes =
      graphLayoutMode === "free"
        ? []
        : buildClusterBackgroundNodes(
            entityNodes,
            positions ?? {},
            visibleGraphData.clusterKeyById,
            graphLayoutMode,
            graphClusterMode
          );

    return {
      signature,
      nodes: [...backgroundNodes, ...entityNodes],
    };
  }, [visibleGraphData, graphLayoutMode, graphClusterMode, manualNodePositions, selectedEntityId, graphDetailMode]);

  useEffect(() => {
    const isLayoutSwitch = lastAppliedLayoutRef.current !== layoutedNodes.signature;
    lastAppliedLayoutRef.current = layoutedNodes.signature;
    const syncFrame = window.requestAnimationFrame(() => {
      setRenderNodes(layoutedNodes.nodes as Node[]);
    });
    let fitFrame: number | null = null;

    if (
      reactFlowInstance &&
      isLayoutSwitch &&
      (graphLayoutMode === "auto" || graphLayoutMode === "map")
    ) {
      fitFrame = window.requestAnimationFrame(() => {
        reactFlowInstance.fitView({ padding: graphLayoutMode === "map" ? 0.34 : 0.28, duration: 280, includeHiddenNodes: true });
      });
    }

    return () => {
      window.cancelAnimationFrame(syncFrame);
      if (fitFrame !== null) {
        window.cancelAnimationFrame(fitFrame);
      }
    };
  }, [layoutedNodes, graphLayoutMode, reactFlowInstance]);

  function handleNodesChange(changes: NodeChange[]) {
    if (graphLayoutMode !== "free") return;
    setRenderNodes((current) => applyNodeChanges(changes, current as Node[]) as Node[]);
  }

  function handleNodeDragStop(_: React.MouseEvent, node: Node) {
    if (graphLayoutMode !== "free") return;
    setManualNodePositions((current) => ({
      ...current,
      [String(node.id)]: { x: node.position.x, y: node.position.y },
    }));
  }

  function handleSwitchToFree() {
    const snapshot: ManualNodePositionMap = {};
    const sourceNodes = reactFlowRef.current?.getNodes() ?? renderNodes;
    sourceNodes.forEach((node) => {
      snapshot[String(node.id)] = { x: node.position.x, y: node.position.y };
    });
    setManualNodePositions((current) => ({ ...current, ...snapshot }));
    setGraphLayoutMode("free");
  }

  function handleSwitchToLayout(mode: Extract<GraphLayoutMode, "auto" | "map">) {
    setGraphLayoutMode(mode);
  }

  function handleResetFreeLayout() {
    const visibleIds = new Set<string>(visibleGraphData.nodes.map((node) => String(node.id)));
    setManualNodePositions((current) => {
      const next = { ...current };
      visibleIds.forEach((id) => delete next[id]);
      return next;
    });
  }

  const containerStyle: React.CSSProperties = graphOnly
    ? { height: "100%", minHeight: 0, display: "grid" }
    : {
        display: "grid",
        gap: 18,
      };

  const graphHeightStyle: React.CSSProperties = compactControlsOnly
    ? {}
    : graphOnly
    ? { ...graphCanvasStyle, height: "100%", minHeight: "560px", borderRadius: 0, border: "none", boxShadow: "none" }
    : graphCanvasStyle;
  const backgroundGap = visibleGraphData.nodes.length > 180 ? 28 : visibleGraphData.nodes.length > 96 ? 24 : 20;
  const backgroundColor =
    visibleGraphData.nodes.length > 180
      ? "rgba(202, 165, 103, 0.08)"
      : visibleGraphData.nodes.length > 96
      ? "rgba(202, 165, 103, 0.1)"
      : "rgba(202, 165, 103, 0.14)";

  return (
    <div style={containerStyle}>
      {!graphOnly ? (
        <>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 12,
              marginBottom: 2,
              flexWrap: "wrap",
              paddingBottom: 14,
              borderBottom: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.14em",
                  color: cinematicTypography.gold,
                  fontWeight: 800,
                  marginBottom: 6,
                }}
              >
                Atlas controls
              </div>
              <h2
                style={{
                  marginTop: 0,
                  marginBottom: 6,
                  fontFamily: graphDisplayFont,
                  fontSize: 28,
                  fontWeight: 700,
                  color: cinematicTypography.inkStrong,
                }}
              >
                Grafo relazioni
              </h2>
              <div style={{ fontSize: 13, color: cinematicTypography.ink, lineHeight: 1.65 }}>
                Vista multipla con filtri, cluster e decluttering per mondi più leggibili.
              </div>
            </div>

            <div
              style={{
                fontSize: 12,
                color: cinematicTypography.inkStrong,
                padding: "6px 0",
              }}
            >
              Nodi: {visibleGraphData.nodes.length} · Relazioni: {visibleGraphData.edges.length}
            </div>
          </div>

          <div style={controlsSectionStyle}>
            <div style={graphSectionCardStyle}>
              <div style={{ display: "grid", gap: 6 }}>
                <div
                  style={{
                    fontSize: 11,
                    letterSpacing: 0.8,
                    textTransform: "uppercase",
                    color: cinematicTypography.gold,
                  }}
                >
                  Preset rapidi
                </div>
                <div style={{ fontSize: 13, color: cinematicTypography.inkMuted, lineHeight: 1.55 }}>
                  Scorciatoie per leggere subito il mondo senza dover regolare tutti i controlli.
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" onClick={() => applyGraphPreset("focus")} style={modeButtonStyle(false)}>
                  Focus pulito
                </button>
                <button type="button" onClick={() => applyGraphPreset("political")} style={modeButtonStyle(false)}>
                  Politica
                </button>
                <button type="button" onClick={() => applyGraphPreset("genealogy")} style={modeButtonStyle(false)}>
                  Genealogia
                </button>
                <button type="button" onClick={() => applyGraphPreset("events")} style={modeButtonStyle(false)}>
                  Eventi
                </button>
                <button type="button" onClick={() => applyGraphPreset("factions")} style={modeButtonStyle(false)}>
                  Fazioni
                </button>
              </div>
            </div>

            <div style={graphSectionCardStyle}>
              <div style={{ display: "grid", gap: 10 }}>
                <div
                  style={{
                    fontSize: 11,
                    letterSpacing: 0.8,
                    textTransform: "uppercase",
                    color: cinematicTypography.gold,
                  }}
                >
                  Controlli principali
                </div>

                <input
                  type="text"
                  value={graphSearch}
                  onChange={(e) => onGraphSearchChange(e.target.value)}
                  placeholder="Cerca nodi, luoghi, personaggi o tag..."
                  style={{ ...inputStyle, width: "100%" }}
                />

                <select
                  value={graphRelationFilter}
                  onChange={(e) => onGraphRelationFilterChange(e.target.value)}
                  style={selectStyle}
                >
                  <option value="all">Tutte le relazioni</option>
                  {availableRelationLabels.map((relationLabel) => (
                    <option key={relationLabel} value={relationLabel}>
                      {relationLabel}
                    </option>
                  ))}
                </select>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {GRAPH_VIEW_MODE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => onGraphViewModeChange(option.value)}
                      style={modeButtonStyle(graphViewMode === option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                {showFocusedDirectionControls ? (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {GRAPH_FOCUSED_FILTER_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => onGraphFilterChange(option.value)}
                        style={modeButtonStyle(graphFilter === option.value)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                ) : null}

                {showTypeSelector ? (
                  <select
                    value={graphViewType}
                    onChange={(e) => onGraphViewTypeChange(e.target.value as "all" | EntityType)}
                    style={selectStyle}
                  >
                    <option value="all">Tutti i tipi</option>
                    {entityTypes.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : null}

                {showTagSelector ? (
                  <select value={graphViewTag} onChange={(e) => onGraphViewTagChange(e.target.value)} style={selectStyle}>
                    <option value="">{UI_TEXT.graphTagPlaceholder}</option>
                    {allTags.map((tag) => (
                      <option key={tag} value={tag}>
                        {tag}
                      </option>
                    ))}
                  </select>
                ) : null}

                {showTypeToggles ? (
                  <div style={{ display: "grid", gap: 8 }}>
                    <div style={{ fontSize: 12, color: cinematicTypography.inkMuted }}>Filtra per tipo</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {entityTypes.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => onToggleGraphTypeFilter(option.id)}
                          style={typeToggleStyle(Boolean(graphTypeFilters[option.id]), option.id)}
                          title={getEntityTypeLabel(option.id, entityTypes)}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div style={graphSectionCardStyle}>
              <div style={{ display: "grid", gap: 10 }}>
                <div
                  style={{
                    fontSize: 11,
                    letterSpacing: 0.8,
                    textTransform: "uppercase",
                    color: cinematicTypography.gold,
                  }}
                >
                  Semantica visiva
                </div>
                <div style={{ display: "grid", gap: 10 }}>
                  {([
                    ["political", "Politica"],
                    ["genealogy", "Genealogia"],
                    ["geography", "Geografia"],
                    ["event", "Eventi"],
                    ["neutral", "Generiche"],
                  ] as Array<[GraphRelationFamily, string]>).map(([family, label]) => {
                    const theme = getRelationFamilyTheme(family);
                    return (
                      <div
                        key={family}
                        style={{
                          display: "grid",
                          gap: 7,
                          paddingBottom: 10,
                          borderBottom: "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span
                            style={{
                              width: 28,
                              height: 0,
                              borderTop: `2px ${theme.dash ? "dashed" : "solid"} ${theme.accent}`,
                              display: "inline-block",
                            }}
                          />
                          <span style={{ fontSize: 12, fontWeight: 700, color: cinematicTypography.inkStrong }}>
                            {label}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: cinematicTypography.inkMuted, lineHeight: 1.5 }}>
                          {family === "political"
                            ? "Potere, alleanze, controllo e assetti di governo."
                            : family === "genealogy"
                            ? "Famiglia, discendenza, lignaggi e parentele."
                            : family === "geography"
                            ? "Appartenenza spaziale, collocazione e territorio."
                            : family === "event"
                            ? "Catene narrative, cronologia e partecipazione a eventi."
                            : "Legami generici o non ancora classificati."}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ fontSize: 12, color: cinematicTypography.inkMuted, lineHeight: 1.55 }}>
                  {GRAPH_VIEW_MODE_DESCRIPTIONS[graphViewMode]}
                  <br />
                  Layout: {graphLayoutMode === "auto" ? "automatico" : graphLayoutMode === "free" ? "libero" : "mappa"} · Cluster: {graphClusterMode}
                </div>
              </div>
            </div>

            <div style={graphSectionCardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      letterSpacing: 0.8,
                      textTransform: "uppercase",
                      color: cinematicTypography.gold,
                    }}
                  >
                    Opzioni avanzate
                  </div>
                  <div style={{ fontSize: 13, color: cinematicTypography.inkMuted, marginTop: 4 }}>
                    Layout, cluster, limiti e decluttering fine.
                  </div>
                </div>
                <button type="button" onClick={() => setShowAdvancedControls((current) => !current)} style={modeButtonStyle(showAdvancedControls)}>
                  {showAdvancedControls ? "Nascondi avanzate" : "Mostra avanzate"}
                </button>
              </div>

              {showAdvancedControls ? (
                <div style={{ display: "grid", gap: 14 }}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <button type="button" onClick={() => handleSwitchToLayout("auto")} style={modeButtonStyle(graphLayoutMode === "auto")}>
                      Layout automatico
                    </button>
                    <button type="button" onClick={handleSwitchToFree} style={modeButtonStyle(graphLayoutMode === "free")}>
                      Layout libero
                    </button>
                    <button type="button" onClick={() => handleSwitchToLayout("map")} style={modeButtonStyle(graphLayoutMode === "map")}>
                      Mappa
                    </button>
                    {graphLayoutMode === "free" ? (
                      <button
                        type="button"
                        onClick={handleResetFreeLayout}
                        style={{ ...ghostButtonStyle, padding: "9px 12px", fontSize: 13 }}
                      >
                        Reset posizioni visibili
                      </button>
                    ) : null}
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <button type="button" onClick={() => setGraphClusterMode("none")} style={modeButtonStyle(graphClusterMode === "none")}>
                      Nessun cluster
                    </button>
                    <button type="button" onClick={() => setGraphClusterMode("region")} style={modeButtonStyle(graphClusterMode === "region")}>
                      Regione
                    </button>
                    <button type="button" onClick={() => setGraphClusterMode("faction")} style={modeButtonStyle(graphClusterMode === "faction")}>
                      Fazione
                    </button>
                    <button type="button" onClick={() => setGraphClusterMode("genealogy")} style={modeButtonStyle(graphClusterMode === "genealogy")}>
                      Genealogia
                    </button>
                    <button type="button" onClick={() => setGraphClusterMode("storyline")} style={modeButtonStyle(graphClusterMode === "storyline")}>
                      Storyline
                    </button>
                  </div>

                  {showFocusedDirectionControls ? (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: cinematicTypography.inkMuted }}>Vicinato</span>
                      {[1, 2, 3].map((depth) => (
                        <button
                          key={depth}
                          type="button"
                          onClick={() => onGraphNeighborhoodDepthChange(depth as GraphNeighborhoodDepth)}
                          style={modeButtonStyle(graphNeighborhoodDepth === depth)}
                        >
                          {depth} salto{depth > 1 ? "i" : ""}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "#94a3b8" }}>Dettaglio</span>
                    <button type="button" onClick={() => setGraphDetailMode("full")} style={modeButtonStyle(graphDetailMode === "full")}>
                      Completo
                    </button>
                    <button type="button" onClick={() => setGraphDetailMode("compact")} style={modeButtonStyle(graphDetailMode === "compact")}>
                      Compatto
                    </button>
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "#94a3b8" }}>Nodi</span>
                    {[120, 240, "all"].map((limit) => (
                      <button
                        key={String(limit)}
                        type="button"
                        onClick={() => setGraphNodeLimit(limit as GraphNodeLimit)}
                        style={modeButtonStyle(graphNodeLimit === limit)}
                      >
                        {limit === "all" ? "Tutti" : limit}
                      </button>
                    ))}
                  </div>

                  {graphClusterMode !== "none" && availableClusterLabels.length > 0 ? (
                    <div style={{ display: "grid", gap: 8 }}>
                      <div style={{ fontSize: 12, color: "#94a3b8" }}>Collapse / expand cluster</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {availableClusterLabels.slice(0, 18).map((clusterLabel) => {
                          const collapsed = (collapsedClusters[graphClusterMode] ?? []).includes(clusterLabel);
                          return (
                            <button
                              key={clusterLabel}
                              type="button"
                              onClick={() => toggleCollapsedCluster(clusterLabel)}
                              style={modeButtonStyle(!collapsed)}
                            >
                              {collapsed ? "Mostra" : "Chiudi"} {clusterLabel}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </>
      ) : null}

      {!compactControlsOnly ? (
        <div style={{ ...graphHeightStyle, marginTop: graphOnly ? 0 : 16 }}>
          <ReactFlow
            nodes={renderNodes}
            edges={visibleGraphData.edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView={graphLayoutMode !== "free"}
            nodesDraggable={graphLayoutMode === "free"}
            nodesConnectable={false}
            elementsSelectable
            minZoom={0.2}
            maxZoom={1.8}
            onInit={(instance) => {
              reactFlowRef.current = instance;
              setReactFlowInstance(instance);
            }}
            onNodesChange={handleNodesChange}
            onNodeClick={(_, node) => {
              const id = String(node.id);
              if (id.startsWith("cluster-bg:")) return;
              onNodeClick(id);
            }}
            onNodeDragStop={handleNodeDragStop}
            defaultEdgeOptions={{ type: "relationEdge", animated: false }}
          >
            <GraphAutoFocus
              selectedEntityId={selectedEntityId}
              nodes={renderNodes}
              layoutMode={graphLayoutMode}
              reactFlow={reactFlowInstance}
            />

            <MiniMap
              pannable
              zoomable
              maskColor="rgba(9, 7, 6, 0.76)"
              style={{
                background: "rgba(9,14,22,0.36)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 14,
                boxShadow: "0 16px 34px rgba(0,0,0,0.22), 0 0 18px rgba(100,150,255,0.08)",
                backdropFilter: "blur(18px)",
                WebkitBackdropFilter: "blur(18px)",
              }}
              nodeColor={(node) => {
                if (String(node.id).startsWith("cluster-bg:")) return "transparent";
                const entity = getEntityById(String(node.id));
                return entity ? getTypeColor(entity.type, entityTypes) : "#334155";
              }}
            />

            <Controls
              style={{
                borderRadius: 14,
                overflow: "hidden",
                boxShadow: "0 14px 28px rgba(0,0,0,0.2), 0 0 18px rgba(100,150,255,0.06)",
                background: "rgba(9,14,22,0.34)",
                border: "1px solid rgba(255,255,255,0.08)",
                backdropFilter: "blur(18px)",
                WebkitBackdropFilter: "blur(18px)",
              }}
            />
            <Background gap={backgroundGap} size={1} color={backgroundColor} />
          </ReactFlow>
        </div>
      ) : null}
    </div>
  );
}
