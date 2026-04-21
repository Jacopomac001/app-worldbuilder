import { TIMELINE_STATUS_COLORS } from "../config";
import type {
  Entity,
  EntityTypeDefinition,
  MetadataFieldDefinition,
  Relation,
  RelationAutomationRule,
  SemanticViewId,
} from "../types";
import {
  normalizeEntityName,
  normalizeMetadata,
  normalizeMetadataValue,
  normalizeOptionalRelationType,
  normalizeRelationType,
  normalizeTag,
  normalizeText,
} from "./entity";

export type TimelineEvent = {
  entity: Entity;
  anno: string;
  epoca: string;
  ordineCronologico: string;
  stato: string;
  parsedYear: number | null;
  parsedOrder: number | null;
};

export type ImportEntityReviewStatus = "new" | "probable-match" | "conflict" | "duplicate";

export type ImportEntityReview = {
  importedEntity: Entity;
  status: ImportEntityReviewStatus;
  matchedEntity?: Entity;
  reason: string;
};

export type RelationSuggestion = {
  ruleId: string;
  sourceEntity: Entity;
  targetEntity: Entity;
  relationType: string;
  inverseType?: string;
  reason: string;
};

export function parseNumberLike(value: string | undefined): number | null {
  if (!value) return null;

  const cleaned = value.trim().replace(",", ".");
  if (!cleaned) return null;

  const direct = Number(cleaned);
  if (!Number.isNaN(direct)) return direct;

  const match = cleaned.match(/-?\d+(\.\d+)?/);
  if (!match) return null;

  const extracted = Number(match[0]);
  return Number.isNaN(extracted) ? null : extracted;
}

export function compareTimelineEvents(a: TimelineEvent, b: TimelineEvent) {
  if (a.parsedOrder !== null && b.parsedOrder !== null) {
    if (a.parsedOrder !== b.parsedOrder) {
      return a.parsedOrder - b.parsedOrder;
    }
  } else if (a.parsedOrder !== null) {
    return -1;
  } else if (b.parsedOrder !== null) {
    return 1;
  }

  if (a.parsedYear !== null && b.parsedYear !== null) {
    if (a.parsedYear !== b.parsedYear) {
      return a.parsedYear - b.parsedYear;
    }
  } else if (a.parsedYear !== null) {
    return -1;
  } else if (b.parsedYear !== null) {
    return 1;
  }

  return a.entity.name.localeCompare(b.entity.name, "it");
}

export function getTimelineBadgeColor(status: string) {
  return TIMELINE_STATUS_COLORS[status.trim().toLowerCase()] ?? "#374151";
}

function areEntitiesEquivalent(a: Entity, b: Entity) {
  return (
    a.type === b.type &&
    normalizeEntityName(a.name).toLowerCase() === normalizeEntityName(b.name).toLowerCase() &&
    normalizeText(a.shortDescription).toLowerCase() === normalizeText(b.shortDescription).toLowerCase() &&
    normalizeText(a.notes).toLowerCase() === normalizeText(b.notes).toLowerCase() &&
    JSON.stringify(normalizeMetadata(a.metadata)) === JSON.stringify(normalizeMetadata(b.metadata)) &&
    JSON.stringify([...a.tags].sort()) === JSON.stringify([...b.tags].sort())
  );
}

function relationMatchesSemanticView(relation: Relation, semanticView: SemanticViewId) {
  const SEMANTIC_RELATION_HINTS = {
    political: ["controlla", "governa", "leader", "alleato", "nemico", "membro"],
    genealogy: ["figlio", "madre", "padre", "coniuge", "discende"],
    events: ["caus", "succede", "distrutto", "svolge", "inizia", "termina"],
    factions: ["membro", "leader", "alleato", "nemico", "controlla"],
  } as const;

  if (semanticView === "default") return true;

  const normalizedType = normalizeRelationType(relation.type);

  if (semanticView === "political-map") {
    return SEMANTIC_RELATION_HINTS.political.some((hint) => normalizedType.includes(hint));
  }

  if (semanticView === "genealogy") {
    return SEMANTIC_RELATION_HINTS.genealogy.some((hint) => normalizedType.includes(hint));
  }

  if (semanticView === "event-chain") {
    return SEMANTIC_RELATION_HINTS.events.some((hint) => normalizedType.includes(hint));
  }

  return SEMANTIC_RELATION_HINTS.factions.some((hint) => normalizedType.includes(hint));
}

function entityMatchesSemanticView(entity: Entity, semanticView: SemanticViewId) {
  if (semanticView === "default") return true;
  if (semanticView === "political-map") {
    return entity.type === "luogo" || entity.type === "fazione" || entity.type === "personaggio" || entity.type === "evento";
  }
  if (semanticView === "genealogy") {
    return entity.type === "personaggio";
  }
  if (semanticView === "event-chain") {
    return entity.type === "evento" || entity.type === "luogo" || entity.type === "personaggio" || entity.type === "fazione";
  }
  return entity.type === "fazione" || entity.type === "personaggio" || entity.type === "luogo";
}

