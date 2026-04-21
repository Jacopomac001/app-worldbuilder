import { useCallback, useMemo, useState } from "react";
import type {
  FocusedGraphFilter,
  GraphNeighborhoodDepth,
  GraphViewMode,
} from "../components/GraphPanel";
import type { Entity, EntityType, EntityTypeDefinition, Relation, RelationAutomationRule, SemanticViewId } from "../types";
import { getEntityTypeLabel } from "../utils/entity";
import {
  buildDefaultGraphTypeFilters,
  buildRelationSuggestions,
  buildSemanticScope,
  compareTimelineEvents,
  parseNumberLike,
} from "../utils/worldData";

export type SortMode = "name-asc" | "type" | "lastModified-desc";
export type WorkspaceView = "dashboard" | "workspace" | "graph" | "reader";
export type WorkspaceRailView = "relations" | "timeline" | "automation";

type UseWorkspaceStateParams = {
  entities: Entity[];
  relations: Relation[];
  entityTypes: EntityTypeDefinition[];
  relationAutomationRules: RelationAutomationRule[];
  initialSelectedId?: string;
  defaultRelationType?: string;
  defaultRelationInverseType?: string;
};

export function useWorkspaceState({
  entities,
  relations,
  entityTypes,
  relationAutomationRules,
  initialSelectedId = "",
  defaultRelationType = "",
  defaultRelationInverseType = "",
}: UseWorkspaceStateParams) {
  const [selectedIdState, setSelectedIdState] = useState<string>(initialSelectedId);
  const [view, setView] = useState<WorkspaceView>("dashboard");
  const [search, setSearch] = useState("");
  const [archiveTypeFilter, setArchiveTypeFilter] = useState<"all" | EntityType>("all");
  const [tagFilter, setTagFilter] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("lastModified-desc");
  const [semanticView, setSemanticView] = useState<SemanticViewId>("default");
  const [isCreatingEntity, setIsCreatingEntity] = useState(false);
  const [createEntityTypeState, setCreateEntityTypeState] = useState<EntityType>("luogo");
  const [isFloatingCreateOpen, setIsFloatingCreateOpen] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [relationType, setRelationType] = useState(defaultRelationType);
  const [relationInverseType, setRelationInverseType] = useState(defaultRelationInverseType);
  const [relationTargetIdState, setRelationTargetIdState] = useState<string | "">("");
  const [graphViewMode, setGraphViewMode] = useState<GraphViewMode>("focused");
  const [graphFilter, setGraphFilter] = useState<FocusedGraphFilter>("all");
  const [graphViewTypeState, setGraphViewTypeState] = useState<"all" | EntityType>("all");
  const [graphViewTagState, setGraphViewTagState] = useState("");
  const [graphRelationFilter, setGraphRelationFilter] = useState("all");
  const [graphNeighborhoodDepth, setGraphNeighborhoodDepth] =
    useState<GraphNeighborhoodDepth>(2);
  const [graphTypeFiltersState, setGraphTypeFiltersState] = useState<Record<string, boolean>>(
    () => buildDefaultGraphTypeFilters(entityTypes)
  );
  const [timelinePeriodFilter, setTimelinePeriodFilter] = useState("all");
  const [workspaceRailView, setWorkspaceRailView] =
    useState<WorkspaceRailView>("relations");
  const [isWorkspaceToolsOpen, setIsWorkspaceToolsOpen] = useState(false);

  const allTags = useMemo(() => {
    return [...new Set(entities.flatMap((entity) => entity.tags))]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "it"));
  }, [entities]);

  const selectedId = useMemo(() => {
    return entities.some((entity) => entity.id === selectedIdState)
      ? selectedIdState
      : entities[0]?.id ?? "";
  }, [entities, selectedIdState]);

  const setSelectedId = useCallback((nextId: string) => {
    setSelectedIdState(nextId);
    setRelationTargetIdState("");
  }, []);

  const createEntityType = useMemo(() => {
    return entityTypes.some((type) => type.id === createEntityTypeState)
      ? createEntityTypeState
      : entityTypes[0]?.id ?? "luogo";
  }, [createEntityTypeState, entityTypes]);

  const setCreateEntityType = useCallback((nextType: EntityType) => {
    setCreateEntityTypeState(nextType);
  }, []);

  const graphViewType = useMemo(() => {
    return graphViewTypeState !== "all" && !entityTypes.some((type) => type.id === graphViewTypeState)
      ? "all"
      : graphViewTypeState;
  }, [entityTypes, graphViewTypeState]);

  const setGraphViewType = useCallback((nextType: "all" | EntityType) => {
    setGraphViewTypeState(nextType);
  }, []);

  const graphViewTag = useMemo(() => {
    if (graphViewTagState) return graphViewTagState;
    return allTags[0] ?? "";
  }, [allTags, graphViewTagState]);

  const setGraphViewTag = useCallback((nextTag: string) => {
    setGraphViewTagState(nextTag);
  }, []);

  const graphTypeFilters = useMemo(() => {
    const defaults = buildDefaultGraphTypeFilters(entityTypes);
    const merged = { ...defaults, ...graphTypeFiltersState };

    entityTypes.forEach((item) => {
      if (typeof merged[item.id] !== "boolean") {
        merged[item.id] = true;
      }
    });

    return merged;
  }, [entityTypes, graphTypeFiltersState]);

  const setGraphTypeFilters = useCallback(
    (
      next:
        | Record<string, boolean>
        | ((current: Record<string, boolean>) => Record<string, boolean>)
    ) => {
      setGraphTypeFiltersState((current) =>
        typeof next === "function" ? next(current) : next
      );
    },
    []
  );

  const relationTargetId = useMemo(() => {
    if (!selectedIdState || selectedIdState !== selectedId) return "";
    return relationTargetIdState;
  }, [relationTargetIdState, selectedId, selectedIdState]);

  const setRelationTargetId = useCallback((nextTargetId: string | "") => {
    setRelationTargetIdState(nextTargetId);
  }, []);

  const filteredEntities = useMemo(() => {
    const q = search.trim().toLowerCase();

    const result = entities.filter((entity) => {
      const typeLabel = getEntityTypeLabel(entity.type, entityTypes).toLowerCase();

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
        entity.type.toLowerCase().includes(q) ||
        typeLabel.includes(q) ||
        entity.tags.some((tag) => tag.toLowerCase().includes(q)) ||
        metadataMatches;

      return matchesType && matchesTag && matchesSearch;
    });

    result.sort((a, b) => {
      if (sortMode === "name-asc") {
        return a.name.localeCompare(b.name, "it");
      }

      if (sortMode === "type") {
        const typeCompare = getEntityTypeLabel(a.type, entityTypes).localeCompare(
          getEntityTypeLabel(b.type, entityTypes),
          "it"
        );
        if (typeCompare !== 0) return typeCompare;
        return a.name.localeCompare(b.name, "it");
      }

      return b.lastModified - a.lastModified;
    });

    return result;
  }, [archiveTypeFilter, entities, entityTypes, search, sortMode, tagFilter]);

  const selectedEntity = useMemo(
    () => entities.find((entity) => entity.id === selectedId) ?? null,
    [entities, selectedId]
  );

  const relationSuggestions = useMemo(
    () => buildRelationSuggestions(relationAutomationRules, entities, relations),
    [entities, relationAutomationRules, relations]
  );

  const semanticScope = useMemo(
    () => buildSemanticScope(semanticView, entities, relations, selectedId),
    [entities, relations, selectedId, semanticView]
  );

  const availableRelationTargets = useMemo(
    () => (selectedEntity ? entities.filter((entity) => entity.id !== selectedEntity.id) : []),
    [entities, selectedEntity]
  );

  const selectedEntityRelations = useMemo(
    () =>
      selectedEntity
        ? relations.filter(
            (relation) =>
              relation.fromEntityId === selectedEntity.id ||
              relation.toEntityId === selectedEntity.id
          )
        : [],
    [relations, selectedEntity]
  );

  const timelineEvents = useMemo(() => {
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

  const selectedTimelineCount = useMemo(() => {
    if (!selectedEntity) return timelineEvents.length;

    return timelineEvents.filter((event) => {
      if (event.entity.id === selectedEntity.id) return true;
      return selectedEntityRelations.some(
        (relation) =>
          relation.fromEntityId === event.entity.id ||
          relation.toEntityId === event.entity.id
      );
    }).length;
  }, [selectedEntity, selectedEntityRelations, timelineEvents]);

  const workspaceRailTabs = useMemo(
    () => [
      {
        id: "relations" as const,
        label: "Relazioni",
        helper: `${selectedEntityRelations.length} legami`,
      },
      {
        id: "timeline" as const,
        label: "Timeline",
        helper: `${selectedTimelineCount} eventi`,
      },
      {
        id: "automation" as const,
        label: "Automazioni",
        helper: `${relationSuggestions.length} suggerimenti`,
      },
    ],
    [relationSuggestions.length, selectedEntityRelations.length, selectedTimelineCount]
  );

  const quickCreateOptions = useMemo(() => {
    return entityTypes.slice(0, 8).map((type) => ({
      value: type.id,
      label: type.label,
      color: type.color,
    }));
  }, [entityTypes]);

  const toggleGraphTypeFilter = useCallback((type: EntityType) => {
    setGraphTypeFilters((current) => ({
      ...current,
      [type]: !current[type],
    }));
  }, [setGraphTypeFilters]);

  return {
    selectedId,
    setSelectedId,
    view,
    setView,
    search,
    setSearch,
    archiveTypeFilter,
    setArchiveTypeFilter,
    tagFilter,
    setTagFilter,
    sortMode,
    setSortMode,
    semanticView,
    setSemanticView,
    isCreatingEntity,
    setIsCreatingEntity,
    createEntityType,
    setCreateEntityType,
    isFloatingCreateOpen,
    setIsFloatingCreateOpen,
    newTag,
    setNewTag,
    relationType,
    setRelationType,
    relationInverseType,
    setRelationInverseType,
    relationTargetId,
    setRelationTargetId,
    graphViewMode,
    setGraphViewMode,
    graphFilter,
    setGraphFilter,
    graphViewType,
    setGraphViewType,
    graphViewTag,
    setGraphViewTag,
    graphRelationFilter,
    setGraphRelationFilter,
    graphNeighborhoodDepth,
    setGraphNeighborhoodDepth,
    graphTypeFilters,
    setGraphTypeFilters,
    timelinePeriodFilter,
    setTimelinePeriodFilter,
    workspaceRailView,
    setWorkspaceRailView,
    isWorkspaceToolsOpen,
    setIsWorkspaceToolsOpen,
    allTags,
    filteredEntities,
    selectedEntity,
    relationSuggestions,
    semanticScope,
    availableRelationTargets,
    selectedEntityRelations,
    timelineEvents,
    timelinePeriods,
    selectedTimelineCount,
    workspaceRailTabs,
    quickCreateOptions,
    toggleGraphTypeFilter,
  };
}
