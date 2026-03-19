import type React from "react";
import { useEffect, useMemo, useState } from "react";
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
  useReactFlow,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeChange,
  type NodeProps,
} from "@xyflow/react";
import {
  GRAPH_FOCUSED_FILTER_OPTIONS,
  GRAPH_TYPE_TOGGLE_OPTIONS,
  GRAPH_VIEW_MODE_DESCRIPTIONS,
  GRAPH_VIEW_MODE_OPTIONS,
  GRAPH_VIEW_TYPE_OPTIONS,
  UI_TEXT,
} from "../config";
import {
  modeButtonStyle,
  panelStyle,
  selectStyle,
  typeToggleStyle,
} from "../styles";
import type { Entity, EntityType } from "../types";
import { getTypeColor } from "../utils/entity";

export type GraphViewMode = "focused" | "global" | "type-only" | "tag-based";
export type FocusedGraphFilter = "all" | "outgoing" | "incoming";
export type GraphLayoutMode = "auto" | "free";

type ManualNodePosition = {
  x: number;
  y: number;
};

type ManualNodePositionMap = Record<string, ManualNodePosition>;

type GraphNodeData = {
  label: string;
  name: string;
  typeLabel: string;
  shortDescription: string;
  iconGlyph?: string;
  accentColor?: string;
  isSelected?: boolean;
  isConnectedToSelection?: boolean;
  isDimmed?: boolean;
  level?: 0 | 1 | 2;
};

type GraphEdgeData = {
  relationLabel?: string;
};

