import type { Entity, Relation } from "./types";

const now = Date.now();

function createPastIso(offsetMs: number) {
  return new Date(now - offsetMs).toISOString();
}

export const initialEntities: Entity[] = [
  {
    id: crypto.randomUUID(),
    type: "luogo",
    name: "Isola Primordiale",
    shortDescription: "Grande isola tropicale piena di rovine e dinosauri.",
    notes: "Cuore del mondo di campagna. Da qui parte tutto.",
    tags: ["giungla", "isola", "dinosauri"],
    metadata: {
      regione: "Arcipelago centrale",
      clima: "Tropicale",
      popolazione: "Sparsa",
      pericolo: "Molto alto",
    },
    createdAt: createPastIso(4000),
    updatedAt: createPastIso(4000),
    lastModified: now - 4000,
  },
  {
    id: crypto.randomUUID(),
    type: "fazione",
    name: "Clan della Laguna",
    shortDescription: "Tribù costiera che domina le paludi salmastre.",
    notes: "Usano rettili addestrati e venerano antichi spiriti acquatici.",
    tags: ["tribù", "costiero", "rituali"],
    metadata: {
      leader: "Matriarca Nahal",
      ideologia: "Equilibrio con gli spiriti acquatici",
      territorio: "Lagune del sud",
      risorse: "Sale, canne, rettili addestrati",
    },
    createdAt: createPastIso(3000),
    updatedAt: createPastIso(3000),
    lastModified: now - 3000,
  },
  {
    id: crypto.randomUUID(),
    type: "personaggio",
    name: "Aroth Figlio delle Ceneri",
    shortDescription: "Esploratore e cacciatore di reliquie.",
    notes: "Ha mappe proibite e conosce passaggi segreti nelle montagne.",
    tags: ["png", "guida", "esploratore"],
    metadata: {
      ruolo: "Guida",
      allineamento: "Neutrale",
      fazione: "Indipendente",
      status: "Vivo",
    },
    createdAt: createPastIso(2000),
    updatedAt: createPastIso(2000),
    lastModified: now - 2000,
  },
  {
    id: crypto.randomUUID(),
    type: "evento",
    name: "Caduta del Tempio Verde",
    shortDescription: "Un antico santuario è stato inghiottito dalla giungla.",
    notes: "Evento storico importante per la campagna.",
    tags: ["rovine", "storia", "mistero"],
    metadata: {
      anno: "-740",
      epoca: "Età delle Rovine",
      ordineCronologico: "10",
      stato: "antico",
    },
    createdAt: createPastIso(1000),
    updatedAt: createPastIso(1000),
    lastModified: now - 1000,
  },
];

export const initialRelations: Relation[] = [
  {
    id: crypto.randomUUID(),
    fromEntityId: initialEntities[2].id,
    toEntityId: initialEntities[1].id,
    type: "membro di",
    inverseType: "include",
  },
  {
    id: crypto.randomUUID(),
    fromEntityId: initialEntities[1].id,
    toEntityId: initialEntities[0].id,
    type: "controlla",
    inverseType: "è controllato da",
  },
];

export const ENTITIES_STORAGE_KEY = "worldbuilder_entities";
export const RELATIONS_STORAGE_KEY = "worldbuilder_relations";

export const NODE_WIDTH = 190;
export const NODE_HEIGHT = 70;