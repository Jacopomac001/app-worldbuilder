import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { SORT_MODE_OPTIONS, UI_TEXT } from "../config";
import {
  archiveItemStyle,
  cinematicMotion,
  cinematicTypography,
  ghostButtonStyle,
  inputStyle,
  quickCreateButtonStyle,
  selectedBadgeStyle,
  tagChipStyle,
} from "../styles";
import type { Entity, EntityType, EntityTypeDefinition } from "../types";
import EntityTypeManager from "./EntityTypeManager";
import NewEntityForm from "./NewEntityForm";
import { uiIcons } from "../utils/icons";

type SortMode = "name-asc" | "type" | "lastModified-desc";
type SidebarPanel = "archive" | "create" | "schema";

type SidebarProps = {
  entityTypes: EntityTypeDefinition[];
  entities: Entity[];
  allTags: string[];
  selectedEntityId: string | null;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  typeFilter: EntityType | "all";
  setTypeFilter: (value: EntityType | "all") => void;
  tagFilter: string;
  setTagFilter: (value: string) => void;
  sortMode: SortMode;
  setSortMode: (value: SortMode) => void;
  onSelectEntity: (entityId: string) => void;
  isCreatingEntity: boolean;
  createEntityType: EntityType;
  onOpenCreateEntity: (type?: EntityType) => void;
  onCancelCreateEntity: () => void;
  onCreateEntity: (data: {
    type: EntityType;
    name: string;
    shortDescription: string;
  }) => boolean;
  onCreateEntityType: (data: { label: string; color: string }) => boolean;
  onUpdateEntityType: (type: EntityTypeDefinition) => boolean;
  onDeleteEntityType: (typeId: EntityType) => boolean;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
};

const asideStyle: React.CSSProperties = {
  width: "100%",
  minWidth: 0,
  minHeight: 0,
  maxHeight: "calc(100vh - 40px)",
  position: "sticky",
  top: 20,
  overflow: "hidden",
  color: cinematicTypography.inkStrong,
  padding: "4px 14px 8px 0",
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "column",
  gap: 22,
};

const sectionNoteStyle: React.CSSProperties = {
  color: cinematicTypography.inkMuted,
  fontSize: 13,
  lineHeight: 1.65,
};

const baseControlStyle: React.CSSProperties = {
  ...inputStyle,
  padding: "12px 13px",
  borderRadius: 18,
  background: "rgba(255,255,255,0.03)",
  boxShadow: "none",
};

const toolsWrapStyle: React.CSSProperties = {
  display: "grid",
  gap: 12,
};

const tabRailStyle: React.CSSProperties = {
  display: "flex",
  gap: 18,
  flexWrap: "wrap",
  paddingBottom: 2,
  borderBottom: "1px solid rgba(255,255,255,0.08)",
};

function panelTabStyle(isActive: boolean): React.CSSProperties {
  return {
    border: "none",
    background: "transparent",
    color: isActive ? cinematicTypography.inkStrong : cinematicTypography.inkMuted,
    fontSize: 13,
    fontWeight: 800,
    padding: "0 0 10px",
    cursor: "pointer",
    borderBottom: isActive ? "2px solid rgba(146,182,255,0.4)" : "2px solid transparent",
    transition: cinematicMotion.transition,
  };
}

function getTypeLabel(typeId: string, entityTypes: EntityTypeDefinition[]) {
  return (
    entityTypes.find((item) => item.id === typeId)?.label ??
    typeId.charAt(0).toUpperCase() + typeId.slice(1)
  );
}

function getTypeColor(typeId: string, entityTypes: EntityTypeDefinition[]) {
  return entityTypes.find((item) => item.id === typeId)?.color ?? "#64748b";
}

