/**
 * Partner store map controller
 *
 * attribute contract:
 *   [dev-target="map"]                          — map container
 *   [dev-target="search"]                       — Places autocomplete input
 *   [dev-target="result-list-wrap"]             — sidebar results list
 *   [dev-target="prev"] / [dev-target="next"]   — pagination controls
 *   [dev-target="location-item-placeholder"]    — list item template
 *   [dev-default-lat] / [dev-default-lng]       — default map center on map element
 */

const API_URL = 'https://payjoy.com/partner-stores.php';
const PAGE_SIZE = 20;
const MAP_ID = '42d7ecf33b86758d';
const MARKER_ICON =
  'https://cdn.prod.website-files.com/674450e27e5d54e8286f6929/678654cc3c2c67711f9e8591_Map%20Marker.svg';

interface StoreLocation {
  lat: string;
  lng: string;
  address: string;
  merchantName: string;
  merchantPhone?: string;
}

interface LatLngCoords {
  lat: number;
  lng: number;
}

export class MapController {
  private readonly apiUrl = new URL(API_URL);

  private map: google.maps.Map | null = null;
  private autocomplete: google.maps.places.Autocomplete | null = null;
  private markers: google.maps.marker.AdvancedMarkerElement[] = [];
  private infoWindows: google.maps.InfoWindow[] = [];
  private markerClickHandlers: Array<() => void> = [];

  private currentPage = 0;
  private allData: StoreLocation[] = [];

  private mapElement: HTMLElement | null = null;
  private searchInput: HTMLInputElement | null = null;
  private resultList: HTMLElement | null = null;
  private prevBtn: HTMLElement | null = null;
  private nextBtn: HTMLElement | null = null;
  private resultsText: HTMLElement | null = null;
  private locationItemTemplate: HTMLElement | null = null;
  private infoTemplate: HTMLDivElement | null = null;

  private defaultLat = 19.2464696;
  private defaultLng = -99.1013498;