type GraphPanelProps = {
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

const GRAPH_LAYOUT_MODE_STORAGE_KEY = "worldbuilder_graph_layout_mode";
const GRAPH_NODE_POSITIONS_STORAGE_KEY = "worldbuilder_graph_manual_positions";

function readStoredLayoutMode(): GraphLayoutMode {
  try {
    const raw = window.localStorage.getItem(GRAPH_LAYOUT_MODE_STORAGE_KEY);
    return raw === "free" ? "free" : "auto";
  } catch {
    return "auto";
  }
}

function readStoredManualPositions(): ManualNodePositionMap {
  try {
    const raw = window.localStorage.getItem(GRAPH_NODE_POSITIONS_STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};

    const result: ManualNodePositionMap = {};

    Object.entries(parsed).forEach(([key, value]) => {
      if (
        value &&
        typeof value === "object" &&
        typeof (value as ManualNodePosition).x === "number" &&
        typeof (value as ManualNodePosition).y === "number"
      ) {
        result[key] = {
          x: (value as ManualNodePosition).x,
          y: (value as ManualNodePosition).y,
        };
      }
    });

    return result;
  } catch {
    return {};
  }
}

function GraphAutoFocus({
  selectedEntityId,
  nodes,
  layoutMode,
}: {
  selectedEntityId: string;
  nodes: Node[];
  layoutMode: GraphLayoutMode;
}) {
  const reactFlow = useReactFlow();

  useEffect(() => {
    if (!nodes.length) return;
    if (layoutMode === "free") return;

    const targetNode = nodes.find((node) => String(node.id) === selectedEntityId);

    if (!targetNode) {
      window.requestAnimationFrame(() => {
        reactFlow.fitView({
          padding: 0.18,
          duration: 350,
          includeHiddenNodes: true,
        });
      });
      return;
    }

    const width =
      typeof targetNode.measured?.width === "number"
        ? targetNode.measured.width
        : typeof targetNode.width === "number"
        ? targetNode.width
        : 240;

    const height =
      typeof targetNode.measured?.height === "number"
        ? targetNode.measured.height
        : typeof targetNode.height === "number"
        ? targetNode.height
        : 100;

    const centerX = targetNode.position.x + width / 2;
    const centerY = targetNode.position.y + height / 2;

    window.requestAnimationFrame(() => {
      reactFlow.setCenter(centerX, centerY, {
        zoom: 1.08,
        duration: 350,
      });
    });
  }, [reactFlow, selectedEntityId, nodes, layoutMode]);

  return null;
}

function WorldNode({ data }: NodeProps<Node<GraphNodeData>>) {
  const [isHovered, setIsHovered] = useState(false);

  const accent = data.accentColor ?? "#64748b";
  const isSelected = Boolean(data.isSelected);
  const isConnectedToSelection = Boolean(data.isConnectedToSelection);
  const isDimmed = Boolean(data.isDimmed);
  const level = data.level ?? 1;

  const glow =
    isSelected
      ? `0 0 0 1px ${accent}88, 0 18px 46px ${accent}40`
      : isConnectedToSelection
      ? `0 0 0 1px ${accent}44, 0 12px 30px rgba(0,0,0,0.24)`
      : level === 2
      ? "0 8px 22px rgba(0,0,0,0.16)"
      : "0 10px 26px rgba(0,0,0,0.20)";

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: "relative",
        width: "240px",
        minHeight: "96px",
        opacity: isDimmed ? 0.42 : 1,
        transition: "opacity 160ms ease",
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="left-target"
        style={{
          opacity: 0,
          width: 10,
          height: 10,
          border: "none",
          background: "transparent",
          pointerEvents: "none",
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right-source"
        style={{
          opacity: 0,
          width: 10,
          height: 10,
          border: "none",
          background: "transparent",
          pointerEvents: "none",
        }}
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top-target"
        style={{
          opacity: 0,
          width: 10,
          height: 10,
          border: "none",
          background: "transparent",
          pointerEvents: "none",
        }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-source"
        style={{
          opacity: 0,
          width: 10,
          height: 10,
          border: "none",
          background: "transparent",
          pointerEvents: "none",
        }}
      />

      {isHovered ? (
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: "calc(100% + 12px)",
            transform: "translateX(-50%)",
            width: "280px",
            maxWidth: "280px",
            background: "rgba(3, 7, 18, 0.96)",
            border: `1px solid ${accent}66`,
            borderRadius: "14px",
            padding: "12px 14px",
            boxShadow: "0 20px 50px rgba(0,0,0,0.45)",
            zIndex: 40,
            pointerEvents: "none",
            backdropFilter: "blur(10px)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "8px",
            }}
          >
            <span
              style={{
                width: "26px",
                height: "26px",
                borderRadius: "999px",
                background: `${accent}22`,
                border: `1px solid ${accent}66`,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                fontSize: "13px",
                fontWeight: 800,
                flexShrink: 0,
              }}
            >
              {data.iconGlyph ?? "•"}
            </span>

            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: "14px",
                  fontWeight: 800,
                  color: "#f9fafb",
                  lineHeight: 1.25,
                }}
              >
                {data.name}
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "#cbd5e1",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginTop: "2px",
                }}
              >
                {data.typeLabel}
              </div>
            </div>
          </div>

          <div
            style={{
              fontSize: "12px",
              lineHeight: 1.55,
              color: "#d1d5db",
            }}
          >
            {data.shortDescription || "Nessuna descrizione breve."}
          </div>
        </div>
      ) : null}

      <div
        style={{
          position: "relative",
          borderRadius: "18px",
          padding: "14px",
          background: isSelected
            ? "linear-gradient(180deg, rgba(17,24,39,1) 0%, rgba(8,15,28,1) 100%)"
            : "linear-gradient(180deg, rgba(17,24,39,0.95) 0%, rgba(11,18,32,0.95) 100%)",
          border: isSelected
            ? `1px solid ${accent}`
            : isConnectedToSelection
            ? `1px solid ${accent}88`
            : level === 2
            ? "1px dashed rgba(255,255,255,0.18)"
            : "1px solid rgba(255,255,255,0.12)",
          boxShadow: glow,
          color: "#ffffff",
          transition:
            "transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease, opacity 160ms ease",
          transform: isHovered ? "translateY(-2px)" : "translateY(0)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(135deg, ${accent}18 0%, transparent 48%, transparent 100%)`,
            pointerEvents: "none",
          }}
        />

        {isSelected ? (
          <div
            style={{
              position: "absolute",
              top: "10px",
              right: "10px",
              padding: "4px 8px",
              borderRadius: "999px",
              background: `${accent}22`,
              border: `1px solid ${accent}55`,
              color: "#ffffff",
              fontSize: "10px",
              fontWeight: 800,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            attivo
          </div>
        ) : null}

        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "flex-start",
            gap: "10px",
          }}
        >
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "12px",
              background: `${accent}22`,
              border: `1px solid ${accent}55`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              fontSize: "14px",
              fontWeight: 800,
            }}
          >
            {data.iconGlyph ?? "•"}
          </div>

          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontSize: "15px",
                fontWeight: 800,
                color: "#f8fafc",
                lineHeight: 1.25,
                marginBottom: "6px",
                wordBreak: "break-word",
              }}
            >
              {data.name}
            </div>

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 8px",
                borderRadius: "999px",
                background: `${accent}18`,
                border: `1px solid ${accent}33`,
                color: "#dbeafe",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.03em",
                textTransform: "uppercase",
              }}
            >
              {data.typeLabel}
            </div>
          </div>
        </div>
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

  const relationLabel =
    typeof data?.relationLabel === "string" && data.relationLabel.trim()
      ? data.relationLabel.trim()
      : "";

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
              borderRadius: "999px",
              background: "rgba(2,6,23,0.98)",
              border: "1px solid #475569",
              color: "#ffffff",
              fontSize: "12px",
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

