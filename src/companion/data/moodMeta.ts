import {
  Sun,
  Smile,
  Flame,
  CloudRain,
  AlertCircle,
  BatteryLow,
  type LucideIcon,
} from "lucide-react";
import type { MoodType } from "../types";

export interface MoodMeta {
  id: MoodType;
  label: string;
  icon: LucideIcon;
  // Couleur douce par état émotionnel — utilisée dans les graphiques et
  // l'historique (transforme les données en paysage émotionnel coloré).
  color: string;
}

export const MOOD_META: Record<MoodType, MoodMeta> = {
  serene: { id: "serene", label: "Sereine", icon: Sun, color: "#5EEAD4" },
  joyful: { id: "joyful", label: "Joyeuse", icon: Smile, color: "#FBBF24" },
  irritable: {
    id: "irritable",
    label: "Irritable",
    icon: Flame,
    color: "#FF8A65",
  },
  sad: { id: "sad", label: "Triste", icon: CloudRain, color: "#94A3B8" },
  anxious: {
    id: "anxious",
    label: "Anxieuse",
    icon: AlertCircle,
    color: "#B4A7D6",
  },
  tired: {
    id: "tired",
    label: "Fatiguée",
    icon: BatteryLow,
    color: "#C99A7A",
  },
};

export const MOOD_LIST: MoodMeta[] = Object.values(MOOD_META);
