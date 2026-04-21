import type React from "react";
import { type Edge, type Node } from "@xyflow/react";
import { useState } from "react";
import { useViewportWidth } from "../hooks/useViewportWidth";
import type { Entity, EntityType, EntityTypeDefinition, SemanticViewId } from "../types";
import type {
  FocusedGraphFilter,
  GraphNeighborhoodDepth,
  GraphViewMode,
} from "./GraphPanel";
import GraphPanel from "./GraphPanel";
import { cinematicTypography, ghostButtonStyle } from "../styles";
import { getEntityTypeLabel } from "../utils/entity";
import { uiIcons } from "../utils/icons";

type GraphViewProps = {
  entityTypes: EntityTypeDefinition[];
  selectedEntity: Entity | null;
  graphViewMode: GraphViewMode;
  graphFilter: FocusedGraphFilter;
  graphTypeFilters: Record<EntityType, boolean>;
  graphViewType: "all" | EntityType;
  graphViewTag: string;
  graphRelationFilter: string;
  graphNeighborhoodDepth: GraphNeighborhoodDepth;
  semanticView: SemanticViewId;
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
  onGraphRelationFilterChange: (value: string) => void;
  onGraphNeighborhoodDepthChange: (value: GraphNeighborhoodDepth) => void;
  onSemanticViewChange: (value: SemanticViewId) => void;
  onNodeClick: (id: string) => void;
  getEntityById: (id: string) => Entity | undefined;
  onBackToWorkspace: () => void;
  onGoToDashboard: () => void;
  onOpenEntityInEditor: () => void;
};

const NodeIcon = uiIcons.node;

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "grid",
  gridTemplateRows: "auto 1fr",
  background:
    "radial-gradient(circle at 14% 12%, rgba(108,146,255,0.16), transparent 24%), radial-gradient(circle at 84% 18%, rgba(255,154,90,0.12), transparent 24%), radial-gradient(circle at 50% 100%, rgba(68,214,188,0.08), transparent 28%), linear-gradient(180deg, #05070d 0%, #09101a 44%, #0a111b 100%)",
  color: cinematicTypography.inkStrong,
  fontFamily: cinematicTypography.uiFont,
};

const shellStyle: React.CSSProperties = {
  width: "min(1680px, calc(100vw - 40px))",
  margin: "0 auto",
};

function railColumnStyle(side: "left" | "right", stacked: boolean): React.CSSProperties {
  return {
    minWidth: 0,
    padding: stacked ? "0" : side === "left" ? "0 18px 0 0" : "0 0 0 18px",
    borderRight: !stacked && side === "left" ? "1px solid rgba(255,255,255,0.08)" : "none",
    borderLeft: !stacked && side === "right" ? "1px solid rgba(255,255,255,0.08)" : "none",
    display: "grid",
    alignContent: "start",
    gap: 18,
  };
}

function metaStripStyle(): React.CSSProperties {
  return {
    display: "grid",
    gap: 4,
    minWidth: 120,
  };
}

function actionButtonStyle(): React.CSSProperties {
  return {
    ...ghostButtonStyle,
    background: "transparent",
    boxShadow: "none",
    border: "1px solid rgba(255,255,255,0.06)",
    padding: "11px 14px",
    backdropFilter: "blur(18px)",
    WebkitBackdropFilter: "blur(18px)",
  };
}

