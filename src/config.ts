import type { EntityType } from "./types";
import type {
  FocusedGraphFilter,
  GraphViewMode,
} from "./components/GraphPanel";

export const ENTITY_TYPE_OPTIONS: Array<{
  value: EntityType;
  label: string;
}> = [
  { value: "luogo", label: "Luogo" },
  { value: "personaggio", label: "Personaggio" },
  { value: "fazione", label: "Fazione" },
  { value: "oggetto", label: "Oggetto" },
  { value: "evento", label: "Evento" },
];

export const QUICK_CREATE_OPTIONS: Array<{
  value: EntityType;
  label: string;
}> = [
  { value: "luogo", label: "+ Luogo" },
  { value: "personaggio", label: "+ Personaggio" },
  { value: "fazione", label: "+ Fazione" },
  { value: "evento", label: "+ Evento" },
];

export const ENTITY_TYPE_FILTER_OPTIONS: Array<{
  value: EntityType | "tutti";
  label: string;
}> = [
  { value: "tutti", label: "tutti" },
  { value: "luogo", label: "luogo" },
  { value: "personaggio", label: "personaggio" },
  { value: "fazione", label: "fazione" },
  { value: "oggetto", label: "oggetto" },
  { value: "evento", label: "evento" },
];

export const SORT_MODE_OPTIONS: Array<{
  value: "name-asc" | "type" | "lastModified-desc";
  label: string;
}> = [
  { value: "name-asc", label: "ordine alfabetico" },
  { value: "type", label: "per tipo" },
  { value: "lastModified-desc", label: "ultimo modificato" },
];

export const GRAPH_VIEW_MODE_OPTIONS: Array<{
  value: GraphViewMode;
  label: string;
}> = [
  { value: "focused", label: "Focused" },
  { value: "global", label: "Global" },
  { value: "type-only", label: "Type only" },
  { value: "tag-based", label: "Tag based" },
];

export const GRAPH_FOCUSED_FILTER_OPTIONS: Array<{
  value: FocusedGraphFilter;
  label: string;
}> = [
  { value: "all", label: "Tutto" },
  { value: "outgoing", label: "Solo uscite" },
  { value: "incoming", label: "Solo entrate" },
];

export const GRAPH_VIEW_TYPE_OPTIONS: Array<{
  value: "all" | EntityType;
  label: string;
}> = [
  { value: "all", label: "Tutti i tipi" },
  { value: "luogo", label: "Luoghi" },
  { value: "personaggio", label: "Personaggi" },
  { value: "fazione", label: "Fazioni" },
  { value: "oggetto", label: "Oggetti" },
  { value: "evento", label: "Eventi" },
];

export const GRAPH_TYPE_TOGGLE_OPTIONS: Array<{
  value: EntityType;
  label: string;
}> = [
  { value: "luogo", label: "Luoghi" },
  { value: "personaggio", label: "Personaggi" },
  { value: "fazione", label: "Fazioni" },
  { value: "oggetto", label: "Oggetti" },
  { value: "evento", label: "Eventi" },
];

export const GRAPH_VIEW_MODE_DESCRIPTIONS: Record<GraphViewMode, string> = {
  focused:
    "Vista centrata sull’entità selezionata, con vicini diretti e secondari.",
  global:
    "Vista completa di tutte le entità filtrate attualmente visibili nel grafo.",
  "type-only": "Mostra solo entità dello stesso tipo e le relazioni tra loro.",
  "tag-based":
    "Mostra solo entità con un tag specifico: utile per regione, tribù, storyline o arco narrativo.",
};

export const TIMELINE_STATUS_COLORS: Record<string, string> = {
  antico: "#92400e",
  recente: "#1d4ed8",
  "in corso": "#065f46",
  profetizzato: "#7c3aed",
};

export const DEFAULT_GRAPH_TYPE_FILTERS: Record<EntityType, boolean> = {
  luogo: true,
  personaggio: true,
  fazione: true,
  oggetto: true,
  evento: true,
};

export const DEFAULT_GRAPH_VIEW_TYPE: "all" | EntityType = "fazione";

export const DEFAULT_RELATION_PRESET_INDEX = 0;

export const UI_TEXT = {
  searchPlaceholder: "Cerca in nome, descrizione, note, tag...",
  newEntityNamePlaceholder: "Es. Fortezza di Rhal",
  newEntityDescriptionPlaceholder: "Es. Antica città-stato nella giungla",
  newTagPlaceholder: "Nuovo tag...",
  relationTypePlaceholder: "Relazione diretta... (es. vive in)",
  relationInversePlaceholder: "Relazione inversa opzionale... (es. ospita)",
  relationTargetPlaceholder: "Seleziona entità collegata",
  graphTagPlaceholder: "Seleziona un tag",
  selectedBadge: "Selezionata",
  duplicateSuffix: " (copia)",
} as const;