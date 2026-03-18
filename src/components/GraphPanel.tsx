import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
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

type GraphPanelProps = {
  graphViewMode: GraphViewMode;
  graphFilter: FocusedGraphFilter;
  graphTypeFilters: Record<EntityType, boolean>;
  graphViewType: "all" | EntityType;
  graphViewTag: string;
  allTags: string[];
  graphData: {
    nodes: Node[];
    edges: Edge[];
  };
  onGraphViewModeChange: (value: GraphViewMode) => void;
  onGraphFilterChange: (value: FocusedGraphFilter) => void;
  onToggleGraphTypeFilter: (type: EntityType) => void;
  onGraphViewTypeChange: (value: "all" | EntityType) => void;
  onGraphViewTagChange: (value: string) => void;
  onNodeClick: (id: string) => void;
  getEntityById: (id: string) => Entity | undefined;
};

export default function GraphPanel({
  graphViewMode,
  graphFilter,
  graphTypeFilters,
  graphViewType,
  graphViewTag,
  allTags,
  graphData,
  onGraphViewModeChange,
  onGraphFilterChange,
  onToggleGraphTypeFilter,
  onGraphViewTypeChange,
  onGraphViewTagChange,
  onNodeClick,
  getEntityById,
}: GraphPanelProps) {
  const showFocusedDirectionControls = graphViewMode === "focused";
  const showTypeToggles =
    graphViewMode === "focused" || graphViewMode === "global";
  const showTypeSelector = graphViewMode === "type-only";
  const showTagSelector = graphViewMode === "tag-based";

  return (
    <div style={panelStyle}>
      <h2 style={{ marginTop: 0 }}>Grafo relazioni</h2>

      <div
        style={{
          display: "grid",
          gap: "10px",
          marginBottom: "14px",
        }}
      >
        <div style={{ fontSize: "13px", color: "#9ca3af" }}>
          Modalità vista
        </div>

        <div
          style={{
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          {GRAPH_VIEW_MODE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => onGraphViewModeChange(option.value)}
              style={modeButtonStyle(graphViewMode === option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>

        {showFocusedDirectionControls ? (
          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            {GRAPH_FOCUSED_FILTER_OPTIONS.map((option) => (
              <button
                key={option.value}
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
          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            {GRAPH_TYPE_TOGGLE_OPTIONS.map((option) => (
              <button
                key={option.value}
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

        <div style={{ fontSize: "12px", color: "#9ca3af", lineHeight: 1.5 }}>
          {GRAPH_VIEW_MODE_DESCRIPTIONS[graphViewMode]}
        </div>
      </div>

      <div
        style={{
          height: "620px",
          backgroundColor: "#0b1220",
          borderRadius: "16px",
          border: "1px solid #374151",
          overflow: "hidden",
        }}
      >
        <ReactFlow
          nodes={graphData.nodes}
          edges={graphData.edges}
          fitView
          nodesDraggable={false}
          onNodeClick={(_, node) => {
            onNodeClick(String(node.id));
          }}
        >
          <MiniMap
            pannable
            zoomable
            nodeColor={(node) => {
              const entity = getEntityById(String(node.id));
              return entity ? getTypeColor(entity.type) : "#334155";
            }}
          />
          <Controls />
          <Background />
        </ReactFlow>
      </div>
    </div>
  );
}