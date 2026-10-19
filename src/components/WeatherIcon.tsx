import React from "react";
import { CloudDrizzleIcon, CloudFogIcon, CloudIcon, CloudLightningIcon, CloudRainIcon, CloudSnowIcon, CloudSunIcon, MoonIcon, SunIcon, BoxIcon } from "lucide-react";
import { WeatherIconKey } from "../utils/live";
const icons: Record<WeatherIconKey, BoxIcon> = {
  sun: SunIcon,
  moon: MoonIcon,
  cloudSun: CloudSunIcon,
  cloud: CloudIcon,
  fog: CloudFogIcon,
  drizzle: CloudDrizzleIcon,
  rain: CloudRainIcon,
  snow: CloudSnowIcon,
  lightning: CloudLightningIcon
};
export function WeatherIcon({
  icon,
  className



}: {icon: WeatherIconKey;className?: string;}) {
  const Icon = icons[icon];
  return <Icon className={className} strokeWidth={2} aria-hidden="true" />;
}