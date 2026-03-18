import { useEffect, useMemo, useRef } from "react";
import {
  ENTITY_TYPE_FILTER_OPTIONS,
  QUICK_CREATE_OPTIONS,
  SORT_MODE_OPTIONS,
  UI_TEXT,
} from "../config";
import {
  archiveItemStyle,
  quickCreateButtonStyle,
  selectedBadgeStyle,
  tagChipStyle,
} from "../styles";
import type { Entity, EntityType } from "../types";
import { getEntityTypeLabel, getTypeColor } from "../utils/entity";
import NewEntityForm from "./NewEntityForm";

type SortMode = "name-asc" | "type" | "lastModified-desc";

type SidebarProps = {
  entities: Entity[];
  allTags: string[];
  selectedEntityId: string | null;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  typeFilter: EntityType | "tutti";
  setTypeFilter: (value: EntityType | "tutti") => void;
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
  searchInputRef: React.RefObject<HTMLInputElement | null>;
};

const asideStyle: React.CSSProperties = {
  width: 280,
  minWidth: 280,
  height: "100vh",
  overflowY: "auto",
  borderRight: "1px solid #2a2a2a",
  background: "#111",
  color: "white",
  padding: 16,
  boxSizing: "border-box",
};

const controlsStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
  marginBottom: 16,
};

const baseControlStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #333",
  background: "#0f0f0f",
  color: "white",
};

const primaryActionStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "none",
  background: "#2d6cdf",
  color: "white",
  cursor: "pointer",
  fontWeight: 600,
};

export default function Sidebar({
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
  searchInputRef,
}: SidebarProps) {
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const previousSelectedIdRef = useRef<string | null>(null);

  const selectedIndex = useMemo(
    () => entities.findIndex((entity) => entity.id === selectedEntityId),
    [entities, selectedEntityId]
  );

  useEffect(() => {
    if (!selectedEntityId) return;

    const previousId = previousSelectedIdRef.current;
    const selectedChanged = previousId !== selectedEntityId;
    previousSelectedIdRef.current = selectedEntityId;

    const target = itemRefs.current[selectedEntityId];
    if (!target || !selectedChanged) return;

    target.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }, [selectedEntityId]);

  return (
    <aside style={asideStyle}>
      <div style={controlsStyle}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Archivio</h2>

        <button onClick={() => onOpenCreateEntity()} style={primaryActionStyle}>
          + Nuova entità
        </button>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
          }}
        >
          {QUICK_CREATE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => onOpenCreateEntity(option.value)}
              style={quickCreateButtonStyle()}
            >
              {option.label}
            </button>
          ))}
        </div>

        {isCreatingEntity && (
          <NewEntityForm
            entities={entities}
            initialType={createEntityType}
            onCreate={onCreateEntity}
            onCancel={onCancelCreateEntity}
          />
        )}

        <input
          ref={searchInputRef}
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder={`${UI_TEXT.searchPlaceholder}  (Ctrl/Cmd + F)`}
          style={baseControlStyle}
        />

        <select
          value={typeFilter}
          onChange={(event) =>
            setTypeFilter(event.target.value as EntityType | "tutti")
          }
          style={baseControlStyle}
        >
          {ENTITY_TYPE_FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={tagFilter}
          onChange={(event) => setTagFilter(event.target.value)}
          style={baseControlStyle}
        >
          <option value="">tutti i tag</option>
          {allTags.map((tag) => (
            <option key={tag} value={tag}>
              #{tag}
            </option>
          ))}
        </select>

        <select
          value={sortMode}
          onChange={(event) => setSortMode(event.target.value as SortMode)}
          style={baseControlStyle}
        >
          {SORT_MODE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {selectedEntityId && selectedIndex >= 0 ? (
          <div style={{ fontSize: 12, color: "#9ca3af" }}>
            Selezione archivio: {selectedIndex + 1} / {entities.length}
          </div>
        ) : null}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {entities.map((entity) => {
          const isSelected = entity.id === selectedEntityId;
          const accent = getTypeColor(entity.type);

          return (
            <button
              key={entity.id}
              ref={(node) => {
                itemRefs.current[entity.id] = node;
              }}
              onClick={() => onSelectEntity(entity.id)}
              style={{
                ...archiveItemStyle(isSelected),
                borderLeft: `4px solid ${accent}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 8,
                  marginBottom: 6,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    minWidth: 0,
                  }}
                >
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "999px",
                      backgroundColor: accent,
                      flexShrink: 0,
                      marginTop: 4,
                    }}
                  />
                  <div
                    style={{
                      fontWeight: 700,
                      textAlign: "left",
                      wordBreak: "break-word",
                    }}
                  >
                    {entity.name}
                  </div>
                </div>

                {isSelected ? (
                  <span style={selectedBadgeStyle()}>{UI_TEXT.selectedBadge}</span>
                ) : null}
              </div>

              <div
                style={{
                  fontSize: 12,
                  opacity: 0.85,
                  marginBottom: 6,
                  color: accent,
                  fontWeight: 700,
                }}
              >
                {getEntityTypeLabel(entity.type)}
              </div>

              {entity.shortDescription && (
                <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 8 }}>
                  {entity.shortDescription}
                </div>
              )}

              {entity.tags.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 6,
                  }}
                >
                  {entity.tags.map((tag) => (
                    <span key={tag} style={tagChipStyle()}>
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </aside>
  );
}