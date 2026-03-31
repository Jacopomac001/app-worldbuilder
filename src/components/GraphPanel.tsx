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
  modeButtonStyle,
  panelStyle,
  selectStyle,
  typeToggleStyle,
} from "../styles";
import type { Entity, EntityType, EntityTypeDefinition } from "../types";
import { getEntityTypeLabel, getTypeColor } from "../utils/entity";

export type GraphViewMode = "focused" | "global" | "type-only" | "tag-based";
export type FocusedGraphFilter = "all" | "outgoing" | "incoming";
export type GraphLayoutMode = "auto" | "free" | "map";
type GraphClusterMode = "none" | "region" | "faction" | "genealogy";

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
};

type ClusterBackgroundData = {
  label: string;
  accentColor: string;
  subtitle?: string;
};

type GraphEdgeData = {
  relationLabel?: string;
};

type GraphPanelProps = {
  entityTypes: EntityTypeDefinition[];
  graphViewMode: GraphViewMode;
  graphFilter: FocusedGraphFilter;
  graphTypeFilters: Record<EntityType, boolean>;
  graphViewType: "all" | EntityType;
  graphViewTag: string;
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
  onNodeClick: (entityId: string) => void;
  getEntityById: (id: string) => Entity | undefined;
  compactControlsOnly?: boolean;
  graphOnly?: boolean;
};

const GRAPH_LAYOUT_MODE_STORAGE_KEY = "worldbuilder_graph_layout_mode_v2";
const GRAPH_CLUSTER_MODE_STORAGE_KEY = "worldbuilder_graph_cluster_mode_v2";
const GRAPH_NODE_POSITIONS_STORAGE_KEY = "worldbuilder_graph_manual_positions_v2";

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
  return raw === "region" || raw === "faction" || raw === "genealogy" ? raw : "none";
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

type SharedGraphState = {
  layoutMode: GraphLayoutMode;
  clusterMode: GraphClusterMode;
  manualNodePositions: ManualNodePositionMap;
};

const sharedGraphState: SharedGraphState = {
  layoutMode: readStoredLayoutMode(),
  clusterMode: readStoredClusterMode(),
  manualNodePositions: readStoredManualPositions(),
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
    return { width: 292, minHeight: 110, radius: 22, orientation: "wide" as const };
  }
  if (normalized.includes("person") || normalized.includes("char") || normalized.includes("npc")) {
    return { width: 228, minHeight: 132, radius: 22, orientation: "tall" as const };
  }
  if (normalized.includes("fazi") || normalized.includes("faction") || normalized.includes("clan")) {
    return { width: 252, minHeight: 118, radius: 20, orientation: "badge" as const };
  }
  if (normalized.includes("ogg") || normalized.includes("item") || normalized.includes("artifact")) {
    return { width: 204, minHeight: 92, radius: 18, orientation: "compact" as const };
  }
  if (normalized.includes("event") || normalized.includes("evento") || normalized.includes("storia")) {
    return { width: 270, minHeight: 96, radius: 999, orientation: "timeline" as const };
  }
  return { width: 240, minHeight: 104, radius: 20, orientation: "default" as const };
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
      window.requestAnimationFrame(() => {
        reactFlow.fitView({ padding: 0.18, duration: 320, includeHiddenNodes: true });
      });
      return;
    }

    const width = typeof targetNode.width === "number" ? targetNode.width : 240;
    const height = typeof targetNode.height === "number" ? targetNode.height : 100;

    window.requestAnimationFrame(() => {
      reactFlow.setCenter(targetNode.position.x + width / 2, targetNode.position.y + height / 2, {
        zoom: 1.05,
        duration: 320,
      });
    });
  }, [reactFlow, selectedEntityId, nodes, layoutMode]);

  return null;
}

