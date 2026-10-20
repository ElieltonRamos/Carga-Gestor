export type ProgressStatus = 'pending' | 'partial' | 'complete';

export interface VolumeCounts {
  totalVolumes?: number;
  loadedVolumes?: number;
}

export function computeVolumeProgress({ totalVolumes, loadedVolumes }: VolumeCounts) {
  const total = totalVolumes ?? 0;
  const loaded = loadedVolumes ?? 0;
  const status: ProgressStatus =
    total > 0 && loaded >= total ? 'complete' : loaded > 0 ? 'partial' : 'pending';
  const percentage = total > 0 ? Math.round((loaded / total) * 100) : 0;
  return { status, percentage, total, loaded };
}
