export type AccentColor =
  | "brightPink" | "brightTeal" | "brightBlue" | "vividOrange" | "brightPurple" | "brightGreen" | "creamyWhite"
  | "deepPink" | "smokyTeal" | "deepBlue" | "mutedOrange" | "smokyPurple" | "mutedGreen" | "darkGrey";

export const ACCENT_COLORS: Record<AccentColor, { label: string; hex: string }> = {
  brightPink:   { label: "Bright Deep Pink",    hex: "#e27694" },
  brightTeal:   { label: "Bright Teal Green",   hex: "#4fd0b1" },
  brightBlue:   { label: "Bright Sapphire Blue",hex: "#3a78c5" },
  vividOrange:  { label: "Vivid Orange",         hex: "#e25b2d" },
  brightPurple: { label: "Bright Purple",        hex: "#bb9af7" },
  brightGreen:  { label: "Bright Green",         hex: "#9ece6a" },
  creamyWhite:  { label: "Creamy White",         hex: "#e9e1ce" },
  deepPink:     { label: "Deep Deep Pink",       hex: "#a33e56" },
  smokyTeal:    { label: "Smoky Teal Green",     hex: "#2a7061" },
  deepBlue:     { label: "Deep Sapphire Blue",   hex: "#1f4370" },
  mutedOrange:  { label: "Muted Vivid Orange",   hex: "#a66b40" },
  smokyPurple:  { label: "Smoky Purple",         hex: "#6544a4" },
  mutedGreen:   { label: "Muted Green",          hex: "#4a6038" },
  darkGrey:     { label: "Dark Grey",            hex: "#4d4d4d" },
};

export interface Section {
  id: string;
  label: string;
  startNum: number;
  endNum: number;
  statuses: Record<number, "read">;
  mode?: "number" | "text";
  items?: string[];
}

export interface Work {
  id: string;
  title: string;
  accentColor: AccentColor;
  labelUnread: string;
  labelRead: string;
  unit: string;
  sectionLabel?: string;
  sections: Section[];
  tags?: string[];
  completed?: boolean;
  updatedAt: number;
}

export interface Folder {
  id: string;
  title: string;
  accentColor: AccentColor;
  type?: "progress" | "read";
  defaultLabelUnread?: string;
  defaultLabelRead?: string;
  defaultUnit?: string;
  works: Work[];
  updatedAt: number;
}
