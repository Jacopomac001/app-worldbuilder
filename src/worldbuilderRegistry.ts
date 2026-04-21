import type { RelationAutomationRule, SemanticViewId } from "./types";

export const WORLD_DATA_VERSION = 2;

export const SEMANTIC_VIEW_REGISTRY: Array<{
  id: SemanticViewId;
  label: string;
  description: string;
}> = [
  {
    id: "default",
    label: "Vista libera",
    description: "Tutto il mondo con i filtri correnti.",
  },
  {
    id: "political-map",
    label: "Mappa politica",
    description: "Territori, fazioni, leader e rapporti di controllo o alleanza.",
  },
  {
    id: "genealogy",
    label: "Genealogia",
    description: "Casate, parentele, coniugi e linee di discendenza.",
  },
  {
    id: "event-chain",
    label: "Catena eventi",
    description: "Eventi, cause, conseguenze e luoghi collegati alla cronologia.",
  },
  {
    id: "faction-network",
    label: "Rete fazioni",
    description: "Fazioni, membri chiave, risorse, territori e attriti.",
  },
];

export const DEFAULT_RELATION_AUTOMATION_RULES: RelationAutomationRule[] = [
  {
    id: "auto-shared-region",
    label: "Co-presenza regionale",
    enabled: true,
    sourceEntityType: "all",
    sourceMetadataKey: "regione",
    targetEntityType: "all",
    targetMetadataKey: "regione",
    relationType: "co-esiste in",
    inverseType: "co-esiste in",
    mode: "suggest",
  },
  {
    id: "auto-shared-family",
    label: "Legame di casata",
    enabled: true,
    sourceEntityType: "personaggio",
    sourceMetadataKey: "famiglia",
    targetEntityType: "personaggio",
    targetMetadataKey: "famiglia",
    relationType: "appartiene alla casata di",
    inverseType: "appartiene alla casata di",
    mode: "suggest",
  },
  {
    id: "auto-shared-epoch",
    label: "Contemporaneità di epoca",
    enabled: true,
    sourceEntityType: "evento",
    sourceMetadataKey: "epoca",
    targetEntityType: "evento",
    targetMetadataKey: "epoca",
    relationType: "coincide con",
    inverseType: "coincide con",
    mode: "suggest",
  },
];

export const SEMANTIC_RELATION_HINTS = {
  political: ["controlla", "membro di", "alleato di", "nemico di", "ha come leader", "abita in"],
  genealogy: ["figlio", "padre", "madre", "coniuge", "discende", "casata", "famiglia"],
  events: ["ha causato", "causa", "si svolge in", "proviene da", "ha distrutto", "è stato causato da"],
  factions: ["alleato di", "nemico di", "membro di", "ha come leader", "controlla", "include"],
} as const;
