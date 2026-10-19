import React from "react";
import { ActivityIcon, BriefcaseIcon, CompassIcon, LayersIcon, LightbulbIcon, UsersIcon, BoxIcon } from "lucide-react";
import { SphereId } from "../types";
const icons: Partial<Record<SphereId, BoxIcon>> = {
  faith: CompassIcon,
  rizq: BriefcaseIcon,
  health: ActivityIcon,
  family: UsersIcon,
  ideas: LightbulbIcon,
  other: LayersIcon
};
interface SphereIconProps {
  id: SphereId;
  color?: string;
  className?: string;
}
export function SphereIcon({
  id,
  color,
  className = 'h-4 w-4'
}: SphereIconProps) {
  const Icon = icons[id] ?? LayersIcon;
  return <Icon className={className} style={{
    color
  }} strokeWidth={1.9} aria-hidden="true" />;
}