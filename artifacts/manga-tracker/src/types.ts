export type VolumeStatus = "unowned" | "owned" | "read";

export interface MangaEntry {
  id: string;
  title: string;
  totalVolumes: number;
  statuses: Record<number, VolumeStatus>;
  updatedAt: number;
}
