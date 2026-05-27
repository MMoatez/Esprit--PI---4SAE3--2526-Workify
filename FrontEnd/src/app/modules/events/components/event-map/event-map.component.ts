import {
  Component, Input, OnDestroy,
  AfterViewInit, ElementRef, ViewChild, OnChanges, SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';

// Fix default Leaflet marker icons (broken in Angular builds)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

@Component({
  selector: 'app-event-map',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="map-wrapper">

      <!-- No coordinates fallback -->
      <div class="no-coords" *ngIf="!latitude || !longitude">
        <p>📍 Lieu : <strong>{{ locationName }}</strong></p>
        <p class="no-coords-hint">Les coordonnées GPS ne sont pas encore disponibles pour cet événement.</p>
        <div class="open-maps-links">
          <a [href]="googleMapsSearchUrl" target="_blank" class="btn-external">🗺️ Voir sur Google Maps</a>
        </div>
      </div>

      <!-- Map + controls (only when coords available) -->
      <ng-container *ngIf="latitude && longitude">
        <div #mapContainer class="map-container"></div>

        <div class="map-controls" *ngIf="showRoute">
          <button class="btn-locate" (click)="locateUser()" [disabled]="locating">
            {{ locating ? '⏳ Localisation...' : '📍 Ma position' }}
          </button>
          <button class="btn-route" (click)="showRouteToEvent()" [disabled]="!userLat || !userLng || routing" *ngIf="userLat">
            {{ routing ? '⏳ Calcul...' : '🧭 Itinéraire' }}
          </button>
        </div>

        <div class="route-info" *ngIf="routeInfo">
          <div class="route-cards">
            <div class="route-card" *ngFor="let mode of routeModes" (click)="selectMode(mode.key)"
                 [class.active]="selectedMode === mode.key">
              <span class="mode-icon">{{ mode.icon }}</span>
              <span class="mode-label">{{ mode.label }}</span>
              <span class="mode-time" *ngIf="routeInfo[mode.key]">{{ routeInfo[mode.key].duration }}</span>
              <span class="mode-dist" *ngIf="routeInfo[mode.key]">{{ routeInfo[mode.key].distance }}</span>
            </div>
          </div>
          <div class="open-maps-links">
            <a [href]="googleMapsUrl" target="_blank" class="btn-external">🗺️ Google Maps</a>
            <a [href]="osmUrl" target="_blank" class="btn-external">🌍 OpenStreetMap</a>
          </div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .map-wrapper { display: flex; flex-direction: column; gap: 12px; }
    .map-container { height: 360px; width: 100%; border-radius: 12px; overflow: hidden;
      box-shadow: 0 4px 16px rgba(0,0,0,0.12); border: 1px solid #e5e7eb; }
    .map-controls { display: flex; gap: 10px; }
    .btn-locate, .btn-route { padding: 8px 18px; border-radius: 8px; border: none; cursor: pointer;
      font-weight: 600; font-size: 14px; transition: all .2s; }
    .btn-locate { background: #3b82f6; color: #fff; }
    .btn-locate:hover:not(:disabled) { background: #2563eb; }
    .btn-route { background: #10b981; color: #fff; }
    .btn-route:hover:not(:disabled) { background: #059669; }
    button:disabled { opacity: .55; cursor: not-allowed; }
    .route-info { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; }
    .route-cards { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; }
    .route-card { display: flex; flex-direction: column; align-items: center; padding: 10px 16px;
      border: 2px solid #e2e8f0; border-radius: 10px; cursor: pointer; transition: all .2s;
      min-width: 80px; background: #fff; }
    .route-card.active { border-color: #3b82f6; background: #eff6ff; }
    .mode-icon { font-size: 22px; }
    .mode-label { font-size: 12px; color: #64748b; }
    .mode-time { font-weight: 700; font-size: 14px; color: #1e293b; }
    .mode-dist { font-size: 12px; color: #94a3b8; }
    .open-maps-links { display: flex; gap: 10px; flex-wrap: wrap; }
    .btn-external { display: inline-block; padding: 8px 14px; border-radius: 8px;
      background: #f1f5f9; color: #334155; text-decoration: none; font-size: 13px;
      font-weight: 600; border: 1px solid #cbd5e1; transition: all .2s; }
    .btn-external:hover { background: #e2e8f0; }
    .no-coords { background: #fefce8; border: 1px solid #fde68a; border-radius: 10px;
      padding: 14px; color: #92400e; }
  `]
})
export class EventMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLDivElement>;

  @Input() latitude?: number;
  @Input() longitude?: number;
  @Input() locationName = '';
  @Input() showRoute = false;

  private map?: L.Map;
  private eventMarker?: L.Marker;
  private userMarker?: L.Marker;
  private routeLayer?: L.Polyline;

  userLat?: number;
  userLng?: number;
  locating = false;
  routing = false;
  selectedMode = 'driving';

  routeInfo: Record<string, { duration: string; distance: string }> | null = null;

  routeModes = [
    { key: 'driving',  icon: '🚗', label: 'Voiture' },
    { key: 'walking',  icon: '🚶', label: 'À pied'  },
    { key: 'cycling',  icon: '🚲', label: 'Vélo'    },
  ];

  get googleMapsUrl(): string {
    if (!this.userLat || !this.latitude) return this.googleMapsSearchUrl;
    return `https://www.google.com/maps/dir/${this.userLat},${this.userLng}/${this.latitude},${this.longitude}`;
  }

  get osmUrl(): string {
    if (!this.latitude) return '#';
    return `https://www.openstreetmap.org/directions?from=${this.userLat},${this.userLng}&to=${this.latitude},${this.longitude}`;
  }

  get googleMapsSearchUrl(): string {
    if (this.latitude && this.longitude)
      return `https://www.google.com/maps/search/?api=1&query=${this.latitude},${this.longitude}`;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(this.locationName)}`;
  }

  ngAfterViewInit(): void {
    // ngAfterViewInit fires, but mapContainer may not exist yet if latitude is null
    // Delay to let *ngIf render the container
    setTimeout(() => this.initMap(), 200);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['latitude'] || changes['longitude']) {
      if (this.map) {
        this.updateEventMarker();
      } else {
        // Coords just arrived — wait for *ngIf to render the container then init
        setTimeout(() => this.initMap(), 200);
      }
    }
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  private initMap(): void {
    if (!this.mapContainer?.nativeElement || this.map) return;

    const lat = this.latitude ?? 36.8065;
    const lng = this.longitude ?? 10.1815;
    const zoom = this.latitude ? 14 : 5;

    this.map = L.map(this.mapContainer.nativeElement).setView([lat, lng], zoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
      crossOrigin: ''
    }).addTo(this.map);

    this.updateEventMarker();

    // Force tile reload after layout is stable
    setTimeout(() => this.map?.invalidateSize(), 300);
  }

  private updateEventMarker(): void {
    if (!this.map || !this.latitude || !this.longitude) return;

    this.eventMarker?.remove();

    const icon = L.divIcon({
      html: `<div style="background:#ef4444;width:36px;height:36px;border-radius:50% 50% 50% 0;
             transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3);">
             </div>`,
      className: '',
      iconSize: [36, 36],
      iconAnchor: [18, 36],
      popupAnchor: [0, -36]
    });

    this.eventMarker = L.marker([this.latitude, this.longitude], { icon })
      .addTo(this.map)
      .bindPopup(`<b>📍 ${this.locationName}</b>`)
      .openPopup();

    this.map.setView([this.latitude, this.longitude], 14);
  }

  locateUser(): void {
    if (!navigator.geolocation) { alert('Géolocalisation non supportée'); return; }
    this.locating = true;
    navigator.geolocation.getCurrentPosition(
      pos => {
        this.userLat = pos.coords.latitude;
        this.userLng = pos.coords.longitude;
        this.locating = false;
        this.placeUserMarker();
      },
      () => { this.locating = false; alert('Impossible d\'obtenir votre position'); }
    );
  }

  private placeUserMarker(): void {
    if (!this.map || !this.userLat || !this.userLng) return;
    this.userMarker?.remove();

    const icon = L.divIcon({
      html: `<div style="background:#3b82f6;width:18px;height:18px;border-radius:50%;
             border:3px solid #fff;box-shadow:0 0 0 3px rgba(59,130,246,.4);"></div>`,
      className: '',
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    });

    this.userMarker = L.marker([this.userLat, this.userLng], { icon })
      .addTo(this.map!)
      .bindPopup('📍 Votre position');

    if (this.latitude && this.longitude) {
      const bounds = L.latLngBounds(
        [this.userLat, this.userLng],
        [this.latitude, this.longitude]
      );
      this.map!.fitBounds(bounds, { padding: [50, 50] });
    } else {
      this.map!.setView([this.userLat, this.userLng], 13);
    }
  }

  async showRouteToEvent(): Promise<void> {
    if (!this.userLat || !this.userLng || !this.latitude || !this.longitude) return;
    this.routing = true;
    this.routeLayer?.remove();

    // OSRM public server only supports the "driving" profile reliably.
    // We fetch the real road distance for driving, then estimate walking/cycling
    // durations from that distance using realistic average speeds.
    const WALKING_KMH  = 5;   // km/h
    const CYCLING_KMH  = 15;  // km/h
    const DRIVING_KMH  = 50;  // km/h urban average

    try {
      let drivingDistanceM: number | null = null;
      let drivingDurationS: number | null = null;

      try {
        const url = `https://router.project-osrm.org/route/v1/driving/` +
          `${this.userLng},${this.userLat};${this.longitude},${this.latitude}` +
          `?overview=full&geometries=geojson`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const route = data.routes?.[0];
          if (route) {
            drivingDistanceM = route.distance;
            drivingDurationS = route.duration;
            // Draw route on map
            const coords = route.geometry.coordinates
              .map((c: number[]) => [c[1], c[0]] as L.LatLngExpression);
            this.routeLayer = L.polyline(coords, { color: '#3b82f6', weight: 4, opacity: 0.8 })
              .addTo(this.map!);
            this.map!.fitBounds(this.routeLayer.getBounds(), { padding: [40, 40] });
          }
        }
      } catch { /* OSRM unavailable, fallback below */ }

      if (drivingDistanceM !== null && drivingDurationS !== null) {
        const distKm = drivingDistanceM / 1000;
        const distLabel = this.formatDistance(drivingDistanceM);
        this.routeInfo = {
          driving: { duration: this.formatDuration(drivingDurationS),          distance: distLabel },
          walking: { duration: this.formatDuration(distKm / WALKING_KMH * 3600), distance: distLabel },
          cycling: { duration: this.formatDuration(distKm / CYCLING_KMH * 3600), distance: distLabel },
        };
      } else {
        // Fallback: straight-line haversine distance
        this.routeLayer = L.polyline(
          [[this.userLat, this.userLng], [this.latitude, this.longitude]],
          { color: '#3b82f6', weight: 3, dashArray: '8,8' }
        ).addTo(this.map!);
        const dist = this.haversineKm(this.userLat, this.userLng, this.latitude, this.longitude);
        const distLabel = `~${dist.toFixed(1)} km`;
        this.routeInfo = {
          driving: { duration: `~${Math.ceil(dist / DRIVING_KMH * 60)} min`, distance: distLabel },
          walking: { duration: `~${Math.ceil(dist / WALKING_KMH * 60)} min`, distance: distLabel },
          cycling: { duration: `~${Math.ceil(dist / CYCLING_KMH * 60)} min`, distance: distLabel },
        };
      }
    } finally {
      this.routing = false;
    }
  }

  selectMode(mode: string): void {
    this.selectedMode = mode;
  }

  private formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.ceil((seconds % 3600) / 60);
    return h > 0 ? `${h}h${m.toString().padStart(2,'0')}` : `${m} min`;
  }

  private formatDistance(meters: number): string {
    return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
  }

  private haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 +
      Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLng/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }
}
