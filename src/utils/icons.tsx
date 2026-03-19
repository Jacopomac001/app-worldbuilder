import type { LucideIcon } from "lucide-react";
import {
  Boxes,
  CalendarRange,
  Castle,
  ChevronDown,
  ChevronUp,
  Circle,
  Clock3,
  Copy,
  FileText,
  Gem,
  Link2,
  MapPinned,
  Pencil,
  Plus,
  Search,
  Shield,
  Swords,
  Tags,
  Trash2,
  Users,
} from "lucide-react";
import type { EntityType } from "../types";

/* -------------------------------------------------------------------------- */
/*                             ICONE PER TIPO ENTITÀ                          */
/* -------------------------------------------------------------------------- */

export const entityTypeIcons: Record<EntityType, LucideIcon> = {
  luogo: MapPinned,
  personaggio: Users,
  fazione: Shield,
  oggetto: Gem,
  evento: CalendarRange,
};

/* -------------------------------------------------------------------------- */
/*                                ICONE UI                                    */
/* -------------------------------------------------------------------------- */

export const uiIcons = {
  archive: Boxes,
  newEntity: Plus,
  search: Search,
  timeline: Clock3,
  relations: Link2,
  notes: FileText,
  tags: Tags,
  duplicate: Copy,
  delete: Trash2,
  edit: Pencil,
  sectionOpen: ChevronUp,
  sectionClosed: ChevronDown,
  settlement: Castle,
  conflict: Swords,

  // ⭐ AGGIUNTA IMPORTANTE
  // Usata nella GraphView per i nodi
  node: Circle,
} as const;

/* -------------------------------------------------------------------------- */
/*                             FUNZIONI UTILI                                 */
/* -------------------------------------------------------------------------- */

export function getEntityTypeIcon(type: EntityType): LucideIcon {
  return entityTypeIcons[type];
}