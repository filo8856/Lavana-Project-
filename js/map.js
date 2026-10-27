/**
 * LAVANA — Interactive Leaflet Map Engine for Indian Salt Pans
 */

class SaltPanMap {
  constructor(containerId, onSelectPan, onLaunch3D) {
    this.containerId = containerId;
    this.onSelectPan = onSelectPan;
    this.onLaunch3D = onLaunch3D;
    this.map = null;
    this.markersLayer = null;
    this.tileLayers = {};
    this.currentTile = "satellite";
    this.pans = [];
    this.markersMap = new Map();

    this.init();
  }

  init() {
    // Center of India
    this.map = L.map(this.containerId, {
      center: [21.5937, 78.9629],
      zoom: 5,
      minZoom: 4,
      maxZoom: 18,
      zoomControl: true,
      scrollWheelZoom: false,
      attributionControl: false,
    });

    // Custom attribution
    L.control
      .attribution({ position: "bottomright", prefix: false })
      .addAttribution(
        'Imagery &copy; <a href="https://www.esri.com" target="_blank" rel="noopener">Esri</a> | &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OSM</a> | Compiled by LAVANA student team from cited public sources',
      )
      .addTo(this.map);

    // Tile Layers
    this.tileLayers.satellite = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        maxZoom: 18,
      },
    );

    this.tileLayers.dark = L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      {
        maxZoom: 18,
        subdomains: "abcd",
      },
    );

    this.tileLayers.streets = L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 18,
      },
    );

    // Add default tile layer
    this.tileLayers.satellite.addTo(this.map);

    // Layer for markers
    this.markersLayer = L.layerGroup().addTo(this.map);

    // Let ordinary scrolling continue down the page. Ctrl/Command + scroll zooms.
    this.map.getContainer().addEventListener(
      "wheel",
      (event) => {
        if (event.ctrlKey || event.metaKey) this.map.scrollWheelZoom.enable();
        else this.map.scrollWheelZoom.disable();
      },
      { passive: true, capture: true },
    );
  }

  setTileLayer(type) {
    if (!this.tileLayers[type] || type === this.currentTile) return;

    this.map.removeLayer(this.tileLayers[this.currentTile]);
    this.tileLayers[type].addTo(this.map);
    this.currentTile = type;
  }

  loadPans(pans) {
    this.pans = pans;
    this.renderMarkers(pans);
    const points = pans
      .filter((pan) => Number.isFinite(pan.lat) && Number.isFinite(pan.lon))
      .map((pan) => [pan.lat, pan.lon]);
    if (points.length)
      this.map.fitBounds(points, { padding: [35, 35], maxZoom: 6 });
  }

  renderMarkers(filteredPans) {
    this.markersLayer.clearLayers();
    this.markersMap.clear();

    filteredPans.forEach((pan) => {
      const lat = parseFloat(pan.lat);
      const lon = parseFloat(pan.lon);

      if (isNaN(lat) || isNaN(lon)) return;

      // Color coding by state / status
      let colorClass = "cyan";
      if (pan.ramsar) {
        colorClass = "pink";
      } else if (pan.state === "Rajasthan") {
        colorClass = "pink";
      } else if (pan.state === "Tamil Nadu") {
        colorClass = "amber";
      } else if (pan.state === "Maharashtra") {
        colorClass = "turquoise";
      } else if (pan.state === "Goa" || pan.state === "Karnataka") {
        colorClass = "purple";
      } else if (pan.state === "Himachal Pradesh") {
        colorClass = "pink";
      }

      const customIcon = L.divIcon({
        className: `salt-pin ${colorClass}`,
        html: `<div class="pin-core"><span class="pin-dot"></span></div>`,
        iconSize: [30, 38],
        iconAnchor: [15, 34],
        popupAnchor: [0, -32],
      });

      const marker = L.marker([lat, lon], {
        icon: customIcon,
        title: pan.name,
        alt: pan.name,
        keyboard: true,
      });

      // Build Rich Popup Card
      const statusClass = (pan.status || "Active").toLowerCase();
      const popupContent = `
        <div class="map-popup-card">
          <div class="popup-badge-row">
            <span class="popup-badge ${statusClass}">${pan.status || "Active"}</span>
            ${pan.ramsar ? '<span class="popup-badge ramsar">Ramsar Site</span>' : ""}
          </div>
          <h4 class="popup-title">${pan.name}</h4>
          <div class="popup-location">${pan.district ? pan.district + ", " : ""}${pan.state}</div>
          <div class="popup-meta-grid">
            <div>
              <div class="popup-meta-label">Type</div>
              <div class="popup-meta-val">${pan.pan_type || "Solar Salt"}</div>
            </div>
            <div>
              <div class="popup-meta-label">Coordinates</div>
              <div class="popup-meta-val">${lat.toFixed(3)}°N, ${lon.toFixed(3)}°E</div>
            </div>
            <div>
              <div class="popup-meta-label">Workers</div>
              <div class="popup-meta-val">${pan.worker_count ? pan.worker_count.toLocaleString() + "+" : "Documented"}</div>
            </div>
            <div>
              <div class="popup-meta-label">Annual Yield</div>
              <div class="popup-meta-val">${pan.actual_tonnes ? (pan.actual_tonnes / 1000).toLocaleString() + "k T" : "Regional"}</div>
            </div>
          </div>
          <div class="popup-btn-row">
            <button class="popup-btn popup-btn-primary" onclick="window.app.openDossier('${pan.id}')">Full Dossier</button>
            <button class="popup-btn popup-btn-3d" onclick="window.app.launch3D('${pan.id}')">3D View</button>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, { maxWidth: 320 });
      marker.on("click", () => {
        if (this.onSelectPan) this.onSelectPan(pan);
      });

      this.markersLayer.addLayer(marker);
      this.markersMap.set(pan.id, marker);
    });
  }

  focusPan(panId, zoom = 12) {
    const marker = this.markersMap.get(panId);
    if (marker) {
      const latlng = marker.getLatLng();
      this.map.flyTo(latlng, zoom, {
        duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? 0
          : 1.2,
        easeLinearity: 0.25,
      });
      setTimeout(() => marker.openPopup(), 1200);
    }
  }

  fitAll() {
    if (this.markersLayer.getLayers().length > 0) {
      const group = new L.featureGroup(this.markersLayer.getLayers());
      this.map.flyToBounds(group.getBounds().pad(0.1), {
        duration: 1.0,
      });
    }
  }
}

window.SaltPanMap = SaltPanMap;