function WorldNode({ data }: NodeProps<Node<GraphNodeData>>) {
  const [isHovered, setIsHovered] = useState(false);
  const accent = data.accentColor ?? "#64748b";
  const shape = getNodeShape(data.entityType);
  const isSelected = Boolean(data.isSelected);
  const isConnected = Boolean(data.isConnectedToSelection);
  const isDimmed = Boolean(data.isDimmed);
  const level = data.level ?? 1;

  const border = isSelected
    ? `1px solid ${accent}`
    : isConnected
    ? `1px solid ${accent}80`
    : level === 2
    ? "1px dashed rgba(255,255,255,0.18)"
    : "1px solid rgba(255,255,255,0.12)";

  const shadow = isSelected
    ? `0 0 0 1px ${accent}66, 0 20px 48px ${accent}34`
    : isConnected
    ? `0 0 0 1px ${accent}33, 0 16px 34px rgba(0,0,0,0.28)`
    : "0 14px 30px rgba(0,0,0,0.22)";

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: shape.width,
        minHeight: shape.minHeight,
        opacity: isDimmed ? 0.3 : 1,
        transition: "opacity 160ms ease, transform 160ms ease",
        transform: isHovered ? "translateY(-2px)" : "translateY(0)",
      }}
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />

      {isHovered && data.shortDescription ? (
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: "calc(100% + 12px)",
            transform: "translateX(-50%)",
            width: 290,
            maxWidth: 290,
            zIndex: 40,
            borderRadius: 14,
            border: `1px solid ${accent}55`,
            background: "rgba(5, 10, 20, 0.96)",
            padding: "12px 14px",
            boxShadow: "0 20px 48px rgba(0,0,0,0.42)",
            pointerEvents: "none",
          }}
        >
          <div style={{ fontSize: 12, lineHeight: 1.55, color: "#dbe4f0" }}>{data.shortDescription}</div>
        </div>
      ) : null}

      <div
        style={{
          position: "relative",
          minHeight: shape.minHeight,
          borderRadius: shape.radius,
          border,
          boxShadow: shadow,
          background:
            shape.orientation === "timeline"
              ? "linear-gradient(180deg, rgba(22,28,39,0.96) 0%, rgba(12,18,28,0.96) 100%)"
              : "linear-gradient(180deg, rgba(16,21,31,0.98) 0%, rgba(10,14,24,0.98) 100%)",
          overflow: "hidden",
          padding: shape.orientation === "compact" ? "12px 14px" : "14px 16px",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(135deg, ${accent}20 0%, transparent 55%)`,
            pointerEvents: "none",
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
              width: shape.orientation === "compact" ? 30 : 36,
              height: shape.orientation === "compact" ? 30 : 36,
              borderRadius: shape.orientation === "timeline" ? 12 : 14,
              background: `${accent}22`,
              border: `1px solid ${accent}55`,
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: 14,
              flexShrink: 0,
            }}
          >
            {data.iconGlyph ?? "•"}
          </div>

          <div style={{ minWidth: 0, flex: 1 }}>
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
                  fontSize: shape.orientation === "wide" ? 16 : 15,
                  fontWeight: 800,
                  color: "#f8fafc",
                  lineHeight: 1.25,
                  wordBreak: "break-word",
                }}
              >
                {data.name}
              </div>
              {isSelected ? (
                <span
                  style={{
                    padding: "3px 8px",
                    borderRadius: 999,
                    background: `${accent}22`,
                    border: `1px solid ${accent}55`,
                    fontSize: 10,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: "#fff",
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
                gap: 6,
                padding: "4px 8px",
                borderRadius: shape.orientation === "timeline" ? 999 : 12,
                background: `${accent}16`,
                border: `1px solid ${accent}2e`,
                color: "#d9e5f2",
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {data.typeLabel}
            </div>

            {data.metaLabel ? (
              <div
                style={{
                  marginTop: 10,
                  fontSize: 12,
                  lineHeight: 1.45,
                  color: "#b9c6d5",
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
        border: `1px dashed ${data.accentColor}55`,
        background: `linear-gradient(180deg, ${data.accentColor}14 0%, rgba(15,23,42,0.12) 100%)`,
        boxShadow: `inset 0 0 0 1px ${data.accentColor}12, 0 20px 48px rgba(0,0,0,0.14)`,
        position: "relative",
        backdropFilter: "blur(2px)",
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
          padding: "10px 12px",
          borderRadius: "16px",
          background: "rgba(2, 6, 23, 0.74)",
          border: `1px solid ${data.accentColor}44`,
          color: "#f8fafc",
          maxWidth: "70%",
        }}
      >
        <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#cbd5e1" }}>
          cluster
        </div>
        <div style={{ fontSize: "15px", fontWeight: 800, lineHeight: 1.2 }}>{data.label}</div>
        {data.subtitle ? <div style={{ fontSize: "12px", color: "#cbd5e1" }}>{data.subtitle}</div> : null}
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

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />
      {relationLabel ? (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: "none",
              zIndex: 50,
              padding: "6px 10px",
              borderRadius: 999,
              background: "rgba(2,6,23,0.96)",
              border: "1px solid #475569",
              color: "#fff",
              fontSize: 12,
              fontWeight: 800,
              whiteSpace: "nowrap",
              boxShadow: "0 6px 18px rgba(0,0,0,0.28)",
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

const controlsSectionStyle: React.CSSProperties = { display: "grid", gap: 10 };
const graphCanvasStyle: React.CSSProperties = {
  height: "680px",
  background:
    "radial-gradient(circle at top, rgba(145, 120, 61, 0.12), transparent 28%), linear-gradient(180deg, #0b1118 0%, #11161d 100%)",
  borderRadius: "18px",
  border: "1px solid #334155",
  overflow: "hidden",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
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
  allTags,
  selectedEntityId,
  graphData,
  onGraphViewModeChange,
  onGraphFilterChange,
  onToggleGraphTypeFilter,
  onGraphViewTypeChange,
  onGraphViewTagChange,
  onNodeClick,
  getEntityById,
  compactControlsOnly = false,
  graphOnly = false,
}: GraphPanelProps) {
  const [graphLayoutMode, setGraphLayoutModeState] = useState<GraphLayoutMode>(sharedGraphState.layoutMode);
  const [graphClusterMode, setGraphClusterModeState] = useState<GraphClusterMode>(sharedGraphState.clusterMode);
  const [manualNodePositions, setManualNodePositionsState] = useState<ManualNodePositionMap>(sharedGraphState.manualNodePositions);
  const [graphSearch, setGraphSearch] = useState("");
  const [renderNodes, setRenderNodes] = useState<Node[]>([]);
  const reactFlowRef = useRef<ReactFlowInstance<Node, Edge> | null>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance<Node, Edge> | null>(null);
  const lastAppliedLayoutRef = useRef<string>("");

  useEffect(() => {
    return subscribeSharedGraphState(() => {
      setGraphLayoutModeState(sharedGraphState.layoutMode);
      setGraphClusterModeState(sharedGraphState.clusterMode);
      setManualNodePositionsState(sharedGraphState.manualNodePositions);
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

  const showFocusedDirectionControls = graphViewMode === "focused";
  const showTypeToggles = graphViewMode === "focused" || graphViewMode === "global";
  const showTypeSelector = graphViewMode === "type-only";
  const showTagSelector = graphViewMode === "tag-based";

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

    const styledEdges = graphData.edges.map((edge) => {
      const relationLabel =
        typeof edge.label === "string" && edge.label.trim()
          ? edge.label.trim()
          : edge.data && typeof edge.data === "object" && "label" in edge.data && typeof (edge.data as { label?: unknown }).label === "string"
          ? String((edge.data as { label?: unknown }).label)
          : "";

      return {
        ...edge,
        type: "relationEdge",
        label: undefined,
        animated: false,
        style: {
          stroke: "#66758a",
          strokeWidth: 1.5,
        },
        data: {
          ...(edge.data ?? {}),
          relationLabel,
        },
      } as Edge<GraphEdgeData>;
    });

    if (!query) {
      return { nodes: baseNodes, edges: styledEdges, entitiesById: clusterContext.entitiesById, clusterKeyById, genealogyTree };
    }

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

    return {
      nodes: baseNodes.filter((node) => relatedIds.has(String(node.id))),
      edges: styledEdges.filter(
        (edge) => relatedIds.has(String(edge.source)) && relatedIds.has(String(edge.target))
      ),
      entitiesById: clusterContext.entitiesById,
      clusterKeyById,
      genealogyTree,
    };
  }, [graphSearch, graphData, getEntityById, entityTypes, selectedEntityId, graphClusterMode]);

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
  }, [visibleGraphData, graphLayoutMode, graphClusterMode, manualNodePositions, selectedEntityId]);

  useEffect(() => {
    const isLayoutSwitch = lastAppliedLayoutRef.current !== layoutedNodes.signature;
    lastAppliedLayoutRef.current = layoutedNodes.signature;
    setRenderNodes(layoutedNodes.nodes as Node[]);

    if (!reactFlowInstance) return;
    if (!isLayoutSwitch) return;

    if (graphLayoutMode === "auto" || graphLayoutMode === "map") {
      window.requestAnimationFrame(() => {
        reactFlowInstance.fitView({ padding: graphLayoutMode === "map" ? 0.34 : 0.28, duration: 280, includeHiddenNodes: true });
      });
    }
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
    : { ...panelStyle, border: "1px solid #263244", boxShadow: "0 18px 46px rgba(0,0,0,0.22)" };

  const graphHeightStyle: React.CSSProperties = compactControlsOnly
    ? {}
    : graphOnly
    ? { ...graphCanvasStyle, height: "100%", minHeight: "560px", borderRadius: 0, border: "none", boxShadow: "none" }
    : graphCanvasStyle;

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
              marginBottom: 14,
              flexWrap: "wrap",
            }}
          >
            <div>
              <h2 style={{ marginTop: 0, marginBottom: 6 }}>Grafo relazioni</h2>
              <div style={{ fontSize: 13, color: "#9ca3af" }}>
                Vista multipla con layout automatico, libero o mappa semantica.
              </div>
            </div>

            <div
              style={{
                fontSize: 12,
                color: "#d5dfeb",
                padding: "8px 10px",
                borderRadius: 999,
                background: "#0b1220",
                border: "1px solid #334155",
              }}
            >
              Nodi: {visibleGraphData.nodes.length} · Relazioni: {visibleGraphData.edges.length}
            </div>
          </div>

          <div style={controlsSectionStyle}>
            <div style={{ fontSize: 13, color: "#9ca3af" }}>Modalità vista</div>

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
            ) : null}

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
                <button type="button" onClick={handleResetFreeLayout} style={{ ...modeButtonStyle(false), background: "#3f3f46" }}>
                  Reset posizioni visibili
                </button>
              ) : null}
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <button type="button" onClick={() => setGraphClusterMode("none")} style={modeButtonStyle(graphClusterMode === "none")}>
                Nessun cluster
              </button>
              <button type="button" onClick={() => setGraphClusterMode("region")} style={modeButtonStyle(graphClusterMode === "region")}>
                Cluster regione
              </button>
              <button type="button" onClick={() => setGraphClusterMode("faction")} style={modeButtonStyle(graphClusterMode === "faction")}>
                Cluster fazione
              </button>
              <button type="button" onClick={() => setGraphClusterMode("genealogy")} style={modeButtonStyle(graphClusterMode === "genealogy")}>
                Cluster genealogia
              </button>
            </div>

            <input
              type="text"
              value={graphSearch}
              onChange={(e) => setGraphSearch(e.target.value)}
              placeholder="Cerca nel grafo..."
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #374151",
                backgroundColor: "#0b1220",
                color: "#f3f4f6",
                boxSizing: "border-box",
              }}
            />

            <div style={{ fontSize: 12, color: "#9ca3af", lineHeight: 1.55 }}>
              {GRAPH_VIEW_MODE_DESCRIPTIONS[graphViewMode]}
              <br />
              Layout: {graphLayoutMode === "auto" ? "automatico" : graphLayoutMode === "free" ? "libero" : "mappa"} · Cluster: {graphClusterMode}
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
              maskColor="rgba(2, 6, 23, 0.72)"
              style={{
                background: "rgba(15, 23, 42, 0.9)",
                border: "1px solid #334155",
                borderRadius: 12,
              }}
              nodeColor={(node) => {
                if (String(node.id).startsWith("cluster-bg:")) return "transparent";
                const entity = getEntityById(String(node.id));
                return entity ? getTypeColor(entity.type, entityTypes) : "#334155";
              }}
            />

            <Controls style={{ borderRadius: 12, overflow: "hidden", boxShadow: "0 10px 24px rgba(0,0,0,0.25)" }} />
            <Background gap={20} size={1} color="rgba(148,163,184,0.16)" />
          </ReactFlow>
        </div>
      ) : null}
    </div>
  );
}
