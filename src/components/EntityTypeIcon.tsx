import type { LucideProps } from "lucide-react";
import { Circle, CalendarRange, Gem, MapPinned, Shield, Users } from "lucide-react";
import type { EntityType } from "../types";

type EntityTypeIconProps = {
  type: EntityType;
} & LucideProps;

export default function EntityTypeIcon({
  type,
  ...props
}: EntityTypeIconProps) {
  switch (type) {
    case "luogo":
      return <MapPinned {...props} />;
    case "personaggio":
      return <Users {...props} />;
    case "fazione":
      return <Shield {...props} />;
    case "oggetto":
      return <Gem {...props} />;
    case "evento":
      return <CalendarRange {...props} />;
    default:
      return <Circle {...props} />;
  }
}
