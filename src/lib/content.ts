import locationsData from "../content/locations.json";
import metaData from "../content/meta.json";

export interface Trainer {
  class: string;
  name: string;
  sprite: string;
  team: { dex: number; species: string; level: number }[];
}

export interface DialogueLine {
  text: string;
  who: string;
  sprite: string | null; // public/content-relative speaker sprite
  verified: boolean;
}

export interface Loc {
  id: string;
  pack: string;
  name: string;
  class: string;
  terrain: string[];
  encounters: { id: number; name: string }[];
  trainers: Trainer[];
  noteType: "mapdesc" | "slogan" | "trainer" | null;
  dialogue: DialogueLine | null;
  slogan: string | null;
  mapdesc: string | null;
  screenshot: string | null;
  imageCredit: string | null;
  themeYoutubeId: string | null;
  rects: [number, number, number, number][];
  center: [number, number];
}

export interface PackMeta {
  id: string;
  name: string;
  grid: { cols: number; rows: number; tilePx: number };
  spriteDir: string;
}

/** Era-correct Pokémon sprite URL path for a location's pack. */
export function spritePath(loc: Loc, id: number): string {
  const dir = packById.get(loc.pack)?.spriteDir;
  return dir ? `content/sprites/${dir}/${id}.png` : `content/sprites/${id}.png`;
}

export const LOCATIONS = locationsData as unknown as Loc[];
export const byId = new Map(LOCATIONS.map((l) => [l.id, l]));
export const META = metaData as {
  packs: PackMeta[];
  attribution: Record<string, string>;
};
export const packById = new Map(META.packs.map((p) => [p.id, p]));

export function titleCase(name: string): string {
  return name
    .split("-")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}