export default function GraphView({
  entityTypes,
  selectedEntity,
  graphViewMode,
  graphFilter,
  graphTypeFilters,
  graphViewType,
  graphViewTag,
  graphRelationFilter,
  graphNeighborhoodDepth,
  semanticView,
  allTags,
  graphData,
  onGraphViewModeChange,
  onGraphFilterChange,
  onToggleGraphTypeFilter,
  onGraphViewTypeChange,
  onGraphViewTagChange,
  onGraphRelationFilterChange,
  onGraphNeighborhoodDepthChange,
  onSemanticViewChange,
  onNodeClick,
  getEntityById,
  onBackToWorkspace,
  onGoToDashboard,
  onOpenEntityInEditor,
}: GraphViewProps) {
  const [graphSearch, setGraphSearch] = useState("");
  const viewportWidth = useViewportWidth();
  const isCompactGraphView = viewportWidth < 1280;
  const isStackedGraphView = viewportWidth < 960;

  return (
    <div style={pageStyle}>
      <div
        style={{
          ...shellStyle,
          padding: "24px 0 18px",
          display: "grid",
          gap: 24,
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompactGraphView
              ? "1fr"
              : "minmax(0, 1.7fr) minmax(280px, 0.9fr)",
            gap: 28,
            alignItems: "start",
          }}
        >
          <div style={{ display: "grid", gap: 12, paddingRight: isCompactGraphView ? 0 : 18 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                width: "fit-content",
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.16em",
                color: cinematicTypography.gold,
                fontWeight: 800,
              }}
            >
              Lore Atlas
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              <h1
                style={{
                  margin: 0,
                  fontSize: isCompactGraphView ? 34 : 42,
                  lineHeight: 0.96,
                  fontFamily: cinematicTypography.displayFont,
                  color: cinematicTypography.inkStrong,
                }}
              >
                Vista grafo
              </h1>
              <div
                style={{
                  color: cinematicTypography.ink,
                  fontSize: 15,
                  lineHeight: 1.8,
                  maxWidth: 760,
                }}
              >
                Il grafo deve sentirsi come il cuore del worldbuilding: una scena continua, con
                strumenti laterali discreti e il canvas davvero al centro.
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 22,
                flexWrap: "wrap",
                paddingTop: 4,
              }}
            >
              <div style={metaStripStyle()}>
                <span
                  style={{
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: cinematicTypography.inkSoft,
                    fontWeight: 800,
                  }}
                >
                  Nodi
                </span>
                <strong
                  style={{
                    fontFamily: cinematicTypography.displayFont,
                    fontSize: 28,
                    lineHeight: 1.04,
                    color: cinematicTypography.inkStrong,
                  }}
                >
                  {graphData.nodes.length}
                </strong>
                <span style={{ color: cinematicTypography.inkMuted, fontSize: 12 }}>
                  presenti in scena
                </span>
              </div>

              <div style={metaStripStyle()}>
                <span
                  style={{
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: cinematicTypography.inkSoft,
                    fontWeight: 800,
                  }}
                >
                  Relazioni
                </span>
                <strong
                  style={{
                    fontFamily: cinematicTypography.displayFont,
                    fontSize: 28,
                    lineHeight: 1.04,
                    color: cinematicTypography.inkStrong,
                  }}
                >
                  {graphData.edges.length}
                </strong>
                <span style={{ color: cinematicTypography.inkMuted, fontSize: 12 }}>
                  archi visibili
                </span>
              </div>

              <div style={metaStripStyle()}>
                <span
                  style={{
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: cinematicTypography.inkSoft,
                    fontWeight: 800,
                  }}
                >
                  Focus
                </span>
                <strong
                  style={{
                    fontFamily: cinematicTypography.displayFont,
                    fontSize: 22,
                    lineHeight: 1.08,
                    color: cinematicTypography.inkStrong,
                  }}
                >
                  {selectedEntity ? selectedEntity.name : "Nessun nodo"}
                </strong>
                <span style={{ color: cinematicTypography.inkMuted, fontSize: 12 }}>
                  {selectedEntity ? "scheda attiva" : "in attesa di selezione"}
                </span>
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gap: 14,
              paddingLeft: isCompactGraphView ? 0 : 24,
              borderLeft: isCompactGraphView ? "none" : "1px solid rgba(255,255,255,0.08)",
              alignContent: "start",
            }}
          >
            <div style={{ display: "grid", gap: 6 }}>
              <div
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.14em",
                  color: cinematicTypography.gold,
                  fontWeight: 800,
                }}
              >
                Comandi rapidi
              </div>
              <div style={{ color: cinematicTypography.inkMuted, fontSize: 13, lineHeight: 1.65 }}>
                Vista semantica, navigazione e passaggio rapido al workspace senza ricadere in un
                pannello strumenti.
              </div>
            </div>

            <select
              value={semanticView}
              onChange={(event) => onSemanticViewChange(event.target.value as SemanticViewId)}
              style={{
                minWidth: 200,
                padding: "12px 14px",
                borderRadius: 16,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.04)",
                color: cinematicTypography.inkStrong,
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
              }}
            >
              <option value="default">Vista libera</option>
              <option value="political-map">Mappa politica</option>
              <option value="genealogy">Genealogia</option>
              <option value="event-chain">Catena eventi</option>
              <option value="faction-network">Rete fazioni</option>
            </select>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button onClick={onGoToDashboard} style={actionButtonStyle()}>
                Dashboard
              </button>
              <button onClick={onBackToWorkspace} style={actionButtonStyle()}>
                Workspace
              </button>
              <button
                onClick={onOpenEntityInEditor}
                style={actionButtonStyle()}
                disabled={!selectedEntity}
              >
                Apri nell&apos;editor
              </button>
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          ...shellStyle,
          minHeight: 0,
          padding: "18px 0 24px",
          display: "grid",
          gridTemplateColumns: isStackedGraphView
            ? "minmax(0, 1fr)"
            : isCompactGraphView
            ? "minmax(0, 1fr)"
            : "296px minmax(0, 1fr) 320px",
          gap: isCompactGraphView ? 20 : 28,
          alignItems: "start",
        }}
      >
        <aside style={{ ...railColumnStyle("left", isCompactGraphView), order: isCompactGraphView ? 2 : 1 }}>
          <GraphPanel
            entityTypes={entityTypes}
            graphViewMode={graphViewMode}
            graphFilter={graphFilter}
            graphTypeFilters={graphTypeFilters}
            graphViewType={graphViewType}
            graphViewTag={graphViewTag}
            graphSearch={graphSearch}
            graphRelationFilter={graphRelationFilter}
            graphNeighborhoodDepth={graphNeighborhoodDepth}
            allTags={allTags}
            selectedEntityId={selectedEntity?.id ?? ""}
            graphData={graphData}
            onGraphViewModeChange={onGraphViewModeChange}
            onGraphFilterChange={onGraphFilterChange}
            onToggleGraphTypeFilter={onToggleGraphTypeFilter}
            onGraphViewTypeChange={onGraphViewTypeChange}
            onGraphViewTagChange={onGraphViewTagChange}
            onGraphSearchChange={setGraphSearch}
            onGraphRelationFilterChange={onGraphRelationFilterChange}
            onGraphNeighborhoodDepthChange={onGraphNeighborhoodDepthChange}
            onNodeClick={onNodeClick}
            getEntityById={getEntityById}
            compactControlsOnly
          />
        </aside>

        <section
          style={{
            minWidth: 0,
            minHeight: isCompactGraphView ? 620 : 0,
            order: isCompactGraphView ? 1 : 2,
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(circle at 30% 18%, rgba(120,150,255,0.08), transparent 24%), radial-gradient(circle at 78% 12%, rgba(255,150,92,0.08), transparent 22%)",
              pointerEvents: "none",
              filter: "blur(22px)",
            }}
          />
          <GraphPanel
            entityTypes={entityTypes}
            graphViewMode={graphViewMode}
            graphFilter={graphFilter}
            graphTypeFilters={graphTypeFilters}
            graphViewType={graphViewType}
            graphViewTag={graphViewTag}
            graphSearch={graphSearch}
            graphRelationFilter={graphRelationFilter}
            graphNeighborhoodDepth={graphNeighborhoodDepth}
            allTags={allTags}
            selectedEntityId={selectedEntity?.id ?? ""}
            graphData={graphData}
            onGraphViewModeChange={onGraphViewModeChange}
            onGraphFilterChange={onGraphFilterChange}
            onToggleGraphTypeFilter={onToggleGraphTypeFilter}
            onGraphViewTypeChange={onGraphViewTypeChange}
            onGraphViewTagChange={onGraphViewTagChange}
            onGraphSearchChange={setGraphSearch}
            onGraphRelationFilterChange={onGraphRelationFilterChange}
            onGraphNeighborhoodDepthChange={onGraphNeighborhoodDepthChange}
            onNodeClick={onNodeClick}
            getEntityById={getEntityById}
            graphOnly
          />
        </section>

        <aside style={{ ...railColumnStyle("right", isCompactGraphView), order: 3 }}>
          {!selectedEntity ? (
            <div
              style={{
                display: "grid",
                gap: 8,
                paddingBottom: 16,
                borderBottom: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  color: cinematicTypography.gold,
                  fontWeight: 800,
                }}
              >
                Nodo non selezionato
              </div>
              <div
                style={{
                  fontFamily: cinematicTypography.displayFont,
                  fontSize: 28,
                  color: cinematicTypography.inkStrong,
                  lineHeight: 1.04,
                }}
              >
                Atlante in attesa
              </div>
              <div style={{ color: cinematicTypography.ink, lineHeight: 1.75 }}>
                Seleziona un nodo per leggere il contesto narrativo, i tag e il riepilogo rapido
                senza trasformare la colonna destra in un pannello pesante.
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 18 }}>
              <div
                style={{
                  display: "grid",
                  gap: 10,
                  paddingBottom: 16,
                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ display: "grid", gap: 8 }}>
                    <div
                      style={{
                        fontSize: 11,
                        textTransform: "uppercase",
                        letterSpacing: "0.12em",
                        color: cinematicTypography.gold,
                        fontWeight: 800,
                      }}
                    >
                      Nodo attivo
                    </div>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <NodeIcon size={18} color={cinematicTypography.gold} />
                      <strong
                        style={{
                          fontFamily: cinematicTypography.displayFont,
                          fontSize: 30,
                          fontWeight: 700,
                          color: cinematicTypography.inkStrong,
                          lineHeight: 1.04,
                        }}
                      >
                        {selectedEntity.name}
                      </strong>
                    </div>
                  </div>

                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "6px 0",
                      color: cinematicTypography.blue,
                      fontSize: 12,
                      fontWeight: 800,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                    }}
                  >
                    {getEntityTypeLabel(selectedEntity.type, entityTypes)}
                  </span>
                </div>

                <div style={{ color: cinematicTypography.ink, lineHeight: 1.75 }}>
                  {selectedEntity.shortDescription || "Nessuna descrizione disponibile."}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 18,
                  flexWrap: "wrap",
                  paddingBottom: 16,
                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div style={metaStripStyle()}>
                  <span
                    style={{
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: cinematicTypography.inkSoft,
                      fontWeight: 800,
                    }}
                  >
                    Tipo
                  </span>
                  <strong style={{ color: cinematicTypography.inkStrong, fontSize: 18 }}>
                    {getEntityTypeLabel(selectedEntity.type, entityTypes)}
                  </strong>
                </div>

                <div style={metaStripStyle()}>
                  <span
                    style={{
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: cinematicTypography.inkSoft,
                      fontWeight: 800,
                    }}
                  >
                    Tag
                  </span>
                  <strong style={{ color: cinematicTypography.inkStrong, fontSize: 18 }}>
                    {selectedEntity.tags.length}
                  </strong>
                </div>
              </div>

              {selectedEntity.tags.length > 0 ? (
                <div style={{ display: "grid", gap: 10 }}>
                  <div
                    style={{
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: "0.12em",
                      color: cinematicTypography.gold,
                      fontWeight: 800,
                    }}
                  >
                    Tag in evidenza
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {selectedEntity.tags.slice(0, 8).map((tag) => (
                      <span
                        key={tag}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "6px 10px",
                          borderRadius: 999,
                          fontSize: 12,
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          color: cinematicTypography.ink,
                          backdropFilter: "blur(18px)",
                          WebkitBackdropFilter: "blur(18px)",
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
