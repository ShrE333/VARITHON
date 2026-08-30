import nearestPointOnLine from '@turf/nearest-point-on-line';
import distance from '@turf/distance';
import { lineString, point } from '@turf/helpers';

export const DEFAULT_PACE_KMH = 3.0;
const ON_ROUTE_THRESHOLD_M = 1500;
const MAX_ACCURACY_M = 50;
const MAX_PLAUSIBLE_SPEED_MS = 8;
const SMOOTHING_ALPHA = 0.35;

export class RouteEngine {
  constructor(bundle) {
    this.bundle = bundle;
    this.line = lineString(bundle.coordinates);
  }
  locate(lat,lng){
    const snap=nearestPointOnLine(this.line, point([lng,lat]), {units:'kilometers'});
    const chainageKm=snap.properties.location || 0;
    const offsetM=(snap.properties.dist || 0)*1000;
    const [snapLng,snapLat]=snap.geometry.coordinates;
    return {chainageKm,offsetM,onRoute:offsetM<=ON_ROUTE_THRESHOLD_M,snapped:{lat:snapLat,lng:snapLng}};
  }
  distanceToTemple(lat,lng){
    const position=this.locate(lat,lng);
    const directKm=distance(point([lng,lat]),point([this.bundle.destination.lng,this.bundle.destination.lat]),{units:'kilometers'});
    const remainingKm=Math.max(0,this.bundle.totalKm-position.chainageKm);
    const joinKm=position.onRoute?0:position.offsetM/1000;
    return {position,routeKm:remainingKm+joinKm,directKm,joinKm,etaHours:(remainingKm+joinKm)/DEFAULT_PACE_KMH};
  }
  stageAt(km){return this.bundle.stages.find(s=>km>=s.startKm&&km<s.endKm)||this.bundle.stages.at(-1)||null}
  coordAt(km){
    const frac=Math.max(0,Math.min(1,km/this.bundle.totalKm));
    const i=Math.min(this.bundle.coordinates.length-1,Math.round(frac*(this.bundle.coordinates.length-1)));
    const [lng,lat]=this.bundle.coordinates[i]; return {lat,lng};
  }
}

export class LocationTracker {
  constructor(route=null){this.route=route;this.smoothed=null;this.sampleCount=0;this.watchId=null}
  accept(raw){
    if(!Number.isFinite(raw.lat)||!Number.isFinite(raw.lng)||raw.accuracy>MAX_ACCURACY_M)return null;
    if(this.smoothed){
      const dt=Math.max(1,(raw.timestamp-this.smoothed.timestamp)/1000);
      const jump=haversineMeters(this.smoothed,raw);
      const tolerance=raw.accuracy+this.smoothed.accuracy;
      if(jump-tolerance>MAX_PLAUSIBLE_SPEED_MS*dt)return null;
      const weight=SMOOTHING_ALPHA*(this.smoothed.accuracy/(this.smoothed.accuracy+raw.accuracy));
      this.smoothed={lat:this.smoothed.lat+(raw.lat-this.smoothed.lat)*weight,lng:this.smoothed.lng+(raw.lng-this.smoothed.lng)*weight,accuracy:Math.min(this.smoothed.accuracy,raw.accuracy),timestamp:raw.timestamp,speed:raw.speed??null,heading:raw.heading??null};
    } else this.smoothed={...raw};
    this.sampleCount++;
    return {fix:this.smoothed,route:this.route?this.route.locate(this.smoothed.lat,this.smoothed.lng):null,sampleCount:this.sampleCount};
  }
  start(onUpdate,onError,onReject){
    if(!navigator.geolocation) throw new Error('Geolocation unavailable');
    if(this.watchId!==null)return;
    this.watchId=navigator.geolocation.watchPosition(p=>{const raw={lat:p.coords.latitude,lng:p.coords.longitude,accuracy:p.coords.accuracy,timestamp:p.timestamp,speed:p.coords.speed,heading:p.coords.heading};const next=this.accept(raw);next?onUpdate(next):onReject?.(raw)},onError,{enableHighAccuracy:true,maximumAge:5000,timeout:15000});
  }
  stop(){if(this.watchId!==null&&navigator.geolocation){navigator.geolocation.clearWatch(this.watchId);this.watchId=null}}
}

export function haversineMeters(a,b){const R=6371000,toRad=d=>d*Math.PI/180,dLat=toRad(b.lat-a.lat),dLng=toRad(b.lng-a.lng);const h=Math.sin(dLat/2)**2+Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLng/2)**2;return 2*R*Math.asin(Math.sqrt(h))}
export function formatDistance(km){if(km<1)return `${Math.round(km*1000)} m`;if(km<10)return `${km.toFixed(1)} km`;return `${Math.round(km)} km`}
export function formatEta(km){const m=Math.round(km/DEFAULT_PACE_KMH*60);if(m<60)return `${m} min`;const h=Math.floor(m/60),r=m%60;return r?`${h} hr ${r} min`:`${h} hr`}
