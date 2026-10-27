# LAVANA

An independent student atlas of Indian salt pans, built with vanilla HTML, CSS, and JavaScript. There is no framework, package installation, compilation step, or build server required to run the site.

## Run locally

From the project directory:

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

Open <http://127.0.0.1:8000>. Map imagery, terrain, fonts, and the CDN libraries need an internet connection. The embedded dataset supports local file access or a failed JSON fetch; it does not supply offline map imagery.

## Project structure

- `index.html`: page content, navigation, exploration controls, and the dossier shell.
- `css/style.css`: design tokens, reusable components, responsive layouts, and reduced-motion support.
- `js/app.js`: data loading, synchronized filters, registry pagination, dossiers, exports, and the chemistry slider.
- `js/map.js`: the Leaflet map, tile layers, and site markers.
- `js/three-crystallizer.js`: the MapLibre satellite and terrain viewer.
- `js/ui.js`: mobile navigation, active-section tracking, and the back-to-top control.
- `data/`, `js/fallback_data.js`, and the root CSV files: existing research data.
- `scripts/`: dataset and PDF generation. These scripts overwrite generated research files when run; they are not needed for website styling or development.

## Design system

The visual direction follows the colors of salt landscapes: a photograph-led cover, deep lagoon navigation and satellite workspace, brine-pink science, and warm mineral colors around the worker story. Reading surfaces stay lighter within these colored sections.

| Token        | Value     | Use                             |
| ------------ | --------- | ------------------------------- |
| Deep lagoon  | `#173F4C` | Navigation, cover, 3D workspace |
| Mineral sand | `#E8D7C8` | Map exploration section         |
| Brine pink   | `#EDD1DC` | Crystallization science         |
| Warm peach   | `#F0C9A0` | Cover actions and statistics    |
| Plum         | `#603C4E` | Worker testimony                |
| Teal         | `#206B75` | Actions on light surfaces       |

Sora is used throughout, with deliberate size and weight differences for headings, body copy, and controls. The CSS begins with shared tokens, followed by components and responsive rules. Put presentation in component classes instead of inline styles. Animations are limited to the cover entrance and user-triggered disclosures; reduced-motion preferences are respected.

The layout uses three distinct patterns:

```text
Cover:       [ heading + actions over a full landscape photograph ]
             [             deep lagoon statistics band            ]
Atlas:       [ filter rail ][             interactive map        ]
Science:     [ live slider ][              process stages        ]
```

On phones, these become single-column layouts; map filters use a compact grid. Numbering is reserved for the actual production sequence.

## Manual verification

1. Search and filter from both the map and directory; confirm both surfaces stay synchronized. Try the suggested map searches, reset, and an empty search result.
2. Open a map popup, every dossier tab, and the corresponding 3D site. Check all camera modes and tile backgrounds.
3. Move the Baumé slider through its phases; confirm the displayed explanation and highlighted process stage change together. Expand the process stages and welfare actions.
4. Load more directory entries and export CSV and GeoJSON; both exports continue to include all 48 records.
5. Use keyboard navigation: Tab, Shift+Tab, Escape, and Left/Right arrows in dossier tabs. Check focus returns after closing a dossier.
6. Check widths of 320, 390, 768, 1024, and 1440 pixels. Confirm the mobile menu works, text is readable, and there is no horizontal page scrolling.
7. Block the JSON request or external map libraries to verify the data fallback and map-unavailable messages.

The website redesign does not change the existing datasets, research documents, or data-generation scripts. Dataset caveats and source qualifications remain part of the original research files.