export function buildSemanticScope(
  semanticView: SemanticViewId,
  entities: Entity[],
  relations: Relation[],
  selectedEntityId: string
) {
  if (semanticView === "default") {
    return { entities, relations };
  }

  const scopedRelations = relations.filter((relation) =>
    relationMatchesSemanticView(relation, semanticView)
  );
  const scopedIds = new Set<string>();

  scopedRelations.forEach((relation) => {
    scopedIds.add(relation.fromEntityId);
    scopedIds.add(relation.toEntityId);
  });

  if (selectedEntityId) {
    scopedIds.add(selectedEntityId);
  }

  const scopedEntities = entities.filter(
    (entity) =>
      (entity.id === selectedEntityId || entityMatchesSemanticView(entity, semanticView)) &&
      (scopedIds.has(entity.id) || semanticView === "genealogy" || entity.id === selectedEntityId)
  );

  const validIds = new Set(scopedEntities.map((entity) => entity.id));
  return {
    entities: scopedEntities,
    relations: scopedRelations.filter(
      (relation) => validIds.has(relation.fromEntityId) && validIds.has(relation.toEntityId)
    ),
  };
}

export function buildRelationSuggestions(
  rules: RelationAutomationRule[],
  entities: Entity[],
  relations: Relation[]
): RelationSuggestion[] {
  const existingSignatures = new Set(
    relations.map((relation) =>
      [
        relation.fromEntityId,
        relation.toEntityId,
        normalizeRelationType(relation.type),
        normalizeOptionalRelationType(relation.inverseType) ?? "",
      ].join("::")
    )
  );

  const suggestions: RelationSuggestion[] = [];

  rules.forEach((rule) => {
    if (!rule.enabled) return;
    const sourceKey = rule.sourceMetadataKey.trim();
    const targetKey = rule.targetMetadataKey.trim();
    const relationType = normalizeRelationType(rule.relationType);
    if (!sourceKey || !targetKey || !relationType) return;

    const sourceEntities = entities.filter(
      (entity) => rule.sourceEntityType === "all" || entity.type === rule.sourceEntityType
    );
    const targetEntities = entities.filter(
      (entity) => rule.targetEntityType === "all" || entity.type === rule.targetEntityType
    );

    sourceEntities.forEach((sourceEntity) => {
      const sourceValue = normalizeMetadataValue(sourceEntity.metadata?.[sourceKey] ?? "");
      if (!sourceValue) return;

      targetEntities.forEach((targetEntity) => {
        if (sourceEntity.id === targetEntity.id) return;

        const targetValue = normalizeMetadataValue(targetEntity.metadata?.[targetKey] ?? "");
        if (!targetValue || sourceValue.toLowerCase() !== targetValue.toLowerCase()) return;

        const signature = [
          sourceEntity.id,
          targetEntity.id,
          relationType,
          normalizeOptionalRelationType(rule.inverseType) ?? "",
        ].join("::");

        if (existingSignatures.has(signature)) return;

        suggestions.push({
          ruleId: rule.id,
          sourceEntity,
          targetEntity,
          relationType,
          inverseType: normalizeOptionalRelationType(rule.inverseType),
          reason: `${rule.label}: ${sourceKey}="${sourceValue}" corrisponde a ${targetKey}.`,
        });
      });
    });
  });

  return suggestions;
}