  init(): void {
    if (new URL(window.location.href).searchParams.has('debug')) {
      console.error('Debug Mode');
      return;
    }

    this.mapElement = document.querySelector('[dev-target="map"]');
    this.searchInput = document.querySelector('[dev-target="search"]');
    this.resultList = document.querySelector('[dev-target="result-list-wrap"]');
    this.prevBtn = document.querySelector('[dev-target="prev"] .clickable_btn');
    this.nextBtn = document.querySelector('[dev-target="next"] .clickable_btn');
    this.resultsText = document.querySelector('.map_results .u-text');

    const allPlaceholders = document.querySelectorAll<HTMLElement>(
      '[dev-target="location-item-placeholder"]'
    );
    if (allPlaceholders[0]) {
      this.locationItemTemplate = allPlaceholders[0].cloneNode(true) as HTMLElement;
      allPlaceholders.forEach((el) => el.remove());
    }

    this.infoTemplate = this.createInfoTemplate();

    this.defaultLat = Number(this.mapElement?.getAttribute('dev-default-lat') ?? this.defaultLat);
    this.defaultLng = Number(this.mapElement?.getAttribute('dev-default-lng') ?? this.defaultLng);

    if (!this.mapElement) {
      console.error('map element not found');
      return;
    }
    if (!this.searchInput) {
      console.error('search input not found');
      return;
    }
    if (!this.resultList || !this.locationItemTemplate) {
      console.error('result list or location item template not found');
      return;
    }

    document.querySelector("form[data-name='Email Form']")?.addEventListener('submit', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    this.prevBtn?.addEventListener('click', () => {
      if (this.currentPage > 0) {
        this.currentPage -= 1;
        this.renderPage();
      }
    });

    this.nextBtn?.addEventListener('click', () => {
      if ((this.currentPage + 1) * PAGE_SIZE < this.allData.length) {
        this.currentPage += 1;
        this.renderPage();
      }
    });

    void this.initMap();
  }

  private async initMap(): Promise<void> {
    if (!this.mapElement || !this.searchInput) return;

    const { Map } = (await google.maps.importLibrary('maps')) as google.maps.MapsLibrary;

    this.mapElement.innerHTML = '';

    this.map = new Map(this.mapElement, {
      center: { lat: this.defaultLat, lng: this.defaultLng },
      zoom: 10,
      mapId: MAP_ID,
    });

    const { Autocomplete } = (await google.maps.importLibrary(
      'places'
    )) as google.maps.PlacesLibrary;
    this.autocomplete = new Autocomplete(this.searchInput, { fields: ['geometry'] });
    this.autocomplete.addListener('place_changed', () => void this.onPlaceSelected());

    await google.maps.importLibrary('marker');

    this.requestUserLocation();
    this.handleDrag();
  }

  private async onPlaceSelected(): Promise<void> {
    const place = this.autocomplete?.getPlace();
    if (!place?.geometry?.location) return;

    await this.fetchAndRender({
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng(),
    });
  }

  private handleDrag(): void {
    if (!this.map) return;

    this.map.addListener('dragend', () => {
      void this.onMapDragEnd();
    });
  }

  private async onMapDragEnd(): Promise<void> {
    if (!this.map) return;

    const center = this.map.getCenter();
    const bounds = this.map.getBounds();
    if (!center || !bounds) return;

    const data = await this.fetchData({ lat: center.lat(), lng: center.lng() });
    this.allData = data.filter(({ lat, lng }) =>
      bounds.contains(new google.maps.LatLng(parseFloat(lat), parseFloat(lng)))
    );
    this.currentPage = 0;
    this.renderPage(false);
  }

  private requestUserLocation(): void {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          this.map?.panTo({ lat: coords.latitude, lng: coords.longitude });
          void this.fetchAndRender({ lat: coords.latitude, lng: coords.longitude });
        },
        (err) => {
          console.error('Geolocation failed:', err.message);
          void this.fetchAndRender({ lat: this.defaultLat, lng: this.defaultLng });
        }
      );
      return;
    }

    void this.fetchAndRender({ lat: this.defaultLat, lng: this.defaultLng });
  }

  private async fetchAndRender(coords: LatLngCoords): Promise<void> {
    this.allData = await this.fetchData(coords);
    this.currentPage = 0;
    this.renderPage(true);
  }

  private async fetchData({ lat, lng }: LatLngCoords): Promise<StoreLocation[]> {
    this.apiUrl.searchParams.set('category', 'stores-near-me');
    this.apiUrl.searchParams.set('limit', '20');
    this.apiUrl.searchParams.set('lat', lat.toString());
    this.apiUrl.searchParams.set('lng', lng.toString());

    const res = await fetch(this.apiUrl);
    const data = (await res.json()) as StoreLocation[];

    // eslint-disable-next-line no-console -- debug: locations returned from API
    console.log(`[PayJoy Map] Found ${data.length} locations near (${lat}, ${lng}):`, data);

    return data;
  }

  private renderPage(panAfterRender = true): void {
    const start = this.currentPage * PAGE_SIZE;
    const pageData = this.allData.slice(start, start + PAGE_SIZE);
    const totalCount = this.allData.length;

    if (this.resultsText) {
      this.resultsText.innerHTML = `<strong>Showing ${totalCount} Results Near You</strong>`;
    }

    if (this.prevBtn) {
      const wrap = this.prevBtn.closest('.button-main-wrap');
      if (wrap instanceof HTMLElement) wrap.style.opacity = this.currentPage === 0 ? '0.4' : '1';
    }

    if (this.nextBtn) {
      const wrap = this.nextBtn.closest('.button-main-wrap');
      if (wrap instanceof HTMLElement) {
        wrap.style.opacity = (this.currentPage + 1) * PAGE_SIZE >= totalCount ? '0.4' : '1';
      }
    }

    this.renderList(pageData);
    this.clearMarkers();
    this.addMarkers(pageData);

    if (panAfterRender) this.panToFit();
  }

  private renderList(data: StoreLocation[]): void {
    if (!this.resultList || !this.locationItemTemplate) return;

    this.resultList.innerHTML = '';

    if (data.length === 0) {
      this.resultList.innerHTML = "<p style='padding:1rem;'>No stores found near you.</p>";
      return;
    }

    data.forEach((item, index) => {
      const el = this.locationItemTemplate!.cloneNode(true) as HTMLElement;
      el.removeAttribute('dev-target');

      const nameEl = el.querySelector('.list_item_title .u-text');
      if (nameEl) nameEl.innerHTML = `<strong>${item.merchantName}</strong>`;

      const addrEl = el.querySelector('.list_item_address .u-text');
      if (addrEl) addrEl.textContent = item.address;

      const linkEl = el.querySelector('[dev-target="link"]');
      if (linkEl instanceof HTMLElement) {
        linkEl.style.cursor = 'pointer';
        linkEl.addEventListener('click', () => {
          this.map?.panTo({ lat: Number(item.lat), lng: Number(item.lng) });
          this.map?.setZoom(15);
          this.markerClickHandlers[index]?.();
        });
      }

      this.resultList!.appendChild(el);
    });
  }

  private addMarkers(data: StoreLocation[]): void {
    const { infoTemplate } = this;
    if (!this.map || !infoTemplate) return;

    data.forEach(({ lat, lng, address, merchantName, merchantPhone }) => {
      const pin = document.createElement('img');
      pin.src = MARKER_ICON;

      const marker = new google.maps.marker.AdvancedMarkerElement({
        position: { lat: parseFloat(lat), lng: parseFloat(lng) },
        map: this.map,
        content: pin,
      });

      const infoContent = infoTemplate.cloneNode(true) as HTMLDivElement;
      infoContent.style.display = 'block';

      infoContent.querySelector('[data-info="name"]')!.textContent = merchantName;
      infoContent.querySelector('[data-info="address"]')!.textContent = address;
      infoContent.querySelector('[data-info="number"]')!.textContent = merchantPhone ?? '';

      const dirLink = infoContent.querySelector('[data-info="directions"]');
      if (dirLink instanceof HTMLAnchorElement) {
        dirLink.href = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
        dirLink.target = '_blank';
      }

      const infoWindow = new google.maps.InfoWindow({ content: infoContent });
      this.infoWindows.push(infoWindow);

      const openInfoWindow = (): void => {
        this.infoWindows.forEach((window) => window.close());
        infoWindow.open({ anchor: marker, map: this.map! });
      };

      marker.addListener('click', openInfoWindow);
      this.markers.push(marker);
      this.markerClickHandlers.push(openInfoWindow);
    });
  }

  private clearMarkers(): void {
    this.markers.forEach((marker) => {
      marker.map = null;
    });
    this.markers = [];
    this.infoWindows = [];
    this.markerClickHandlers = [];
  }

  private panToFit(): void {
    if (!this.map || this.markers.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    this.markers.forEach((marker) => {
      const { position } = marker;
      if (!position) return;

      bounds.extend({
        lat: typeof position.lat === 'function' ? position.lat() : position.lat,
        lng: typeof position.lng === 'function' ? position.lng() : position.lng,
      });
    });

    this.map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
  }

  private createInfoTemplate(): HTMLDivElement {
    const div = document.createElement('div');
    div.style.cssText = 'padding:10px; min-width:200px; font-family:inherit; display:none;';
    div.innerHTML = `
      <div data-info="name"       style="font-weight:600; margin-bottom:4px;"></div>
      <div data-info="address"    style="font-size:0.875rem; margin-bottom:4px;"></div>
      <div data-info="number"     style="font-size:0.875rem; margin-bottom:8px;"></div>
      <a   data-info="directions" style="font-size:0.875rem; color:inherit;">
        Get Directions →
      </a>
    `;
    return div;
  }
}
