import { ENTITY_TYPE_OPTIONS } from "../config";
import type { Entity, EntityMetadata, EntityType } from "../types";

type CreateEntityInput = {
  type: EntityType;
  name: string;
  shortDescription: string;
};

export type MetadataFieldDefinition = {
  key: string;
  label: string;
  placeholder?: string;
};

export type RelationPreset = {
  type: string;
  inverseType?: string;
};

export const metadataFieldsByType: Record<
  EntityType,
  MetadataFieldDefinition[]
> = {
  luogo: [
    { key: "regione", label: "Regione", placeholder: "Es. Costa orientale" },
    { key: "clima", label: "Clima", placeholder: "Es. Tropicale umido" },
    {
      key: "popolazione",
      label: "Popolazione",
      placeholder: "Es. 12.000 abitanti",
    },
    {
      key: "pericolo",
      label: "Livello di pericolo",
      placeholder: "Es. Alto",
    },
  ],
  personaggio: [
    { key: "ruolo", label: "Ruolo", placeholder: "Es. Esploratore" },
    {
      key: "allineamento",
      label: "Allineamento",
      placeholder: "Es. Neutrale buono",
    },
    {
      key: "fazione",
      label: "Fazione",
      placeholder: "Es. Clan della Laguna",
    },
    { key: "status", label: "Status", placeholder: "Es. Vivo / disperso" },
  ],
  fazione: [
    { key: "leader", label: "Leader", placeholder: "Es. Matriarca Sihra" },
    {
      key: "ideologia",
      label: "Ideologia",
      placeholder: "Es. Espansione rituale",
    },
    {
      key: "territorio",
      label: "Territorio",
      placeholder: "Es. Paludi del sud",
    },
    {
      key: "risorse",
      label: "Risorse",
      placeholder: "Es. Ambra, sale, bestie",
    },
  ],
  oggetto: [
    { key: "origine", label: "Origine", placeholder: "Es. Tempio Verde" },
    { key: "materiale", label: "Materiale", placeholder: "Es. Ossidiana" },
    {
      key: "potere",
      label: "Potere",
      placeholder: "Es. Visioni profetiche",
    },
    { key: "stato", label: "Stato", placeholder: "Es. Integro / spezzato" },
  ],
  evento: [
    { key: "anno", label: "Anno", placeholder: "Es. -1200 oppure 432" },
    {
      key: "epoca",
      label: "Epoca",
      placeholder: "Es. Prima Era, Età dei Rettili",
    },
    {
      key: "ordineCronologico",
      label: "Ordine cronologico",
      placeholder: "Es. 10, 20, 30",
    },
    {
      key: "stato",
      label: "Stato temporale",
      placeholder: "Es. antico, recente, in corso, profetizzato",
    },
  ],
};

export const RELATION_PRESETS: readonly RelationPreset[] = [
  { type: "membro di", inverseType: "include" },
  { type: "alleato di", inverseType: "alleato di" },
  { type: "nemico di", inverseType: "nemico di" },
  { type: "controlla", inverseType: "è controllato da" },
  { type: "vive in", inverseType: "ospita" },
  { type: "si trova in", inverseType: "contiene" },
  { type: "possiede", inverseType: "appartiene a" },
  { type: "ha causato", inverseType: "è stato causato da" },
  { type: "ha distrutto", inverseType: "è stato distrutto da" },
  { type: "discende da", inverseType: "ha come discendente" },
] as const;

const RELATION_INVERSES: Record<string, string> = Object.fromEntries(
  RELATION_PRESETS
    .filter((preset) => preset.inverseType)
    .map((preset) => [preset.type, preset.inverseType as string])
);

export function normalizeEntityName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase().replace(/\s+/g, " ");
}

export function normalizeRelationType(type: string): string {
  return type.trim().toLowerCase().replace(/\s+/g, " ");
}

export function normalizeOptionalRelationType(type?: string): string | undefined {
  if (typeof type !== "string") return undefined;

  const normalized = normalizeRelationType(type);
  return normalized || undefined;
}

export function getSuggestedInverseRelationType(type: string): string {
  const normalized = normalizeRelationType(type);
  return RELATION_INVERSES[normalized] ?? "";
}

export function getRelationTypeForPerspective(
  type: string,
  inverseType: string | undefined,
  direction: "outgoing" | "incoming"
): string {
  const normalizedType = normalizeRelationType(type);
  const normalizedInverse = normalizeOptionalRelationType(inverseType);

  if (direction === "outgoing") {
    return normalizedType;
  }

  return normalizedInverse ?? normalizedType;
}

export function normalizeMetadata(
  metadata: EntityMetadata | undefined
): EntityMetadata {
  if (!metadata) return {};

  const entries = Object.entries(metadata)
    .map(([key, value]) => [key.trim(), normalizeText(value)] as const)
    .filter(([key, value]) => key && value);

  return Object.fromEntries(entries);
}

export function getDefaultMetadata(type: EntityType): EntityMetadata {
  return Object.fromEntries(
    metadataFieldsByType[type].map((field) => [field.key, ""])
  );
}

export function remapMetadataForType(
  previousMetadata: EntityMetadata | undefined,
  nextType: EntityType
): EntityMetadata {
  const normalizedPrevious = normalizeMetadata(previousMetadata);
  const nextFields = metadataFieldsByType[nextType];

  return Object.fromEntries(
    nextFields.map((field) => [field.key, normalizedPrevious[field.key] ?? ""])
  );
}

export function hasDuplicateEntityName(
  entities: Entity[],
  type: EntityType,
  name: string,
  excludeEntityId?: string
): boolean {
  const normalizedName = normalizeEntityName(name).toLowerCase();

  return entities.some((entity) => {
    if (excludeEntityId !== undefined && entity.id === excludeEntityId) {
      return false;
    }

    return (
      entity.type === type &&
      normalizeEntityName(entity.name).toLowerCase() === normalizedName
    );
  });
}

export function createEntity(
  _entities: Entity[],
  input: CreateEntityInput
): Entity {
  const normalizedName = normalizeEntityName(input.name);
  const normalizedDescription = normalizeText(input.shortDescription);
  const nowIso = new Date().toISOString();
  const nowNum = Date.now();

  return {
    id: crypto.randomUUID(),
    type: input.type,
    name: normalizedName || "Senza nome",
    shortDescription: normalizedDescription,
    notes: "",
    tags: [],
    metadata: getDefaultMetadata(input.type),
    createdAt: nowIso,
    updatedAt: nowIso,
    lastModified: nowNum,
  };
}

export function getEntityTypeLabel(type: EntityType): string {
  return (
    ENTITY_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type
  );
}

export function getTypeColor(type: EntityType): string {
  switch (type) {
    case "luogo":
      return "#059669";
    case "personaggio":
      return "#2563eb";
    case "fazione":
      return "#7c3aed";
    case "oggetto":
      return "#d97706";
    case "evento":
      return "#dc2626";
    default:
      return "#374151";
  }
}

export function getTypeIconGlyph(type: EntityType): string {
  switch (type) {
    case "luogo":
      return "▲";
    case "personaggio":
      return "●";
    case "fazione":
      return "◆";
    case "oggetto":
      return "■";
    case "evento":
      return "✦";
    default:
      return "•";
  }
}