export default function Sidebar({
  entityTypes,
  entities,
  allTags,
  selectedEntityId,
  searchTerm,
  setSearchTerm,
  typeFilter,
  setTypeFilter,
  tagFilter,
  setTagFilter,
  sortMode,
  setSortMode,
  onSelectEntity,
  isCreatingEntity,
  createEntityType,
  onOpenCreateEntity,
  onCancelCreateEntity,
  onCreateEntity,
  onCreateEntityType,
  onUpdateEntityType,
  onDeleteEntityType,
  searchInputRef,
}: SidebarProps) {
  const [activePanel, setActivePanel] = useState<SidebarPanel>("archive");
  const [isTypeCreatorOpen, setIsTypeCreatorOpen] = useState(false);
  const [newTypeLabel, setNewTypeLabel] = useState("");
  const [newTypeColor, setNewTypeColor] = useState("#64748b");
  const [hoveredEntityId, setHoveredEntityId] = useState<string | null>(null);
  const visiblePanel: SidebarPanel = isCreatingEntity ? "create" : activePanel;

  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const previousSelectedIdRef = useRef<string | null>(null);

  const selectedIndex = useMemo(
    () => entities.findIndex((entity) => entity.id === selectedEntityId),
    [entities, selectedEntityId]
  );

  useEffect(() => {
    if (!selectedEntityId || visiblePanel !== "archive") return;
    if (previousSelectedIdRef.current === selectedEntityId) return;

    const target = itemRefs.current[selectedEntityId];
    if (target) {
      target.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }

    previousSelectedIdRef.current = selectedEntityId;
  }, [selectedEntityId, visiblePanel]);

  useEffect(() => {
    function handleKeyNavigation(event: KeyboardEvent) {
      if (visiblePanel !== "archive") return;

      if (
        document.activeElement &&
        document.activeElement !== document.body &&
        document.activeElement !== searchInputRef.current
      ) {
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        const nextIndex =
          selectedIndex < 0
            ? 0
            : Math.min(selectedIndex + 1, Math.max(entities.length - 1, 0));

        const nextEntity = entities[nextIndex];
        if (nextEntity) {
          onSelectEntity(nextEntity.id);
        }
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        const previousIndex = selectedIndex < 0 ? 0 : Math.max(selectedIndex - 1, 0);
        const previousEntity = entities[previousIndex];
        if (previousEntity) {
          onSelectEntity(previousEntity.id);
        }
      }
    }

    window.addEventListener("keydown", handleKeyNavigation);
    return () => window.removeEventListener("keydown", handleKeyNavigation);
  }, [entities, onSelectEntity, searchInputRef, selectedIndex, visiblePanel]);

  function handleCreateType() {
    const created = onCreateEntityType({
      label: newTypeLabel,
      color: newTypeColor,
    });

    if (!created) return;

    setNewTypeLabel("");
    setNewTypeColor("#64748b");
    setIsTypeCreatorOpen(false);
  }

  return (
    <aside style={asideStyle}>
      <div
        style={{
          display: "grid",
          gap: 18,
          paddingBottom: 4,
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            width: "fit-content",
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: cinematicTypography.gold,
            fontWeight: 800,
          }}
        >
          <uiIcons.archive size={13} />
          World index
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <div
            style={{
              fontFamily: cinematicTypography.displayFont,
              fontSize: 30,
              lineHeight: 1,
              color: cinematicTypography.inkStrong,
            }}
          >
            Atlante del mondo
          </div>
          <div style={sectionNoteStyle}>
            Archivio, creazione e schema convivono in una sola colonna piu leggera: meno moduli,
            piu continuita visiva.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 18,
            flexWrap: "wrap",
            paddingBottom: 2,
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div
            style={{
              minWidth: 92,
              display: "grid",
              gap: 4,
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
              In vista
            </span>
            <strong style={{ color: cinematicTypography.inkStrong, fontSize: 18 }}>
              {entities.length}
            </strong>
          </div>

          <div
            style={{
              minWidth: 120,
              display: "grid",
              gap: 4,
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
              Focus
            </span>
            <strong style={{ color: cinematicTypography.inkStrong, fontSize: 14 }}>
              {selectedEntityId ? "Scheda attiva" : "Nessuna scheda"}
            </strong>
          </div>
        </div>
      </div>

      <div style={tabRailStyle}>
        <button
          type="button"
          style={panelTabStyle(visiblePanel === "archive")}
          onClick={() => setActivePanel("archive")}
        >
          Archivio
        </button>
        <button
          type="button"
          style={panelTabStyle(visiblePanel === "create")}
          onClick={() => setActivePanel("create")}
        >
          Crea
        </button>
        <button
          type="button"
          style={panelTabStyle(visiblePanel === "schema")}
          onClick={() => setActivePanel("schema")}
        >
          Schema
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gap: 16,
          minHeight: 0,
          flex: "1 1 auto",
        }}
      >
        {visiblePanel === "archive" ? (
          <>
            <div style={toolsWrapStyle}>
              <div style={sectionNoteStyle}>
                Filtra per testo, tipo o tag. I controlli restano raccolti in alto, l&apos;archivio
                scorre sotto senza spezzare il ritmo del workspace.
              </div>

              <div style={{ position: "relative" }}>
                <uiIcons.search
                  size={15}
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: cinematicTypography.inkMuted,
                    pointerEvents: "none",
                  }}
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={UI_TEXT.searchPlaceholder}
                  style={{
                    ...baseControlStyle,
                    width: "100%",
                    paddingLeft: 36,
                  }}
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 10,
                }}
              >
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as EntityType | "all")}
                  style={baseControlStyle}
                >
                  <option value="all">Tutti i tipi</option>
                  {entityTypes.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <select
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as SortMode)}
                  style={baseControlStyle}
                >
                  {SORT_MODE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                style={baseControlStyle}
              >
                <option value="">{UI_TEXT.tagFilterPlaceholder}</option>
                {allTags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            </div>

            <div
              style={{
                minHeight: 0,
                overflowY: "auto",
                paddingRight: 4,
                display: "grid",
                gap: 4,
                alignContent: "start",
              }}
            >
              {entities.length === 0 ? (
                <div
                  style={{
                    padding: "10px 0 0",
                    color: cinematicTypography.inkMuted,
                    fontSize: 14,
                    lineHeight: 1.6,
                  }}
                >
                  Nessuna entita disponibile.
                </div>
              ) : (
                entities.map((entity) => {
                  const isSelected = entity.id === selectedEntityId;
                  const accent = getTypeColor(entity.type, entityTypes);
                  const itemBaseStyle = archiveItemStyle(isSelected);
                  const isHovered = hoveredEntityId === entity.id;

                  return (
                    <button
                      key={entity.id}
                      type="button"
                      ref={(node) => {
                        itemRefs.current[entity.id] = node;
                      }}
                      onClick={() => {
                        setActivePanel("archive");
                        onSelectEntity(entity.id);
                      }}
                      onMouseEnter={() => setHoveredEntityId(entity.id)}
                      onMouseLeave={() =>
                        setHoveredEntityId((current) =>
                          current === entity.id ? null : current
                        )
                      }
                      style={{
                        ...itemBaseStyle,
                        transform:
                          isHovered && !isSelected ? cinematicMotion.liftHoverTransform : "none",
                        boxShadow:
                          isHovered && !isSelected
                            ? "0 12px 24px rgba(0,0,0,0.12), 0 0 18px rgba(100,150,255,0.05)"
                            : itemBaseStyle.boxShadow,
                        background: isHovered ? "rgba(255,255,255,0.025)" : "transparent",
                        borderColor: isSelected
                          ? "rgba(146,182,255,0.3)"
                          : "transparent",
                        borderRadius: 14,
                        borderLeftWidth: isSelected ? 3 : 1,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                        <div
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: 12,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: `${accent}18`,
                            border: `1px solid ${accent}30`,
                            flexShrink: 0,
                            marginTop: 2,
                          }}
                        >
                          <span
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: 999,
                              backgroundColor: accent,
                              display: "block",
                            }}
                          />
                        </div>

                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 8,
                              alignItems: "flex-start",
                            }}
                          >
                            <div
                              style={{
                                fontWeight: 700,
                                fontFamily: cinematicTypography.displayFont,
                                fontSize: 17,
                                color: cinematicTypography.inkStrong,
                                minWidth: 0,
                                textAlign: "left",
                                wordBreak: "break-word",
                              }}
                            >
                              {entity.name}
                            </div>

                            {isSelected ? (
                              <span
                                style={{
                                  ...selectedBadgeStyle(),
                                  background: "transparent",
                                  border: "none",
                                  padding: 0,
                                  color: cinematicTypography.blue,
                                  backdropFilter: "none",
                                  WebkitBackdropFilter: "none",
                                }}
                              >
                                Attivo
                              </span>
                            ) : null}
                          </div>

                          <div
                            style={{
                              fontSize: 11,
                              marginTop: 4,
                              textAlign: "left",
                              color: cinematicTypography.inkSoft,
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                            }}
                          >
                            {getTypeLabel(entity.type, entityTypes)}
                          </div>

                          {entity.shortDescription ? (
                            <div
                              style={{
                                fontSize: 12,
                                color: cinematicTypography.inkMuted,
                                marginTop: 6,
                                textAlign: "left",
                                lineHeight: 1.6,
                              }}
                            >
                              {entity.shortDescription}
                            </div>
                          ) : null}

                          {entity.tags.length > 0 ? (
                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 6,
                                marginTop: 8,
                              }}
                            >
                              {entity.tags.slice(0, 3).map((tag) => (
                                <span key={tag} style={tagChipStyle()}>
                                  {tag}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </>
        ) : null}

        {visiblePanel === "create" ? (
          <div style={{ display: "grid", gap: 14, minHeight: 0 }}>
            <div style={sectionNoteStyle}>
              Avvia una nuova entita e poi lascia che sia il focus panel centrale a raccogliere il
              resto del lavoro.
            </div>

            <button
              type="button"
              onClick={() => onOpenCreateEntity()}
              style={{
                ...ghostButtonStyle,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                width: "100%",
                background: "transparent",
                border: "1px dashed rgba(146,182,255,0.2)",
                boxShadow: "none",
              }}
            >
              <uiIcons.newEntity size={16} />
              Nuova entita
            </button>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 8,
              }}
            >
              {entityTypes.slice(0, 6).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onOpenCreateEntity(option.id)}
                  style={{
                    ...quickCreateButtonStyle(),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    minHeight: 42,
                    minWidth: 0,
                    whiteSpace: "normal",
                    lineHeight: 1.3,
                  }}
                >
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 999,
                      backgroundColor: option.color,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>{option.label}</span>
                </button>
              ))}
            </div>

            {isCreatingEntity ? (
              <div style={{ minHeight: 0, overflowY: "auto", paddingRight: 2 }}>
                <NewEntityForm
                  entityTypes={entityTypes}
                  entities={entities}
                  initialType={createEntityType}
                  onCancel={onCancelCreateEntity}
                  onCreate={onCreateEntity}
                />
              </div>
            ) : (
              <div style={sectionNoteStyle}>
                Scegli un tipo rapido o usa il pulsante principale per aprire il form completo.
              </div>
            )}
          </div>
        ) : null}

        {visiblePanel === "schema" ? (
          <div style={{ display: "grid", gap: 14, minHeight: 0 }}>
            <div style={sectionNoteStyle}>
              Gestisci i tipi di entita e i loro campi senza farli sembrare un modulo separato
              dall&apos;archivio operativo.
            </div>

            <button
              type="button"
              onClick={() => setIsTypeCreatorOpen((current) => !current)}
              style={{
                ...ghostButtonStyle,
                width: "100%",
                justifyContent: "center",
                background: "transparent",
                boxShadow: "none",
              }}
            >
              {isTypeCreatorOpen ? "Chiudi creazione tipo" : "+ Nuovo tipo entita"}
            </button>

            {isTypeCreatorOpen ? (
              <div
                style={{
                  display: "grid",
                  gap: 10,
                  padding: "12px 0 4px",
                  borderTop: "1px solid rgba(255,255,255,0.08)",
                  backdropFilter: "blur(22px)",
                  WebkitBackdropFilter: "blur(22px)",
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: cinematicTypography.gold,
                    fontWeight: 800,
                  }}
                >
                  Crea tipo custom
                </div>

                <input
                  type="text"
                  value={newTypeLabel}
                  onChange={(e) => setNewTypeLabel(e.target.value)}
                  placeholder="Es. Religione"
                  style={baseControlStyle}
                />

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 70px",
                    gap: 8,
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      ...baseControlStyle,
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <span
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: 999,
                        backgroundColor: newTypeColor,
                        border: "1px solid rgba(255,255,255,0.18)",
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ color: cinematicTypography.ink, fontSize: 13 }}>
                      Colore tipo
                    </span>
                  </div>

                  <input
                    type="color"
                    value={newTypeColor}
                    onChange={(e) => setNewTypeColor(e.target.value)}
                    style={{
                      width: "100%",
                      height: 42,
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: "transparent",
                      padding: 4,
                      cursor: "pointer",
                    }}
                  />
                </div>

                <button type="button" onClick={handleCreateType} style={ghostButtonStyle}>
                  Salva tipo
                </button>
              </div>
            ) : null}

            <div style={{ minHeight: 0, overflowY: "auto", paddingRight: 2 }}>
              <EntityTypeManager
                entityTypes={entityTypes}
                entities={entities}
                onUpdateEntityType={onUpdateEntityType}
                onDeleteEntityType={onDeleteEntityType}
              />
            </div>
          </div>
        ) : null}
      </div>

      {visiblePanel !== "archive" ? (
        <button
          type="button"
          onClick={() => setActivePanel("archive")}
          style={{
            ...ghostButtonStyle,
            width: "fit-content",
          }}
        >
          Torna all&apos;archivio
        </button>
      ) : null}
    </aside>
  );
}
