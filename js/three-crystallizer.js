/**
 * LAVANA — Real 3D view of actual salt pan sites
 * MapLibre GL JS with Esri World Imagery (satellite) and Mapzen Terrarium
 * elevation tiles (AWS Terrain Tiles). This is not a 3D model of a salt pan.
 */

class SaltPan3DSimulator {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.mapEl = document.getElementById("map-3d");
    if (!this.container || !this.mapEl || typeof maplibregl === "undefined")
      return;

    this.map = null;
    this.marker = null;
    this.orbitTimer = null;
    this.currentPan = null;
    this.exaggeration = 1.8;
    this.viewMode = "oblique";

    this.init();
  }

  init() {
    this.map = new maplibregl.Map({
      container: this.mapEl,
      style: {
        version: 8,
        glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
        sources: {
          esri: {
            type: "raster",
            tiles: [
              "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            ],
            tileSize: 256,
            attribution:
              "Esri / Maxar / Earthstar Geographics / GIS User Community",
          },
          terrain: {
            type: "raster-dem",
            tiles: [
              "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png",
            ],
            encoding: "terrarium",
            tileSize: 256,
            maxzoom: 15,
            attribution: "Mapzen Terrarium / AWS Terrain Tiles",
          },
        },
        layers: [
          {
            id: "satellite",
            type: "raster",
            source: "esri",
          },
        ],
      },
      center: [70.85, 23.45],
      zoom: 12.6,
      pitch: 62,
      bearing: -28,
      maxPitch: 85,
      minZoom: 4,
      maxZoom: 18,
      cooperativeGestures: true,
      attributionControl: false,
    });

    this.map.addControl(
      new maplibregl.NavigationControl({ visualizePitch: true }),
      "top-right",
    );
    this.map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      "bottom-right",
    );
    // Keep the map visible on phones; the source strip and info toggle retain credits.
    const attribution = this.mapEl.querySelector(".maplibregl-ctrl-attrib");
    this.map.once("idle", () => {
      if (!attribution) return;
      attribution.classList.remove("maplibregl-compact-show");
      attribution.open = false;
    });
    this.map.dragRotate.enable();
    this.map.touchZoomRotate.enable();

    this.map.on("load", () => {
      try {
        this.map.addLayer({
          id: "hillshade",
          type: "hillshade",
          source: "terrain",
          paint: {
            "hillshade-exaggeration": 0.45,
            "hillshade-illumination-direction": 315,
          },
        });
        this.map.setTerrain({
          source: "terrain",
          exaggeration: this.exaggeration,
        });
      } catch (err) {
        console.warn(
          "Terrain tiles unavailable; showing satellite imagery.",
          err,
        );
      }
      this.setViewMode(this.viewMode);
      if (this.currentPan) {
        this.flyToPan(this.currentPan);
        return;
      }
      this.placeMarker(23.45, 70.85, "Little Rann of Kutch");
      this.updateHud({
        name: "Little Rann of Kutch salt-farming area",
        place: "Surendranagar / Patan / Morbi / Kutch, Gujarat",
        note: "Real satellite view of Agariya sub-soil brine pans. Imagery is Esri World Imagery, not a rendered 3D model.",
      });
    });

    window.addEventListener("resize", () => this.onResize());
    this.resizeObserver = new ResizeObserver(() => this.onResize());
    this.resizeObserver.observe(this.container);
    this.isVisible = true;
    this.visibilityObserver = new IntersectionObserver((entries) => {
      this.isVisible = entries[0].isIntersecting;
    });
    this.visibilityObserver.observe(this.container);
  }

  placeMarker(lat, lon, name) {
    if (this.marker) this.marker.remove();
    const el = document.createElement("div");
    el.className = "map3d-marker";
    el.title = name || "Salt pan site";
    this.marker = new maplibregl.Marker({ element: el, anchor: "center" })
      .setLngLat([lon, lat])
      .addTo(this.map);
  }

  updateHud(info) {
    const hudTitle = document.getElementById("three-hud-title");
    const hudDesc = document.getElementById("three-hud-desc");
    const titleEl = document.getElementById("three-current-title");
    if (hudTitle) hudTitle.textContent = info.name || "Salt pan site";
    if (hudDesc) {
      hudDesc.textContent = [info.place, info.note].filter(Boolean).join(" — ");
    }
    if (titleEl && info.name) titleEl.textContent = info.name;
  }

  flyToPan(pan) {
    if (!this.map || !pan) return;
    this.currentPan = pan;
    const lat = parseFloat(pan.lat);
    const lon = parseFloat(pan.lon);
    if (Number.isNaN(lat) || Number.isNaN(lon)) return;

    const zoom = this.viewMode === "overhead" ? 14.2 : 12.8;
    const pitch =
      this.viewMode === "overhead"
        ? 0
        : this.viewMode === "exaggerated"
          ? 70
          : 62;

    this.map.flyTo({
      center: [lon, lat],
      zoom,
      pitch,
      bearing: this.viewMode === "overhead" ? 0 : -24,
      duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? 0
        : 1800,
    });

    this.placeMarker(lat, lon, pan.name);
    this.updateHud({
      name: pan.name,
      place: `${pan.district ? pan.district + ", " : ""}${pan.state}`,
      note: "Actual site coordinates on live satellite imagery. Elevation from Mapzen Terrarium (AWS Open Data).",
    });

    const select = document.getElementById("select-3d-preset");
    if (select && pan.id) select.value = pan.id;

    this.onResize();
  }

  setPanProfile(value, panName = "") {
    if (window.app && window.app.pans && window.app.pans.length) {
      const byId = window.app.pans.find((p) => p.id === value);
      if (byId) {
        this.flyToPan(byId);
        return;
      }
      const byName = window.app.pans.find((p) => p.name === panName);
      if (byName) {
        this.flyToPan(byName);
        return;
      }
    }

    const fallback = {
      coastal_marine_saltern: {
        lat: 8.80556,
        lon: 78.145,
        name: "Thoothukudi salt pan cluster",
      },
      desert_subsoil_brine: {
        lat: 23.45,
        lon: 70.85,
        name: "Little Rann of Kutch",
      },
      inland_lake_playa: {
        lat: 26.94167,
        lon: 75.07639,
        name: "Sambhar Salt Lake",
      },
      rock_salt_geological: {
        lat: 31.8063,
        lon: 76.9417,
        name: "Drang rock salt mine",
      },
    };
    const site = fallback[value] || fallback.desert_subsoil_brine;
    this.flyToPan({ ...site, district: "", state: "" });
  }

  setViewMode(mode) {
    this.viewMode = mode || "oblique";
    if (!this.map) return;

    if (mode === "overhead") {
      this.stopOrbit();
      this.exaggeration = 1.4;
      this.map.easeTo({
        pitch: 0,
        bearing: 0,
        zoom: Math.max(this.map.getZoom(), 13.5),
        duration: 900,
      });
    } else if (mode === "exaggerated") {
      this.stopOrbit();
      this.exaggeration = 2.8;
      this.map.easeTo({
        pitch: 70,
        zoom: Math.max(this.map.getZoom(), 12.2),
        duration: 900,
      });
    } else if (mode === "orbit") {
      this.exaggeration = 1.8;
      this.map.easeTo({ pitch: 64, duration: 700 });
      this.startOrbit();
    } else {
      this.stopOrbit();
      this.exaggeration = 1.8;
      this.map.easeTo({ pitch: 62, bearing: -28, duration: 900 });
    }

    try {
      this.map.setTerrain({
        source: "terrain",
        exaggeration: this.exaggeration,
      });
    } catch (e) {
      /* terrain optional */
    }
  }

  startOrbit() {
    this.stopOrbit();
    this.orbitTimer = setInterval(() => {
      if (
        !this.map ||
        document.hidden ||
        !this.isVisible ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      )
        return;
      this.map.setBearing(this.map.getBearing() + 0.18);
    }, 40);
  }

  stopOrbit() {
    if (this.orbitTimer) {
      clearInterval(this.orbitTimer);
      this.orbitTimer = null;
    }
  }

  onResize() {
    if (this.map) this.map.resize();
  }
}

window.SaltPan3DSimulator = SaltPan3DSimulator;
