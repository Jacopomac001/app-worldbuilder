import type React from "react";
import type { Entity, EntityType } from "../types";
import type { FocusedGraphFilter, GraphViewMode } from "./GraphPanel";
import GraphPanel from "./GraphPanel";
import { panelStyle, secondaryButtonLargeStyle } from "../styles";
import { getEntityTypeLabel } from "../utils/entity";
import { uiIcons } from "../utils/icons";

type GraphViewProps = {
  selectedEntity: Entity | null;
  graphViewMode: GraphViewMode;
  graphFilter: FocusedGraphFilter;
  graphTypeFilters: Record<EntityType, boolean>;
  graphViewType: "all" | EntityType;
  graphViewTag: string;
  allTags: string[];
  graphData: {
    nodes: any[];
    edges: any[];
  };
  onGraphViewModeChange: (value: GraphViewMode) => void;
  onGraphFilterChange: (value: FocusedGraphFilter) => void;
  onToggleGraphTypeFilter: (type: EntityType) => void;
  onGraphViewTypeChange: (value: "all" | EntityType) => void;
  onGraphViewTagChange: (value: string) => void;
  onNodeClick: (id: string) => void;
  getEntityById: (id: string) => Entity | undefined;
  onBackToWorkspace: () => void;
  onGoToDashboard: () => void;
  onOpenEntityInEditor: () => void;
};

const NodeIcon = uiIcons.node;

const pageStyle: React.CSSProperties = {
  height: "100vh",
  display: "flex",
  flexDirection: "column",
};

const topBarStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "16px 20px",
};

const contentStyle: React.CSSProperties = {
  flex: 1,
  display: "grid",
  gridTemplateColumns: "320px 1fr 340px",
  gap: 16,
  padding: "0 20px 20px 20px",
  minHeight: 0,
};

const sidePanelStyle: React.CSSProperties = {
  ...panelStyle,
  overflowY: "auto",
};

const graphContainerStyle: React.CSSProperties = {
  ...panelStyle,
  padding: 0,
  overflow: "hidden",
  display: "flex",
};

const graphInnerStyle: React.CSSProperties = {
  flex: 1,
  minHeight: 0,
};

const infoCardStyle: React.CSSProperties = {
  border: "1px solid rgba(148,163,184,0.14)",
  background: "rgba(15,23,38,0.96)",
  borderRadius: 14,
  padding: 14,
};

const tagStyle: React.CSSProperties = {
  display: "inline-flex",
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 12,
  background: "rgba(59,130,246,0.12)",
  border: "1px solid rgba(59,130,246,0.25)",
  color: "#dbeafe",
};

export default function GraphView({
  selectedEntity,
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
  onBackToWorkspace,
  onGoToDashboard,
  onOpenEntityInEditor,
}: GraphViewProps) {
  return (
    <div style={pageStyle}>
      {/* HEADER */}
      <div style={topBarStyle}>
        <h1>Vista grafo</h1>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onGoToDashboard} style={secondaryButtonLargeStyle}>
            Dashboard
          </button>

          <button onClick={onBackToWorkspace} style={secondaryButtonLargeStyle}>
            Workspace
          </button>

          <button
            onClick={onOpenEntityInEditor}
            style={secondaryButtonLargeStyle}
            disabled={!selectedEntity}
          >
            Apri nell’editor
          </button>
        </div>
      </div>

      {/* CONTENT */}
      <div style={contentStyle}>
        {/* FILTRI */}
        <aside style={sidePanelStyle}>
          <GraphPanel
            graphViewMode={graphViewMode}
            graphFilter={graphFilter}
            graphTypeFilters={graphTypeFilters}
            graphViewType={graphViewType}
            graphViewTag={graphViewTag}
            allTags={allTags}
            selectedEntityId={selectedEntity?.id ?? ""}
            graphData={graphData}
            onGraphViewModeChange={onGraphViewModeChange}
            onGraphFilterChange={onGraphFilterChange}
            onToggleGraphTypeFilter={onToggleGraphTypeFilter}
            onGraphViewTypeChange={onGraphViewTypeChange}
            onGraphViewTagChange={onGraphViewTagChange}
            onNodeClick={onNodeClick}
            getEntityById={getEntityById}
            compactControlsOnly
          />
        </aside>

        {/* GRAFO */}
        <section style={graphContainerStyle}>
          <div style={graphInnerStyle}>
            <GraphPanel
              graphViewMode={graphViewMode}
              graphFilter={graphFilter}
              graphTypeFilters={graphTypeFilters}
              graphViewType={graphViewType}
              graphViewTag={graphViewTag}
              allTags={allTags}
              selectedEntityId={selectedEntity?.id ?? ""}
              graphData={graphData}
              onGraphViewModeChange={onGraphViewModeChange}
              onGraphFilterChange={onGraphFilterChange}
              onToggleGraphTypeFilter={onToggleGraphTypeFilter}
              onGraphViewTypeChange={onGraphViewTypeChange}
              onGraphViewTagChange={onGraphViewTagChange}
              onNodeClick={onNodeClick}
              getEntityById={getEntityById}
              graphOnly
            />
          </div>
        </section>

        {/* DETTAGLI */}
        <aside style={sidePanelStyle}>
          {!selectedEntity ? (
            <div style={infoCardStyle}>
              Seleziona un nodo per vedere i dettagli.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              <div style={infoCardStyle}>
                <div style={{ display: "flex", gap: 10 }}>
                  <NodeIcon size={20} />
                  <strong>{selectedEntity.name}</strong>
                </div>

                <div style={{ marginTop: 8 }}>
                  {getEntityTypeLabel(selectedEntity.type)}
                </div>

                <div style={{ marginTop: 8 }}>
                  {selectedEntity.shortDescription ||
                    "Nessuna descrizione."}
                </div>
              </div>

              <div style={infoCardStyle}>
                <strong>Tag</strong>
                <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {selectedEntity.tags.length === 0
                    ? "Nessun tag"
                    : selectedEntity.tags.map((tag) => (
                        <span key={tag} style={tagStyle}>
                          {tag}
                        </span>
                      ))}
                </div>
              </div>

              <div style={infoCardStyle}>
                <strong>Note</strong>
                <div style={{ marginTop: 8 }}>
                  {selectedEntity.notes || "Nessuna nota."}
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}