const nodeTypes = {
  worldNode: WorldNode,
};

const edgeTypes = {
  relationEdge: RelationEdge,
};

const controlsSectionStyle: React.CSSProperties = {
  display: "grid",
  gap: "10px",
};

const graphCanvasStyle: React.CSSProperties = {
  height: "680px",
  background:
    "radial-gradient(circle at top, rgba(37,99,235,0.10), transparent 28%), linear-gradient(180deg, #08111f 0%, #0b1220 100%)",
  borderRadius: "18px",
  border: "1px solid #334155",
  overflow: "hidden",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
};

export default function GraphPanel({
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
  const [graphLayoutMode, setGraphLayoutMode] = useState<GraphLayoutMode>(() =>
    readStoredLayoutMode()
  );
  const [manualNodePositions, setManualNodePositions] =
    useState<ManualNodePositionMap>(() => readStoredManualPositions());
  const [renderNodes, setRenderNodes] = useState<Node[]>([]);
  const [graphSearch, setGraphSearch] = useState("");

  const showFocusedDirectionControls = graphViewMode === "focused";
  const showTypeToggles =
    graphViewMode === "focused" || graphViewMode === "global";
  const showTypeSelector = graphViewMode === "type-only";
  const showTagSelector = graphViewMode === "tag-based";

  useEffect(() => {
    try {
      window.localStorage.setItem(GRAPH_LAYOUT_MODE_STORAGE_KEY, graphLayoutMode);
    } catch {
      // ignore localStorage errors
    }
  }, [graphLayoutMode]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        GRAPH_NODE_POSITIONS_STORAGE_KEY,
        JSON.stringify(manualNodePositions)
      );
    } catch {
      // ignore localStorage errors
    }
  }, [manualNodePositions]);

  const visibleGraphData = useMemo(() => {
    const query = graphSearch.trim().toLowerCase();

    const baseNodes =
      graphLayoutMode === "free"
        ? graphData.nodes.map((node) => {
            const saved = manualNodePositions[String(node.id)];
            if (!saved) return node;

            return {
              ...node,
              position: saved,
            };
          })
        : graphData.nodes;

    const styledEdges = graphData.edges.map((edge) => {
      const relationLabel =
        typeof edge.label === "string" && edge.label.trim()
          ? edge.label.trim()
          : edge.data &&
            typeof edge.data === "object" &&
            "label" in edge.data &&
            typeof (edge.data as { label?: unknown }).label === "string"
          ? String((edge.data as { label?: unknown }).label)
          : "";

      return {
        ...edge,
        type: "relationEdge",
        label: undefined,
        data: {
          ...(edge.data ?? {}),
          relationLabel,
        },
      } as Edge<GraphEdgeData>;
    });

    if (!query) {
      return { nodes: baseNodes, edges: styledEdges };
    }

    const matchedIds = new Set<string>();

    baseNodes.forEach((node) => {
      const entity = getEntityById(String(node.id));
      const nodeData =
        node.data && typeof node.data === "object"
          ? (node.data as GraphNodeData)
          : undefined;

      const haystack = [
        String(node.id),
        nodeData?.label ?? "",
        entity?.name ?? "",
        entity?.type ?? "",
        entity?.shortDescription ?? "",
        entity?.notes ?? "",
        ...(entity?.tags ?? []),
      ]
        .join(" ")
        .toLowerCase();

      if (haystack.includes(query)) {
        matchedIds.add(String(node.id));
      }
    });

    if (matchedIds.size === 0) {
      return { nodes: [], edges: [] };
    }

    const relatedIds = new Set<string>(matchedIds);

    styledEdges.forEach((edge) => {
      const source = String(edge.source);
      const target = String(edge.target);

      if (matchedIds.has(source) || matchedIds.has(target)) {
        relatedIds.add(source);
        relatedIds.add(target);
      }
    });

    if (selectedEntityId) {
      relatedIds.add(selectedEntityId);
    }

    return {
      nodes: baseNodes.filter((node) => relatedIds.has(String(node.id))),
      edges: styledEdges.filter(
        (edge) =>
          relatedIds.has(String(edge.source)) &&
          relatedIds.has(String(edge.target))
      ),
    };
  }, [
    graphSearch,
    graphLayoutMode,
    graphData,
    manualNodePositions,
    getEntityById,
    selectedEntityId,
  ]);

  useEffect(() => {
    setRenderNodes(visibleGraphData.nodes);
  }, [visibleGraphData.nodes]);

  function handleNodesChange(changes: NodeChange[]) {
    if (graphLayoutMode !== "free") return;
    setRenderNodes((current) => applyNodeChanges(changes, current));
  }

  function handleNodeDragStop(_: React.MouseEvent, node: Node) {
    if (graphLayoutMode !== "free") return;

    setManualNodePositions((current) => ({
      ...current,
      [String(node.id)]: {
        x: node.position.x,
        y: node.position.y,
      },
    }));
  }

  function handleResetFreeLayout() {
    const visibleIds = new Set(visibleGraphData.nodes.map((node) => String(node.id)));

    setManualNodePositions((current) => {
      const next = { ...current };

      visibleIds.forEach((id) => {
        delete next[id];
      });

      return next;
    });
  }

  const containerStyle: React.CSSProperties = graphOnly
    ? {
        height: "100%",
        minHeight: 0,
        display: "grid",
      }
    : {
        ...panelStyle,
        border: "1px solid #263244",
        boxShadow: "0 18px 46px rgba(0,0,0,0.22)",
      };

  const graphHeightStyle: React.CSSProperties = compactControlsOnly
    ? {}
    : graphOnly
    ? {
        ...graphCanvasStyle,
        height: "100%",
        minHeight: "560px",
        borderRadius: 0,
        border: "none",
        boxShadow: "none",
      }
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
              gap: "12px",
              marginBottom: "14px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <h2 style={{ marginTop: 0, marginBottom: "6px" }}>
                Grafo relazioni
              </h2>
              <div style={{ fontSize: "13px", color: "#9ca3af" }}>
                Esplora il mondo per connessioni, tipo, tag e direzione delle
                relazioni.
              </div>
            </div>

            <div
              style={{
                fontSize: "12px",
                color: "#cbd5e1",
                padding: "8px 10px",
                borderRadius: "999px",
                background: "#0b1220",
                border: "1px solid #334155",
              }}
            >
              Nodi: {visibleGraphData.nodes.length} · Relazioni:{" "}
              {visibleGraphData.edges.length}
            </div>
          </div>

          <div style={controlsSectionStyle}>
            <div style={{ fontSize: "13px", color: "#9ca3af" }}>
              Modalità vista
            </div>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
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
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
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
                onChange={(e) =>
                  onGraphViewTypeChange(e.target.value as "all" | EntityType)
                }
                style={selectStyle}
              >
                {GRAPH_VIEW_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : null}

            {showTagSelector ? (
              <select
                value={graphViewTag}
                onChange={(e) => onGraphViewTagChange(e.target.value)}
                style={selectStyle}
              >
                <option value="">{UI_TEXT.graphTagPlaceholder}</option>
                {allTags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            ) : null}

            {showTypeToggles ? (
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {GRAPH_TYPE_TOGGLE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onToggleGraphTypeFilter(option.value)}
                    style={typeToggleStyle(
                      graphTypeFilters[option.value],
                      option.value
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ) : null}

            <div
              style={{
                display: "flex",
                gap: "8px",
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <button
                type="button"
                onClick={() => setGraphLayoutMode("auto")}
                style={modeButtonStyle(graphLayoutMode === "auto")}
              >
                Layout automatico
              </button>

              <button
                type="button"
                onClick={() => setGraphLayoutMode("free")}
                style={modeButtonStyle(graphLayoutMode === "free")}
              >
                Layout libero
              </button>

              {graphLayoutMode === "free" ? (
                <button
                  type="button"
                  onClick={handleResetFreeLayout}
                  style={{
                    ...modeButtonStyle(false),
                    background: "#3f3f46",
                  }}
                >
                  Reset posizioni visibili
                </button>
              ) : null}
            </div>

            <input
              type="text"
              value={graphSearch}
              onChange={(e) => setGraphSearch(e.target.value)}
              placeholder="Cerca nel grafo..."
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "10px",
                border: "1px solid #374151",
                backgroundColor: "#0b1220",
                color: "#f3f4f6",
                boxSizing: "border-box",
              }}
            />

            <div style={{ fontSize: "12px", color: "#9ca3af", lineHeight: 1.5 }}>
              {GRAPH_VIEW_MODE_DESCRIPTIONS[graphViewMode]}
            </div>
          </div>
        </>
      ) : null}

      {!compactControlsOnly ? (
        <div
          style={{
            ...graphHeightStyle,
            marginTop: graphOnly ? 0 : 16,
          }}
        >
          <ReactFlow
            nodes={renderNodes}
            edges={visibleGraphData.edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView={graphLayoutMode === "auto"}
            nodesDraggable={graphLayoutMode === "free"}
            nodesConnectable={false}
            elementsSelectable
            minZoom={0.2}
            maxZoom={1.8}
            onNodesChange={handleNodesChange}
            onNodeClick={(_, node) => onNodeClick(String(node.id))}
            onNodeDragStop={handleNodeDragStop}
            defaultEdgeOptions={{
              type: "relationEdge",
              animated: false,
            }}
          >
            <GraphAutoFocus
              selectedEntityId={selectedEntityId}
              nodes={renderNodes}
              layoutMode={graphLayoutMode}
            />

            <MiniMap
              pannable
              zoomable
              maskColor="rgba(2, 6, 23, 0.72)"
              style={{
                background: "rgba(15, 23, 42, 0.9)",
                border: "1px solid #334155",
                borderRadius: "12px",
              }}
              nodeColor={(node) => {
                const entity = getEntityById(String(node.id));
                return entity ? getTypeColor(entity.type) : "#334155";
              }}
            />

            <Controls
              style={{
                borderRadius: "12px",
                overflow: "hidden",
                boxShadow: "0 10px 24px rgba(0,0,0,0.25)",
              }}
            />

            <Background gap={20} size={1} color="rgba(148,163,184,0.16)" />
          </ReactFlow>
        </div>
      ) : null}
    </div>
  );
}