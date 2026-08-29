export type FacilityKind =
  | 'hospital'
  | 'phc'
  | 'pharmacy'
  | 'health_camp'
  | 'refreshment_camp'
  | 'rest_stop'
  | 'night_stay'
  | 'hotel';

export type FacilityStatus = 'open' | 'full' | 'closed';

/** Category buttons in the pilgrim UI map to groups of kinds. */
export const KIND_GROUPS: Record<string, FacilityKind[]> = {
  medical: ['health_camp', 'hospital', 'phc', 'pharmacy'],
  food: ['refreshment_camp'],
  rest: ['rest_stop'],
  stay: ['night_stay', 'hotel'],
};

export interface Facility {
  id: string;
  kind: FacilityKind;
  name: string;
  lat: number;
  lng: number;
  /** Distance from route start, in km. Precomputed server-side. */
  chainageKm: number;
  /** Perpendicular distance from the route line, in metres. */
  offsetM: number;
  status: FacilityStatus;
  contactPhone?: string;
  capacity?: number;
  amenities?: Record<string, unknown>;
}

/** A facility annotated with its position relative to the pilgrim. */
export interface NearestResult extends Facility {
  /** Along-route distance from the pilgrim, in km. Negative = behind. */
  alongKm: number;
  /** alongKm plus the walk off the road to reach it, in km. */
  totalWalkKm: number;
  /** Rough walking time in minutes at the configured pace. */
  etaMinutes: number;
  isAhead: boolean;
}

export interface RouteStage {
  dayNumber: number;
  stageDate?: string;
  fromPlace: string;
  toPlace: string;
  startKm: number;
  endKm: number;
}

export interface RouteBundle {
  id: string;
  slug: string;
  name: string;
  /** GeoJSON LineString coordinates, [lng, lat] pairs. */
  coordinates: [number, number][];
  totalKm: number;
  startName: string;
  endName: string;
  destination: { lat: number; lng: number };
  stages: RouteStage[];
}

/** Result of projecting a raw GPS fix onto the route. */
export interface RoutePosition {
  chainageKm: number;
  offsetM: number;
  /** True when the pilgrim is close enough that chainage is meaningful. */
  onRoute: boolean;
  /** The snapped point on the route line. */
  snapped: { lat: number; lng: number };
}

export interface LocationFix {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
  speed?: number | null;
  heading?: number | null;
}
