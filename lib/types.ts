export type BalloonPoint = {
  id: string;
  t: string;        // ISO time
  lat: number;
  lon: number;
  alt?: number | null;
};

export type BalloonTrack = {
  id: string;
  points: BalloonPoint[]; // up to 24 recent hourly snapshots
};

export type Constellation = {
  updatedAt: string;
  tracks: BalloonTrack[];
};