import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { SORT_MODE_OPTIONS, UI_TEXT } from "../config";
import {
  archiveItemStyle,
  quickCreateButtonStyle,
  selectedBadgeStyle,
  tagChipStyle,
} from "../styles";
import type { Entity, EntityType, EntityTypeDefinition } from "../types";
import NewEntityForm from "./NewEntityForm";
import { uiIcons } from "../utils/icons";

type SortMode = "name-asc" | "type" | "lastModified-desc";

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
  searchInputRef: React.RefObject<HTMLInputElement | null>;
};

const asideStyle: React.CSSProperties = {
  width: 280,
  minWidth: 280,
  height: "100vh",
  overflowY: "auto",
  borderRight: "1px solid rgba(148,163,184,0.12)",
  background:
    "linear-gradient(180deg, rgba(15,23,38,0.96) 0%, rgba(10,16,27,0.98) 100%)",
  color: "white",
  padding: 16,
  boxSizing: "border-box",
  boxShadow: "inset -1px 0 0 rgba(255,255,255,0.02)",
};

const controlsStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
  marginBottom: 16,
};

const baseControlStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(148,163,184,0.14)",
  background:
    "linear-gradient(180deg, rgba(19,29,46,0.96) 0%, rgba(15,23,38,0.96) 100%)",
  color: "white",
  boxShadow: "0 8px 18px rgba(2,6,23,0.12)",
};

const primaryActionStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(96,165,250,0.22)",
  background: "linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)",
  color: "white",
  cursor: "pointer",
  fontWeight: 700,
  boxShadow: "0 12px 24px rgba(37,99,235,0.22)",
};

const typeFormWrapStyle: React.CSSProperties = {
  display: "grid",
  gap: 8,
  padding: 12,
  marginBottom: 16,
  borderRadius: 12,
  border: "1px solid rgba(148,163,184,0.14)",
  background:
    "linear-gradient(180deg, rgba(19,29,46,0.96) 0%, rgba(15,23,38,0.96) 100%)",
};

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
  searchInputRef,
}: SidebarProps) {
  const [isTypeCreatorOpen, setIsTypeCreatorOpen] = useState(false);
  const [newTypeLabel, setNewTypeLabel] = useState("");
  const [newTypeColor, setNewTypeColor] = useState("#64748b");

  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const previousSelectedIdRef = useRef<string | null>(null);

  const selectedIndex = useMemo(
    () => entities.findIndex((entity) => entity.id === selectedEntityId),
    [entities, selectedEntityId]
  );

  useEffect(() => {
    if (!selectedEntityId) return;
    if (previousSelectedIdRef.current === selectedEntityId) return;

    const target = itemRefs.current[selectedEntityId];
    if (target) {
      target.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }

    previousSelectedIdRef.current = selectedEntityId;
  }, [selectedEntityId]);

  useEffect(() => {
    function handleKeyNavigation(event: KeyboardEvent) {
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
        const previousIndex =
          selectedIndex < 0 ? 0 : Math.max(selectedIndex - 1, 0);

        const previousEntity = entities[previousIndex];
        if (previousEntity) {
          onSelectEntity(previousEntity.id);
        }
      }
    }

    window.addEventListener("keydown", handleKeyNavigation);
    return () => window.removeEventListener("keydown", handleKeyNavigation);
  }, [entities, onSelectEntity, searchInputRef, selectedIndex]);

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
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 12,
          fontSize: 20,
          fontWeight: 800,
        }}
      >
        <uiIcons.archive size={18} />
        <span>Archivio</span>
      </div>

      <div style={{ color: "#94a3b8", fontSize: 13, marginBottom: 14 }}>
        {entities.length} entità visibili
      </div>

      <button
        type="button"
        onClick={() => onOpenCreateEntity()}
        style={{
          ...primaryActionStyle,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          width: "100%",
          marginBottom: 12,
        }}
      >
        <uiIcons.newEntity size={16} />
        Nuova entità
      </button>

      <button
        type="button"
        onClick={() => setIsTypeCreatorOpen((current) => !current)}
        style={{
          ...baseControlStyle,
          width: "100%",
          cursor: "pointer",
          marginBottom: 12,
          fontWeight: 700,
        }}
      >
        {isTypeCreatorOpen ? "Chiudi creazione tipo" : "+ Nuovo tipo entità"}
      </button>

      {isTypeCreatorOpen ? (
        <div style={typeFormWrapStyle}>
          <div
            style={{
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              color: "#9ca3af",
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
              <span style={{ color: "#cbd5e1", fontSize: 13 }}>Colore tipo</span>
            </div>

            <input
              type="color"
              value={newTypeColor}
              onChange={(e) => setNewTypeColor(e.target.value)}
              style={{
                width: "100%",
                height: 42,
                borderRadius: 12,
                border: "1px solid rgba(148,163,184,0.14)",
                background: "transparent",
                padding: 4,
                cursor: "pointer",
              }}
            />
          </div>

          <button
            type="button"
            onClick={handleCreateType}
            style={primaryActionStyle}
          >
            Salva tipo
          </button>
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 8,
          marginBottom: 16,
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
            {option.label}
          </button>
        ))}
      </div>

      {isCreatingEntity ? (
        <div style={{ marginBottom: 16 }}>
          <NewEntityForm
            entityTypes={entityTypes}
            entities={entities}
            initialType={createEntityType}
            onCancel={onCancelCreateEntity}
            onCreate={onCreateEntity}
          />
        </div>
      ) : null}

      <div style={controlsStyle}>
        <div style={{ position: "relative" }}>
          <uiIcons.search
            size={15}
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: "#94a3b8",
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

      {entities.length === 0 ? (
        <div
          style={{
            padding: 14,
            borderRadius: 14,
            border: "1px solid rgba(148,163,184,0.14)",
            background:
              "linear-gradient(180deg, rgba(19,29,46,0.96) 0%, rgba(15,23,38,0.96) 100%)",
            color: "#94a3b8",
            fontSize: 14,
            lineHeight: 1.5,
          }}
        >
          Nessuna entità disponibile.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {entities.map((entity) => {
            const isSelected = entity.id === selectedEntityId;
            const accent = getTypeColor(entity.type, entityTypes);

            return (
              <button
                key={entity.id}
                type="button"
                ref={(node) => {
                  itemRefs.current[entity.id] = node;
                }}
                onClick={() => onSelectEntity(entity.id)}
                style={archiveItemStyle(isSelected)}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 10,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: `${accent}22`,
                      border: `1px solid ${accent}44`,
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
                          minWidth: 0,
                          textAlign: "left",
                          wordBreak: "break-word",
                        }}
                      >
                        {entity.name}
                      </div>

                      {isSelected ? (
                        <span style={selectedBadgeStyle()}>Attivo</span>
                      ) : null}
                    </div>

                    <div
                      style={{
                        fontSize: 12,
                        opacity: 0.78,
                        marginTop: 4,
                        textAlign: "left",
                      }}
                    >
                      {getTypeLabel(entity.type, entityTypes)}
                    </div>

                    {entity.shortDescription ? (
                      <div
                        style={{
                          fontSize: 12,
                          color: "#9fb0c7",
                          marginTop: 6,
                          textAlign: "left",
                          lineHeight: 1.45,
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
          })}
        </div>
      )}
    </aside>
  );
}