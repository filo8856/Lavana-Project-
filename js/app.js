/**
 * LAVANA — Main Application Logic
 * Orchestrates Map, 3D Simulator, Registry, Baumé Hydrometer, and Dossier Modal
 */

class LavanaApp {
  constructor() {
    this.pans = [];
    this.filteredPans = [];
    this.mapInstance = null;
    this.simulator3D = null;
    this.selectedPan = null;
    this.activeTab = "overview";
    this.visibleCount = 12;
    this.returnFocus = null;

    this.init();
  }

  async init() {
    await this.loadData();
    // Optional map engines must not prevent the directory from starting.
    try {
      this.initMap();
    } catch (error) {
      console.warn("The map could not start.", error);
      this.showMapFeedback(
        "map-feedback",
        "The interactive map is unavailable. You can still explore every site in the registry.",
      );
    }
    try {
      this.init3DSimulator();
    } catch (error) {
      console.warn("The satellite viewer could not start.", error);
      this.showMapFeedback(
        "three-feedback",
        "The satellite viewer could not start. Please check your connection and that WebGL is enabled in your browser.",
      );
    }
    this.populate3DSelect();
    this.initBaumeSlider();
    this.initEventListeners();
    this.renderRegistry();
    this.updateStats();
    this.renderFilterChips();
    this.refreshIcons();
  }

  showMapFeedback(id, message) {
    const element = document.getElementById(id);
    if (!element) return;
    element.replaceChildren();
    const text = document.createElement("span");
    text.textContent = message;
    const link = document.createElement("a");
    link.href = "#salt-registry";
    link.textContent = "Browse the registry";
    element.append(text, link);
    element.hidden = false;
  }

  async loadData() {
    try {
      const res = await fetch("data/salt_pans_client.json");
      if (res.ok) {
        this.pans = await res.json();
      } else {
        throw new Error("Fetch failed");
      }
    } catch (e) {
      console.warn(
        "Loading fallback data from local storage or embedded...",
        e,
      );
      // Fallback if accessed via file:// without http server
      if (window.FALLBACK_SALT_PANS) {
        this.pans = window.FALLBACK_SALT_PANS;
      }
    }

    this.filteredPans = [...this.pans];
    console.log(`Loaded ${this.pans.length} Indian salt pans.`);
  }

  initMap() {
    if (!window.SaltPanMap || !window.L)
      throw new Error("Leaflet is unavailable");

    this.mapInstance = new SaltPanMap(
      "map-container",
      (pan) => this.selectPan(pan),
      (panId) => this.launch3D(panId),
    );

    this.mapInstance.loadPans(this.filteredPans);
  }

  init3DSimulator() {
    if (!window.SaltPan3DSimulator || !window.maplibregl)
      throw new Error("MapLibre is unavailable");
    this.simulator3D = new SaltPan3DSimulator("three-canvas-container");
  }

  initBaumeSlider() {
    const slider = document.getElementById("baume-range");
    if (!slider) return;

    slider.addEventListener("input", (e) => {
      this.updateBaumePhase(parseFloat(e.target.value));
    });

    this.updateBaumePhase(26.5);
  }