export function buildNarrativePackageScope(params: {
  packageType: "region" | "storyline" | "faction" | "cast";
  seedEntity: Entity;
  entities: Entity[];
  relations: Relation[];
}) {
  const selectedIds = new Set<string>([params.seedEntity.id]);
  const normalizedSeedName = normalizeEntityName(params.seedEntity.name).toLowerCase();

  params.entities.forEach((entity) => {
    const metadataValues = Object.values(entity.metadata ?? {}).map((value) =>
      normalizeMetadataValue(value).toLowerCase()
    );
    const normalizedTags = entity.tags.map((tag) => normalizeTag(tag));

    if (params.packageType === "region") {
      const seedRegion = normalizeMetadataValue(
        params.seedEntity.metadata?.regione ?? params.seedEntity.name
      ).toLowerCase();
      if (
        entity.id === params.seedEntity.id ||
        metadataValues.includes(seedRegion) ||
        normalizedTags.includes(seedRegion)
      ) {
        selectedIds.add(entity.id);
      }
    }

    if (params.packageType === "storyline") {
      if (
        normalizedTags.some((tag) => tag.includes(normalizedSeedName)) ||
        metadataValues.some((value) => value.includes(normalizedSeedName))
      ) {
        selectedIds.add(entity.id);
      }
    }

    if (params.packageType === "faction") {
      if (
        entity.id === params.seedEntity.id ||
        metadataValues.includes(normalizedSeedName) ||
        params.relations.some(
          (relation) =>
            (relation.fromEntityId === params.seedEntity.id && relation.toEntityId === entity.id) ||
            (relation.toEntityId === params.seedEntity.id && relation.fromEntityId === entity.id)
        )
      ) {
        selectedIds.add(entity.id);
      }
    }

    if (params.packageType === "cast") {
      if (
        entity.id === params.seedEntity.id ||
        (entity.type === "personaggio" &&
          params.relations.some(
            (relation) =>
              (relation.fromEntityId === params.seedEntity.id && relation.toEntityId === entity.id) ||
              (relation.toEntityId === params.seedEntity.id && relation.fromEntityId === entity.id)
          ))
      ) {
        selectedIds.add(entity.id);
      }
    }
  });

  params.relations.forEach((relation) => {
    if (selectedIds.has(relation.fromEntityId) || selectedIds.has(relation.toEntityId)) {
      selectedIds.add(relation.fromEntityId);
      selectedIds.add(relation.toEntityId);
    }
  });

  return {
    entities: params.entities.filter((entity) => selectedIds.has(entity.id)),
    relations: params.relations.filter(
      (relation) => selectedIds.has(relation.fromEntityId) && selectedIds.has(relation.toEntityId)
    ),
  };
}

export function classifyImportEntities(currentEntities: Entity[], importedEntities: Entity[]): ImportEntityReview[] {
  const currentEntitiesById = new Map(currentEntities.map((entity) => [entity.id, entity] as const));
  const currentEntitiesByName = new Map<string, Entity>(
    currentEntities.map((entity) => [
      `${entity.type}::${normalizeEntityName(entity.name).toLowerCase()}`,
      entity,
    ] as const)
  );

  return importedEntities.map((importedEntity) => {
    const normalizedNameKey = `${importedEntity.type}::${normalizeEntityName(importedEntity.name).toLowerCase()}`;
    const sameById = currentEntitiesById.get(importedEntity.id);
    const sameByName = currentEntitiesByName.get(normalizedNameKey);

    if (sameById && sameByName && sameById.id !== sameByName.id) {
      return {
        importedEntity,
        status: "conflict",
        matchedEntity: sameByName,
        reason: `L'id corrisponde a "${sameById.name}" ma il nome collide con "${sameByName.name}". Verrà importata come nuova entità sicura.`,
      };
    }

    const matchedEntity = sameById ?? sameByName;
    if (!matchedEntity) {
      return {
        importedEntity,
        status: "new",
        reason: "Nessun match esistente per id o nome sullo stesso tipo.",
      };
    }

    if (
      sameById &&
      (sameById.type !== importedEntity.type ||
        normalizeEntityName(sameById.name).toLowerCase() !==
          normalizeEntityName(importedEntity.name).toLowerCase())
    ) {
      return {
        importedEntity,
        status: "conflict",
        matchedEntity: sameById,
        reason: `L'id esiste già ma identifica "${sameById.name}" con un'identità diversa.`,
      };
    }

    if (areEntitiesEquivalent(importedEntity, matchedEntity)) {
      return {
        importedEntity,
        status: "duplicate",
        matchedEntity,
        reason: "Entità già presente con stessi contenuti principali.",
      };
    }

    return {
      importedEntity,
      status: "probable-match",
      matchedEntity,
      reason: `Match compatibile con "${matchedEntity.name}" sullo stesso tipo: verranno uniti i dati mancanti senza creare duplicati.`,
    };
  });
}

export function buildDefaultGraphTypeFilters(entityTypes: EntityTypeDefinition[]) {
  const next: Record<string, boolean> = {};
  entityTypes.forEach((item) => {
    next[item.id] = true;
  });
  return next;
}

export function mergeEntityTypesForImport(
  currentTypes: EntityTypeDefinition[],
  importedTypes: EntityTypeDefinition[]
) {
  const map = new Map<string, EntityTypeDefinition>();

  currentTypes.forEach((type) => {
    map.set(type.id, type);
  });

  importedTypes.forEach((type) => {
    const existing = map.get(type.id);

    if (!existing) {
      map.set(type.id, type);
      return;
    }

    const existingFields = existing.fields ?? [];
    const importedFields = type.fields ?? [];

    const fieldMap = new Map<string, MetadataFieldDefinition>();
    existingFields.forEach((field) => fieldMap.set(field.key, field));
    importedFields.forEach((field) => {
      if (!fieldMap.has(field.key)) {
        fieldMap.set(field.key, field);
      }
    });

    map.set(type.id, {
      ...existing,
      label: existing.label || type.label,
      color: existing.color || type.color,
      builtIn: existing.builtIn || type.builtIn,
      fields: Array.from(fieldMap.values()),
    });
  });

  return Array.from(map.values());
}
