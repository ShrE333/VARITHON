/** Shared types for the Palki live-location feature. */

export type PingSource = 'gps' | 'checkpoint' | 'schedule';

/** A ground-truth observation from a GPS device or a marshal's phone. */
export interface Ping {
  /** Device clock. Authoritative for ordering — the phone may have been offline for hours. */
  tsDevice: string;
  lat: number;
  lng: number;
  source: PingSource;
  reporterId?: string;
  isSimulated: boolean;
}

/** The estimator's belief about the Palki, at one instant. */
export interface PalkiState {
  /** Arc length along the route, km. */
  sKm: number;
  /** Current effective walking speed, km/h. */
  vKmph: number;
  /**
   * Speed bias: how fast they are actually walking relative to what the
   * schedule expects. 1.0 is on-plan; 0.85 is "15% slower today". This is
   * the term that carries a slowdown forward into every future horizon.
   */
  beta: number;
  /** Positional uncertainty at the moment of the last fix, km. */
  sigmaKm: number;
  /** Timestamp of the state, ISO 8601. */
  ts: string;
  /** What produced the last correction. */
  source: PingSource;
  /** Recent (s_actual - s_predicted) residuals, km. Drives sigma. */
  residuals: number[];
  isSimulated: boolean;
}

export interface ForecastRow {
  /** ISO timestamp of this step. */
  t: string;
  sKm: number;
  sigmaKm: number;
}

export interface Landmark {
  name: string;
  name_mr: string;
  s_km: number;
}

/** A landmark with a predicted arrival time. */
export interface LandmarkEta extends Landmark {
  /** ISO timestamp, or null when even the extended horizon does not reach it. */
  eta: string | null;
  /**
   * True when this ETA lies beyond the packet's 8-hour forecast window.
   *
   * Mukkam halts sit ~20 km apart while eight hours of walking covers ~12,
   * so capping ETAs at the forecast horizon would leave the next village
   * permanently blank — the one number a pilgrim most wants. We look further
   * ahead, and flag it, because an ETA 14 hours out carries several km of
   * uncertainty and must not be shown with the same confidence as one an
   * hour away.
   */
  beyondForecast: boolean;
}

/**
 * The offline forecast packet. This is the whole feature's payload: the
 * server sends a timeline, not a location, so a phone with no signal can
 * keep answering "where is the Palki now?" from cache.
 */
export interface Packet {
  schema: 1;
  routeId: string;
  routeVersion: number;
  syncedAt: string;
  validUntil: string;
  confidenceDecayKmph: number;
  current: {
    sKm: number;
    sigmaKm: number;
    source: PingSource;
    /** When the underlying observation was taken (not when the packet was built). */
    observedAt: string;
  };
  forecast: ForecastRow[];
  landmarks: LandmarkEta[];
}

/** One scored prediction, for the accuracy panel. */
export interface ForecastScore {
  horizonMin: number;
  predictedSKm: number;
  actualSKm: number;
  errorKm: number;
  issuedAt: string;
  scoredAt: string;
}