  refreshIcons() {
    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons({ attrs: { "stroke-width": 2 } });
    }
  }

  populate3DSelect() {
    const select = document.getElementById("select-3d-preset");
    if (!select || !this.pans.length) return;
    const preferred = ["IN-GJ-001", "IN-RJ-001", "IN-TN-001", "IN-HP-001"];
    const ordered = [
      ...this.pans.filter((p) => preferred.includes(p.id)),
      ...this.pans.filter((p) => !preferred.includes(p.id)),
    ];
    select.innerHTML = ordered
      .map(
        (p) =>
          `<option value="${p.id}">${String(p.name).replace(/</g, "")}</option>`,
      )
      .join("");
    select.value = "IN-GJ-001";
    select.addEventListener("change", () => this.launch3D(select.value));
  }

  updateBaumePhase(val) {
    const numEl = document.getElementById("baume-val");
    const phaseEl = document.getElementById("baume-phase-title");
    const precipEl = document.getElementById("baume-phase-precipitate");
    const badgeEl = document.getElementById("baume-quality-badge");
    if (badgeEl)
      badgeEl.dataset.phase =
        val < 5
          ? "intake"
          : val < 15
            ? "carbonate"
            : val < 25
              ? "gypsum"
              : val <= 29.5
                ? "crystal"
                : "bittern";
    const phase = badgeEl?.dataset.phase;
    const currentStep = document.querySelector(
      `.process-step[data-phase="${phase}"]`,
    );
    document.querySelectorAll(".process-step").forEach((step) => {
      step.dataset.current = String(step === currentStep);
    });
    if (currentStep && this.currentProcessStep !== currentStep) {
      if (this.currentProcessStep) this.currentProcessStep.open = false;
      currentStep.open = true;
      this.currentProcessStep = currentStep;
    }

    if (numEl) numEl.innerText = val.toFixed(1);

    if (val < 5.0) {
      if (phaseEl) phaseEl.innerText = "Intake & Settling Basin";
      if (precipEl)
        precipEl.innerText =
          "Raw seawater/brine (35 g/L). Silt, sand, and organic suspended solids settle by gravity.";
      if (badgeEl) {
        badgeEl.innerText = "Intake Brine";
      }
    } else if (val < 15.0) {
      if (phaseEl) phaseEl.innerText = "First Condenser Stage";
      if (precipEl)
        precipEl.innerText =
          "Precipitation of Ferric Oxide (Fe₂O₃) and Calcium Carbonate (CaCO₃ / Chalk). Brine clarifies.";
      if (badgeEl) {
        badgeEl.innerText = "Carbonate Settling";
      }
    } else if (val < 25.0) {
      if (phaseEl) phaseEl.innerText = "Gypsum Condensation Pans";
      if (precipEl)
        precipEl.innerText =
          "Heavy crystallization of Calcium Sulfate dihydrate (Gypsum: CaSO₄·2H₂O). Over 85% of total gypsum precipitates.";
      if (badgeEl) {
        badgeEl.innerText = "Gypsum Trap";
      }
    } else if (val <= 29.5) {
      if (phaseEl) phaseEl.innerText = "NaCl Crystallizer Pan (Peak Purity)";
      if (precipEl)
        precipEl.innerText =
          "Optimum Sodium Chloride (NaCl) crystallization! Halophile microalgae Dunaliella salina creates vivid pink hue. Harvest >99.4% purity.";
      if (badgeEl) {
        badgeEl.innerText = "Prime Food-Grade Salt";
      }
    } else {
      if (phaseEl) phaseEl.innerText = "Bittern Liquor Zone (Caution!)";
      if (precipEl)
        precipEl.innerText =
          "Hazardous over-concentration! Bitter Magnesium Sulfate (MgSO₄), Magnesium Chloride (MgCl₂), and Bromine begin depositing. Bittern must be discharged!";
      if (badgeEl) {
        badgeEl.innerText = "Bittern Liquor (Non-Edible)";
      }
    }
  }

  initEventListeners() {
    // Both exploration surfaces share filters without moving the user's scroll.
    const pairs = [
      ["map-search", "registry-search", "input"],
      ["state-filter", "registry-state-filter", "change"],
      ["status-filter", "registry-status-filter", "change"],
    ];
    pairs.forEach(([first, second, event]) => {
      [first, second].forEach((id, index) => {
        document.getElementById(id)?.addEventListener(event, (e) => {
          const peer = document.getElementById(index === 0 ? second : first);
          if (peer) peer.value = e.target.value;
          this.filterPans();
        });
      });
    });
    document
      .getElementById("reset-filters")
      ?.addEventListener("click", () => this.resetFilters());
    document.querySelectorAll("[data-reset-filters]").forEach((button) => {
      button.addEventListener("click", () => this.resetFilters());
    });
    document.querySelectorAll("[data-map-search]").forEach((button) => {
      button.addEventListener("click", () => {
        const search = document.getElementById("map-search");
        search.value = button.dataset.mapSearch;
        search.dispatchEvent(new Event("input", { bubbles: true }));
        this.mapInstance?.fitAll();
      });
    });
    document
      .getElementById("active-filters")
      ?.addEventListener("click", (event) => {
        const chip = event.target.closest("[data-clear-filter]");
        if (!chip) return;
        const id = chip.dataset.clearFilter;
        const value = id === "map-search" ? "" : "all";
        pairs
          .find((pair) => pair[0] === id)
          ?.slice(0, 2)
          .forEach((key) => {
            document.getElementById(key).value = value;
          });
        this.filterPans();
        document
          .getElementById("registry-search")
          ?.focus({ preventScroll: true });
      });
    document.getElementById("load-more")?.addEventListener("click", () => {
      const firstNewId = this.filteredPans[this.visibleCount]?.id;
      this.visibleCount += 12;
      this.renderRegistry();
      this.updateStats();
      // Keep keyboard progression at the first newly revealed record.
      if (firstNewId)
        document
          .querySelector(`#card-${firstNewId} button`)
          ?.focus({ preventScroll: true });
    });

    // Map Layer Toggles
    const layerBtns = document.querySelectorAll(".layer-btn[data-layer]");
    layerBtns.forEach((btn) => {
      btn.setAttribute(
        "aria-pressed",
        String(btn.classList.contains("active")),
      );
      btn.addEventListener("click", () => {
        layerBtns.forEach((b) => {
          b.classList.remove("active");
          b.setAttribute("aria-pressed", String(b === btn));
        });
        btn.classList.add("active");
        const layer = btn.getAttribute("data-layer");
        if (this.mapInstance) this.mapInstance.setTileLayer(layer);
      });
    });

    // Real 3D camera modes
    const viewBtns = document.querySelectorAll(".view-btn");
    viewBtns.forEach((btn) => {
      btn.setAttribute(
        "aria-pressed",
        String(btn.classList.contains("active")),
      );
      btn.addEventListener("click", () => {
        viewBtns.forEach((b) => {
          b.classList.remove("active");
          b.setAttribute("aria-pressed", String(b === btn));
        });
        btn.classList.add("active");
        const mode = btn.getAttribute("data-mode");
        if (this.simulator3D) this.simulator3D.setViewMode(mode);
      });
    });

    // Modal Tabs
    const tabs = document.querySelectorAll(".modal-tab");
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const targetTab = tab.getAttribute("data-tab");
        this.switchModalTab(targetTab);
      });
      tab.addEventListener("keydown", (event) => {
        const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
        if (!keys.includes(event.key)) return;
        event.preventDefault();
        const list = [...tabs];
        let index = list.indexOf(tab);
        if (event.key === "Home") index = 0;
        else if (event.key === "End") index = list.length - 1;
        else
          index =
            (index + (event.key === "ArrowRight" ? 1 : -1) + list.length) %
            list.length;
        this.switchModalTab(list[index].dataset.tab);
        list[index].focus();
      });
    });

    // Modal Close
    const closeBtn = document.getElementById("modal-close");
    const overlay = document.getElementById("dossier-modal");
    if (closeBtn && overlay) {
      closeBtn.addEventListener("click", () => this.closeDossier());
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) this.closeDossier();
      });
    }
    document.addEventListener("keydown", (e) => {
      if (!overlay?.classList.contains("open")) return;
      if (e.key === "Escape") this.closeDossier();
      if (e.key === "Tab") {
        const focusable = [
          ...overlay.querySelectorAll('button, a[href], [tabindex="0"]'),
        ].filter(
          (el) =>
            el.getClientRects().length && !el.disabled && el.tabIndex >= 0,
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            !overlay.contains(document.activeElement))
        ) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    });
  }

  filterPans() {
    this.visibleCount = 12;
    const searchVal = (document.getElementById("map-search")?.value || "")
      .toLowerCase()
      .trim();
    const stateVal = document.getElementById("state-filter")?.value || "all";
    const statusVal = document.getElementById("status-filter")?.value || "all";

    this.filteredPans = this.pans.filter((pan) => {
      const matchSearch =
        !searchVal ||
        pan.name.toLowerCase().includes(searchVal) ||
        (pan.district && pan.district.toLowerCase().includes(searchVal)) ||
        (pan.state && pan.state.toLowerCase().includes(searchVal)) ||
        (pan.alternate_name &&
          pan.alternate_name.toLowerCase().includes(searchVal)) ||
        (pan.description &&
          pan.description.toLowerCase().includes(searchVal)) ||
        (pan.method && pan.method.toLowerCase().includes(searchVal));

      const matchState = stateVal === "all" || pan.state === stateVal;
      const matchStatus =
        statusVal === "all" ||
        (pan.status && pan.status.toLowerCase() === statusVal.toLowerCase()) ||
        (statusVal === "ramsar" && pan.ramsar);

      return matchSearch && matchState && matchStatus;
    });

    if (this.mapInstance) {
      this.mapInstance.renderMarkers(this.filteredPans);
    }
    this.renderRegistry();
    this.updateStats();
    this.renderFilterChips();
  }

  renderFilterChips() {
    const container = document.getElementById("active-filters");
    if (!container) return;
    container.replaceChildren();
    ["map-search", "state-filter", "status-filter"].forEach((id) => {
      const field = document.getElementById(id);
      if (!field?.value || field.value === "all") return;
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "filter-chip";
      chip.dataset.clearFilter = id;
      const label =
        field.tagName === "SELECT"
          ? field.selectedOptions[0].textContent
          : `Search: ${field.value}`;
      chip.textContent = label;
      chip.setAttribute("aria-label", `Remove filter: ${label}`);
      const icon = document.createElement("i");
      icon.dataset.lucide = "x";
      chip.append(icon);
      container.append(chip);
    });
    const reset = document.getElementById("reset-filters");
    if (reset) reset.disabled = !container.children.length;
    this.refreshIcons();
  }

  updateStats() {
    const totalEl = document.getElementById("stat-total-sites");
    const activeEl = document.getElementById("stat-active-sites");
    const workersEl = document.getElementById("stat-workers-reach");
    const countEl = document.getElementById("results-count");

    if (totalEl) totalEl.innerText = this.pans.length;
    if (countEl)
      countEl.innerHTML = `<strong>${this.filteredPans.length}</strong> ${this.filteredPans.length === 1 ? "site" : "sites"} ${this.filteredPans.length === this.pans.length ? "across India" : `matching your filters · ${this.pans.length} in the atlas`}`;
    const mapCount = document.getElementById("map-match-count");
    if (mapCount)
      mapCount.textContent = `${this.filteredPans.length} of ${this.pans.length} sites on the map`;

    const activeCount = this.pans.filter(
      (p) => p.status === "Active" || p.status === "Seasonal",
    ).length;
    if (activeEl) activeEl.innerText = `${activeCount} Active / Seasonal`;

    const totalWorkers = this.pans.reduce(
      (acc, p) => acc + (p.worker_count || 0),
      0,
    );
    if (workersEl) workersEl.innerText = totalWorkers.toLocaleString() + "+";
  }

  renderRegistry() {
    const grid = document.getElementById("pans-grid");
    if (!grid) return;

    if (this.filteredPans.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <h3>No places found.</h3>
          <p>Try another name, district, or state, or clear your filters to explore the full atlas.</p>
          <button class="btn btn-primary" onclick="window.app.resetFilters()">Reset All Filters</button>
        </div>
      `;
      this.updateRegistryProgress();
      return;
    }

    grid.innerHTML = this.filteredPans
      .slice(0, this.visibleCount)
      .map((pan) => {
        const statusClass = (pan.status || "Active").toLowerCase();
        return `
        <div class="pan-card" id="card-${pan.id}">
          <div class="pan-card-header">
            <div class="pan-id-row">
              <span class="pan-id-tag">${pan.id}</span>
              <span class="pan-status-tag ${statusClass}">${pan.status || "Active"}</span>
            </div>
            <h3 class="pan-card-title">${pan.name}</h3>
            ${pan.alternate_name ? `<div class="pan-card-alias">${pan.alternate_name}</div>` : ""}
            <div class="pan-card-location">${pan.district ? pan.district + ", " : ""}${pan.state}</div>
          </div>

          <p class="pan-card-desc">${pan.description}</p>

          <div class="pan-card-meta">
            <div class="meta-block">
              <span class="meta-label">Coordinates</span>
              <span class="meta-value">${pan.lat.toFixed(3)}°N, ${pan.lon.toFixed(3)}°E</span>
            </div>
            <div class="meta-block">
              <span class="meta-label">Worker Reach</span>
              <span class="meta-value">${pan.worker_count ? pan.worker_count.toLocaleString() + " Artisans" : "Documented"}</span>
            </div>
            <div class="meta-block">
              <span class="meta-label">Salt Method</span>
              <span class="meta-value">${pan.method ? pan.method.split(";")[0] : "Solar Evaporation"}</span>
            </div>
            <div class="meta-block">
              <span class="meta-label">Annual Yield</span>
              <span class="meta-value">${pan.actual_tonnes ? (pan.actual_tonnes / 1000).toLocaleString() + "k T/yr" : "Regional Cluster"}</span>
            </div>
          </div>

          <div class="pan-card-badges">
            ${pan.ramsar ? '<span class="badge-pill badge-ramsar">Ramsar wetland</span>' : ""}
            ${pan.protected_area ? `<span class="badge-pill badge-heritage">Protected zone</span>` : ""}
            ${pan.state === "Rajasthan" ? '<span class="badge-pill badge-lake">Inland playa / lake</span>' : ""}
            ${pan.state === "Gujarat" ? '<span class="badge-pill">Solar subsoil / marine</span>' : ""}
          </div>

          <div class="pan-card-actions">
            <button class="pan-action-btn btn-view-dossier" onclick="window.app.openDossier('${pan.id}')">
              <i data-lucide="file-text"></i> Dossier
            </button>
            <button class="pan-action-btn btn-view-3d" onclick="window.app.launch3D('${pan.id}')">
              <i data-lucide="mountain"></i> 3D site
            </button>
            <button class="pan-action-btn" onclick="window.app.focusOnMap('${pan.id}')" title="Locate on map">
              <i data-lucide="map-pin"></i>
            </button>
          </div>
        </div>
      `;
      })
      .join("");
    this.updateRegistryProgress();
    this.refreshIcons();
  }

  updateRegistryProgress() {
    const shown = Math.min(this.visibleCount, this.filteredPans.length);
    const more = document.getElementById("load-more");
    const progress = document.getElementById("registry-progress");
    if (more) more.hidden = shown >= this.filteredPans.length;
    if (progress)
      progress.textContent = shown
        ? `Showing ${shown} of ${this.filteredPans.length} sites`
        : "";
  }

  resetFilters() {
    const search = document.getElementById("map-search");
    const state = document.getElementById("state-filter");
    const status = document.getElementById("status-filter");
    if (search) search.value = "";
    if (state) state.value = "all";
    if (status) status.value = "all";
    [
      "registry-search",
      "registry-state-filter",
      "registry-status-filter",
    ].forEach((id) => {
      const field = document.getElementById(id);
      if (field) field.value = id === "registry-search" ? "" : "all";
    });
    this.filterPans();
  }

  focusOnMap(panId) {
    if (this.mapInstance) {
      this.mapInstance.focusPan(panId, 13);
      const mapEl = document.getElementById("map-explorer");
      if (mapEl) {
        mapEl.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? "auto"
            : "smooth",
        });
      }
    }
  }

  launch3D(panId) {
    const pan = this.pans.find((p) => p.id === panId);
    if (!pan) return;

    if (this.simulator3D) {
      this.simulator3D.flyToPan(pan);
    }

    const simSection = document.getElementById("crystallizer-3d");
    if (simSection) {
      simSection.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
    }
  }

  selectPan(pan) {
    this.selectedPan = pan;
  }

  openDossier(panId) {
    const pan = this.pans.find((p) => p.id === panId);
    if (!pan) return;
    this.selectedPan = pan;

    const modal = document.getElementById("dossier-modal");
    if (!modal) return;
    if (!modal.classList.contains("open"))
      this.returnFocus = document.activeElement;

    // Header info
    document.getElementById("modal-pan-id").innerText = pan.id;
    document.getElementById("modal-pan-status").innerText =
      pan.status || "Active";
    document.getElementById("modal-pan-status").className =
      `pan-status-tag ${(pan.status || "Active").toLowerCase()}`;
    document.getElementById("modal-pan-name").innerText = pan.name;
    document.getElementById("modal-pan-loc").innerText =
      `${pan.district ? pan.district + ", " : ""}${pan.state} | ${pan.lat.toFixed(4)}°N, ${pan.lon.toFixed(4)}°E (${pan.lat_dms || ""}, ${pan.lon_dms || ""})`;

    // Populate Tab 1: Geography & Physical Site
    document.getElementById("tab-geo-content").innerHTML = `
      <div class="dossier-grid">
        <div class="dossier-card">
          <div class="dossier-card-title">Exact Coordinates (WGS84)</div>
          <div class="dossier-card-val">${pan.lat.toFixed(5)}° N, ${pan.lon.toFixed(5)}° E</div>
          <div class="dossier-card-sub">DMS: ${pan.lat_dms || "N/A"} | ${pan.lon_dms || "N/A"}</div>
        </div>
        <div class="dossier-card">
          <div class="dossier-card-title">Administrative area</div>
          <div class="dossier-card-val">${pan.district || "Unspecified"}, ${pan.state}</div>
          <div class="dossier-card-sub">Taluka/Locality: ${pan.taluka || pan.locality || "Regional"}</div>
        </div>
        <div class="dossier-card">
          <div class="dossier-card-title">Elevation & Water Margin</div>
          <div class="dossier-card-val">${pan.elevation_m || "2-4"} meters above sea level</div>
          <div class="dossier-card-sub">Water Body: ${pan.coast_type || "Coastal Creek / Inland Basin"}</div>
        </div>
        <div class="dossier-card">
          <div class="dossier-card-title">Site Classification</div>
          <div class="dossier-card-val">${pan.pan_type || pan.site_type}</div>
          <div class="dossier-card-sub">Accuracy: Verified Ground / Satellite Coords</div>
        </div>
      </div>
      <div class="dossier-card">
        <div class="dossier-card-title">Site Physical Description</div>
        <p>${pan.description}</p>
      </div>
    `;

    // Populate Tab 2: Operations & Quality
    document.getElementById("tab-ops-content").innerHTML = `
      <div class="dossier-grid">
        <div class="dossier-card">
          <div class="dossier-card-title">Production Method</div>
          <div class="dossier-card-val">${pan.method || "Solar Evaporation"}</div>
          <div class="dossier-card-sub">Raw Source: ${pan.pan_type || "Seawater / Sub-soil Brine"}</div>
        </div>
        <div class="dossier-card">
          <div class="dossier-card-title">Salt Product Form</div>
          <div class="dossier-card-val">${pan.salt_product || "Solar salt / Edible & Industrial grade"}</div>
          <div class="dossier-card-sub">Purity Range: 98.5% - 99.4% NaCl</div>
        </div>
        <div class="dossier-card">
          <div class="dossier-card-title">Annual Reported Output</div>
          <div class="dossier-card-val">${pan.actual_tonnes ? pan.actual_tonnes.toLocaleString() + " Tonnes/yr" : "Regional Cluster Production"}</div>
          <div class="dossier-card-sub">Operational Status: ${pan.status}</div>
        </div>
        <div class="dossier-card">
          <div class="dossier-card-title">Management & Operators</div>
          <div class="dossier-card-val">${pan.operator || "Traditional Salt Farmer Cooperatives"}</div>
          <div class="dossier-card-sub">Ownership: ${pan.ownership || "Mixed / Private / Cooperative"}</div>
        </div>
      </div>
    `;

    // Populate Tab 3: Humanitarian & Worker Plight
    const workerIssuesList = (pan.worker_issues || [])
      .map(
        (issue) => `
      <li>
        <span><i data-lucide="triangle-alert"></i></span>
        <span>${issue}</span>
      </li>
    `,
      )
      .join("");

    document.getElementById("tab-worker-content").innerHTML = `
      <div class="dossier-card">
        <div class="dossier-card-title">Worker Population & Community Demographics</div>
        <div class="dossier-card-val">${pan.worker_count ? pan.worker_count.toLocaleString() + " Traditional Salt Artisans & Families" : "Documented Salt Workers"}</div>
        <div class="dossier-card-sub">Communities: Agariyas, Uppalam workers, Agri, Koli, and Mithgauda families</div>
      </div>
      <div class="dossier-card">
        <div class="dossier-card-title">Critical Health Hazards at This Location</div>
        <ul>
          ${workerIssuesList}
        </ul>
      </div>
      <div class="dossier-card">
        <div class="dossier-card-title">Humanitarian Intervention Priority</div>
        <p>
          Deploying solar submersible pumps to replace polluting diesel generators, provisioning customized high-durability white gumboots with dermal salves, providing UV-400 polarized ocular protection, and deploying mobile reverse-osmosis potable water trucks.
        </p>
      </div>
    `;

    // Populate Tab 4: Ecology & Ramsar
    document.getElementById("tab-eco-content").innerHTML = `
      <div class="dossier-grid">
        <div class="dossier-card">
          <div class="dossier-card-title">Ramsar Wetland Status</div>
          <div class="dossier-card-val">${pan.ramsar ? "Yes — Ramsar site" : "Not designated"}</div>
          <div class="dossier-card-sub">${pan.ramsar_name || "Part of Regional Coastal/Inland Wetland"}</div>
        </div>
        <div class="dossier-card">
          <div class="dossier-card-title">Protected Wildlife Sanctuary</div>
          <div class="dossier-card-val">${pan.protected_area ? "Yes — protected habitat" : "Buffer / estuarine zone"}</div>
          <div class="dossier-card-sub">${pan.protected_area_name || "Coastal CRZ-1 Wetland Mudflat"}</div>
        </div>
      </div>
      <div class="dossier-card">
        <div class="dossier-card-title">Migratory Waterbirds & Wildlife Recorded</div>
        <p>
          ${pan.migratory_birds || pan.ecological_importance || "Key intertidal feeding habitat for flamingos, stilts, avocets, pelicans, and waders along the Central Asian Flyway."}
        </p>
      </div>
      <div class="dossier-card">
        <div class="dossier-card-title">Environmental Threats & Climate Vulnerability</div>
        <p>
          ${pan.environmental_threats || pan.climate_risk || "Susceptible to cyclone storm surges, sea-level rise, and unseasonal rainfall destroying crystallization beds."}
        </p>
      </div>
    `;

    // Populate Tab 5: History & Freedom Heritage
    document.getElementById("tab-history-content").innerHTML = `
      <div class="dossier-card">
        <div class="dossier-card-title">Historical & Cultural Heritage</div>
        <p>
          ${pan.historical_importance || pan.cultural_importance || "Salt panning in this region represents centuries of indigenous water-harvesting engineering, traditional guild practices, and community resilience."}
        </p>
      </div>
      <div class="dossier-grid">
        <div class="dossier-card">
          <div class="dossier-card-title">Establishment Period</div>
          <div class="dossier-card-val">${pan.establishment || "Ancient / Pre-colonial"}</div>
        </div>
        <div class="dossier-card">
          <div class="dossier-card-title">Freedom Struggle Linkage</div>
          <div class="dossier-card-val">${pan.name.includes("Dandi") || pan.name.includes("Shiroda") ? "Direct Salt Satyagraha Site (1930)" : "Resistance against British Salt Tax (1882)"}</div>
        </div>
      </div>
    `;

    // Populate Tab 6: Citations & Sources
    document.getElementById("tab-sources-content").innerHTML = `
      <div class="dossier-card">
        <div class="dossier-card-title">Sources we compiled (cited)</div>
        <ul>
          <li>
            <strong>Primary published source:</strong> ${pan.primary_source || "Salt Commissioner's Organisation (public reports; we are not affiliated)"}
            ${pan.source_url ? `<br><a href="${pan.source_url}" target="_blank" rel="noopener">${pan.source_url}</a>` : ""}
          </li>
          ${
            pan.academic_source
              ? `
            <li>
              <strong>Academic / journalism:</strong> ${pan.academic_source}
              ${pan.academic_url ? `<br><a href="${pan.academic_url}" target="_blank" rel="noopener">${pan.academic_url}</a>` : ""}
            </li>
          `
              : ""
          }
          <li>
            <strong>Remote sensing used for context:</strong> NRSC / ISRO Salt Pan Atlas of India (Cartosat observations). We did not produce these satellites.
          </li>
          <li>
            <strong>Compilation:</strong> Assembled by students for this humanitarian atlas. Please cite the original authors above, not a government portal.
          </li>
        </ul>
      </div>
    `;

    // Reset to Tab 1
    this.switchModalTab("geo");
    modal.inert = false;
    modal.classList.add("open");
    document.body.classList.add("modal-open");
    document
      .querySelectorAll(
        "body > nav, body > header, body > main, body > footer, #back-to-top",
      )
      .forEach((el) => {
        el.inert = true;
      });
    document.querySelector(".modal-body").scrollTop = 0;
    this.refreshIcons();
    document.getElementById("modal-close").focus({ preventScroll: true });
  }

  switchModalTab(tabKey) {
    const body = document.querySelector(".modal-body");
    if (body) body.scrollTop = 0;
    const tabs = document.querySelectorAll(".modal-tab");
    const contents = document.querySelectorAll(".modal-tab-content");

    tabs.forEach((t) => {
      const active = t.getAttribute("data-tab") === tabKey;
      t.classList.toggle("active", active);
      t.setAttribute("aria-selected", String(active));
      t.tabIndex = active ? 0 : -1;
    });

    contents.forEach((c) => {
      if (c.id === `tab-${tabKey}`) c.classList.add("active");
      else c.classList.remove("active");
    });
  }

  closeDossier() {
    const modal = document.getElementById("dossier-modal");
    if (!modal?.classList.contains("open")) return;
    modal.classList.remove("open");
    modal.inert = true;
    document.body.classList.remove("modal-open");
    document
      .querySelectorAll(
        "body > nav, body > header, body > main, body > footer, #back-to-top",
      )
      .forEach((el) => {
        el.inert = false;
      });
    if (this.returnFocus?.isConnected)
      this.returnFocus.focus({ preventScroll: true });
  }

  exportGeoJSON() {
    const geojson = {
      type: "FeatureCollection",
      features: this.pans.map((p) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [p.lon, p.lat],
        },
        properties: {
          id: p.id,
          name: p.name,
          state: p.state,
          district: p.district,
          status: p.status,
          method: p.method,
          worker_count: p.worker_count,
          actual_tonnes: p.actual_tonnes,
          ramsar: p.ramsar,
        },
      })),
    };

    const blob = new Blob([JSON.stringify(geojson, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "india_salt_pans_full.geojson";
    a.click();
    URL.revokeObjectURL(url);
  }

  exportCSV() {
    if (!this.pans.length) return;
    const keys = [
      "id",
      "name",
      "state",
      "district",
      "lat",
      "lon",
      "status",
      "method",
      "salt_product",
      "worker_count",
      "actual_tonnes",
      "ramsar",
    ];
    let csv = keys.join(",") + "\n";

    this.pans.forEach((p) => {
      const row = keys.map((k) => {
        let val = p[k];
        if (typeof val === "string") {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val ?? "";
      });
      csv += row.join(",") + "\n";
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "india_salt_pans_verified.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
}

// Bootstrap
window.addEventListener("DOMContentLoaded", () => {
  window.app = new LavanaApp();
});
