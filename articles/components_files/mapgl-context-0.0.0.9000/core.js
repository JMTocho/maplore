// Shared core for the mapgl context components: reading a layer's data,
// finding which features are in view, highlighting features, moving the map
// to a feature, reading the layer's color scale and formatting numbers.
//
// Each component (view summary, ranking, context tooltip, search)
// registers itself in MapglContext.components and is started from
// MapglContext.init(), the single render hook added from R.
(function () {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";
  var DEG = Math.PI / 180;
  var COMPACT_FROM = 1e6;
  var NOTHING = ["==", ["literal", 1], ["literal", 0]];

  // ---------------------------------------------------------------------
  // Small helpers
  // ---------------------------------------------------------------------

  function isNumber(v) {
    return typeof v === "number" && isFinite(v);
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function svg(tag, attrs) {
    var node = document.createElementNS(SVG_NS, tag);
    Object.keys(attrs || {}).forEach(function (k) {
      node.setAttribute(k, attrs[k]);
    });
    return node;
  }

  // Lowercase without accents, for searching ("Córdoba" matches "cordoba").
  function normalizeText(s) {
    return String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  }

  // Runs `fn` at most once per animation frame while the map moves. If one
  // run takes longer than `slowMs`, stops updating during moves and only
  // updates when the map stops, so panning stays smooth on large layers.
  function onViewChange(map, fn, slowMs) {
    var pending = null;
    var moveEndOnly = false;
    var run = function () {
      if (pending) return;
      pending = requestAnimationFrame(function () {
        pending = null;
        var t0 = performance.now();
        fn();
        if (!moveEndOnly && performance.now() - t0 > (slowMs || 25)) {
          moveEndOnly = true;
          map.off("move", run);
        }
      });
    };
    map.on("move", run);
    map.on("moveend", run);
    // The first render, and whenever tiles finish loading.
    map.on("idle", run);
    return function () {
      if (!moveEndOnly) map.off("move", run);
      map.off("moveend", run);
      map.off("idle", run);
      if (pending) cancelAnimationFrame(pending);
    };
  }

  // ---------------------------------------------------------------------
  // Number formatting
  // ---------------------------------------------------------------------

  function Formatter(o) {
    this.prefix = o.prefix || "";
    this.suffix = o.suffix || "";
    this.number = new Intl.NumberFormat(o.locale, {
      minimumFractionDigits: o.digits,
      maximumFractionDigits: o.digits,
    });
    this.compact = new Intl.NumberFormat(o.locale, {
      notation: "compact",
      maximumFractionDigits: 1,
    });
    this.integer = new Intl.NumberFormat(o.locale, { maximumFractionDigits: 0 });
    this.percent = new Intl.NumberFormat(o.locale, { style: "percent", maximumFractionDigits: 0 });
  }

  // Large numbers are abbreviated (12.4M), smaller ones use `digits`.
  Formatter.prototype.num = function (v) {
    return Math.abs(v) >= COMPACT_FROM ? this.compact.format(v) : this.number.format(v);
  };

  Formatter.prototype.fmt = function (v) {
    return this.prefix + this.num(v) + this.suffix;
  };

  Formatter.prototype.int = function (v) {
    return this.integer.format(v);
  };

  Formatter.prototype.share = function (part, whole) {
    var s = part / whole;
    return s > 0 && s < 0.01 ? "<" + this.percent.format(0.01) : this.percent.format(s);
  };

  // Shares that round to 0% or 100% without being exactly that are shown as
  // <1% and >99%.
  Formatter.prototype.pct = function (s) {
    if (s > 0 && s < 0.01) return "<" + this.percent.format(0.01);
    if (s < 1 && s > 0.99) return ">" + this.percent.format(0.99);
    return this.percent.format(s);
  };

  // ---------------------------------------------------------------------
  // Layer data
  // ---------------------------------------------------------------------

  // Source of a layer, from the widget data. mapgl sends sf objects as
  // inline GeoJSON, either on the layer or as a separate source.
  function layerSource(x, layerId) {
    var layer = (x.layers || []).filter(function (l) {
      return l.id === layerId;
    })[0];
    if (!layer) return null;
    var source = layer.source;
    if (typeof source === "string") {
      source = (x.sources || []).filter(function (s) {
        return s.id === source;
      })[0];
    }
    var data = source && source.data;
    if (typeof data === "string") {
      try {
        data = JSON.parse(data);
      } catch (e) {
        return null;
      }
    }
    if (!data || !data.features) return null;
    return { geojson: data, clustered: source.cluster === true };
  }

  // All coordinate rings of a geometry; points and lines become rings too,
  // which is enough for the vertex test.
  function geometryRings(g) {
    if (!g) return [];
    switch (g.type) {
      case "Polygon":
      case "MultiLineString":
        return g.coordinates;
      case "MultiPolygon":
        return [].concat.apply([], g.coordinates);
      case "LineString":
      case "MultiPoint":
        return [g.coordinates];
      case "Point":
        return [[g.coordinates]];
      case "GeometryCollection":
        return [].concat.apply([], g.geometries.map(geometryRings));
      default:
        return [];
    }
  }

  function ringsBbox(rings) {
    var b = [Infinity, Infinity, -Infinity, -Infinity];
    rings.forEach(function (ring) {
      ring.forEach(function (c) {
        if (c[0] < b[0]) b[0] = c[0];
        if (c[1] < b[1]) b[1] = c[1];
        if (c[0] > b[2]) b[2] = c[0];
        if (c[1] > b[3]) b[3] = c[1];
      });
    });
    return b;
  }

  // Features of a layer as {id, props, rings, bbox, isPoint}. The id is the
  // feature's position, which matches the ids MapLibre/Mapbox assign with
  // generateId: true. Parsed once per layer and shared by all components.
  function layerData(map, x, layerId) {
    var cache = map._mapglContext.layers;
    if (cache[layerId]) return cache[layerId];
    var source = layerSource(x, layerId);
    if (!source) {
      console.error("mapgl context: layer " + layerId + " has no inline GeoJSON source");
      return null;
    }
    var features = source.geojson.features.map(function (f, i) {
      var rings = geometryRings(f.geometry);
      return {
        id: i,
        props: f.properties || {},
        rings: rings,
        bbox: ringsBbox(rings),
        isPoint: !!f.geometry && (f.geometry.type === "Point" || f.geometry.type === "MultiPoint"),
      };
    });
    var data = {
      layerId: layerId,
      features: features,
      clustered: source.clustered,
      pointsOnly: features.length > 0 && features.every(function (f) { return f.isPoint; }),
    };
    data.tracker = new Tracker(map, data);
    data.highlighter = new Highlighter(map, data);
    cache[layerId] = data;
    return data;
  }

  // Rows of {id, value, weight, name, feature} for the features with a
  // numeric value in `column`.
  function numericRows(data, column, weightColumn, nameColumn) {
    var rows = [];
    data.features.forEach(function (f) {
      var value = f.props[column];
      if (!isNumber(value)) return;
      var weight = weightColumn ? f.props[weightColumn] : 1;
      if (!isNumber(weight) || weight < 0) weight = 0;
      rows.push({
        id: f.id,
        value: value,
        weight: weight,
        name: nameColumn ? f.props[nameColumn] : null,
        feature: f,
      });
    });
    return rows;
  }

  // ---------------------------------------------------------------------
  // Which features are in view
  //
  // queryRenderedFeatures() alone is not enough: it misses features too
  // small to be drawn at low zoom, and on the globe projection it misses
  // some features far from the center. So a feature is in view if it was
  // rendered OR a geometric test against the screen finds it.
  // ---------------------------------------------------------------------

  // Even-odd rule over all rings, so holes are handled.
  function pointInRings(pt, rings) {
    var inside = false;
    rings.forEach(function (ring) {
      for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        var a = ring[i];
        var b = ring[j];
        if ((a[1] > pt[1]) !== (b[1] > pt[1]) &&
            pt[0] < ((b[0] - a[0]) * (pt[1] - a[1])) / (b[1] - a[1]) + a[0]) {
          inside = !inside;
        }
      }
    });
    return inside;
  }

  function inBbox(pt, b) {
    return pt[0] >= b[0] && pt[0] <= b[2] && pt[1] >= b[1] && pt[1] <= b[3];
  }

  // Bounding box overlap, allowing for the view crossing the antimeridian
  // (map bounds can go below -180 or above 180).
  function bboxOverlaps(b, v) {
    if (b[3] < v[1] || b[1] > v[3]) return false;
    for (var k = -360; k <= 360; k += 360) {
      if (b[0] + k <= v[2] && b[2] + k >= v[0]) return true;
    }
    return false;
  }

  function isGlobe(map) {
    var p = map.getProjection && map.getProjection();
    return !!p && (p.type === "globe" || p.name === "globe");
  }

  function Tracker(map, data) {
    this.map = map;
    this.data = data;
    this._key = null;
    this._ids = null;
    var self = this;
    // Tiles finishing loading can change what is rendered at the same camera.
    map.on("idle", function () {
      self._key = null;
    });
  }

  Tracker.prototype.layerShown = function () {
    var map = this.map;
    var id = this.data.layerId;
    var layer = map.getLayer(id);
    if (!layer) return false;
    if (map.getLayoutProperty(id, "visibility") === "none") return false;
    var z = map.getZoom();
    if (layer.minzoom != null && z < layer.minzoom) return false;
    if (layer.maxzoom != null && z >= layer.maxzoom) return false;
    return true;
  };

  // Ids of the features in view, cached for the current camera so several
  // components on the same layer share the work.
  Tracker.prototype.visibleIds = function () {
    var map = this.map;
    var c = map.getCenter();
    var canvas = map.getCanvas();
    var key = [c.lng, c.lat, map.getZoom(), map.getBearing(), map.getPitch(),
      canvas.clientWidth, canvas.clientHeight].join(",");
    if (key === this._key) return this._ids;
    this._key = key;
    this._ids = this.compute();
    return this._ids;
  };

  Tracker.prototype.compute = function () {
    var map = this.map;
    var data = this.data;
    if (!this.layerShown()) return [];

    var seen = {};
    var ids = [];
    var n = data.features.length;

    // On a clustered source, rendered features are clusters rather than the
    // original points, and the layer's filter only hides the clusters: use
    // the geometric test alone.
    // The geometric test ignores the layer's filter, so with a filter only
    // rendered features can be trusted.
    var filtered = !data.clustered && !!map.getFilter(data.layerId);
    // Rendered features add polygons that cross the screen edge with no
    // vertex on screen. For points the geometric test already finds them
    // all, and querying rendered features is the slow part with many points.
    if (filtered || (!data.clustered && !data.pointsOnly)) {
      // On the globe, queryRenderedFeatures() also returns features on the
      // far side (New Zealand, through Tokelau, when looking at Patagonia):
      // keep only those with some part on the visible hemisphere.
      var facing = this.facingTest();
      var features = data.features;
      // A polygon split across tiles is returned once per tile; keep one.
      map.queryRenderedFeatures({ layers: [data.layerId] }).forEach(function (f) {
        if (f.id == null || seen[f.id] || f.id < 0 || f.id >= n) return;
        seen[f.id] = true;
        var hasFacingPart = features[f.id].rings.some(function (ring) {
          return ring.some(facing);
        });
        if (hasFacingPart) ids.push(f.id);
      });
      if (filtered) return ids;
    }

    this.geometricIds().forEach(function (id) {
      if (seen[id]) return;
      seen[id] = true;
      ids.push(id);
    });
    return ids;
  };

  // A function telling whether a [lng, lat] is on the hemisphere facing the
  // camera. Always true off the globe. On the globe, points on the far side
  // also project onto the canvas, so they have to be ruled out.
  Tracker.prototype.facingTest = function () {
    if (!isGlobe(this.map)) {
      return function () { return true; };
    }
    var center = this.map.getCenter();
    var c0 = Math.cos(center.lat * DEG);
    var cx = c0 * Math.cos(center.lng * DEG);
    var cy = c0 * Math.sin(center.lng * DEG);
    var cz = Math.sin(center.lat * DEG);
    return function (c) {
      var k = Math.cos(c[1] * DEG);
      return cx * k * Math.cos(c[0] * DEG) + cy * k * Math.sin(c[0] * DEG) +
        cz * Math.sin(c[1] * DEG) > 0;
    };
  };

  // Features with a vertex on screen, or containing a point of the screen
  // (when zoomed in inside a large polygon, no vertex is on screen).
  Tracker.prototype.geometricIds = function () {
    var map = this.map;
    var canvas = map.getCanvas();
    var w = canvas.clientWidth;
    var h = canvas.clientHeight;
    var globe = isGlobe(map);
    var facing = this.facingTest();
    var onScreen = function (c) {
      if (!facing(c)) return false;
      var p = map.project(c);
      return p.x >= 0 && p.x <= w && p.y >= 0 && p.y <= h;
    };

    // A 3x3 grid of screen points, keeping only those that land on the map
    // (on the globe, screen corners can fall outside the sphere).
    var probes = [];
    [0.02, 0.5, 0.98].forEach(function (fx) {
      [0.02, 0.5, 0.98].forEach(function (fy) {
        var px = fx * w;
        var py = fy * h;
        var ll = map.unproject([px, py]);
        var back = map.project(ll);
        if (Math.abs(back.x - px) < 2 && Math.abs(back.y - py) < 2) {
          probes.push([ll.lng, ll.lat]);
        }
      });
    });

    // Cheap rejection before projecting: features whose bounding box is
    // outside the (padded) bounds of the view. On the globe at low zoom the
    // bounds are not reliable, so every feature goes to the exact test.
    var view = null;
    if (!globe || map.getZoom() >= 3) {
      var b = map.getBounds();
      var padX = (b.getEast() - b.getWest()) * 0.1;
      var padY = (b.getNorth() - b.getSouth()) * 0.1;
      view = [b.getWest() - padX, b.getSouth() - padY, b.getEast() + padX, b.getNorth() + padY];
    }

    var ids = [];
    this.data.features.forEach(function (f) {
      if (f.rings.length === 0) return;
      if (view && !bboxOverlaps(f.bbox, view)) return;
      var hit = f.rings.some(function (ring) {
        return ring.some(onScreen);
      });
      if (!hit) {
        hit = probes.some(function (pt) {
          return inBbox(pt, f.bbox) && pointInRings(pt, f.rings);
        });
      }
      if (hit) ids.push(f.id);
    });
    return ids;
  };

  // ---------------------------------------------------------------------
  // Highlighting features and moving the map to them
  // ---------------------------------------------------------------------

  // An outline layer on top of the layer, reusing its source. Built on first
  // use; the user's own layer is never modified. Shared by all components on
  // the same layer.
  function Highlighter(map, data) {
    this.map = map;
    this.data = data;
    this.id = "mapgl-context-highlight-" + data.layerId;
    this.color = "#1f2328";
    this._timer = null;
  }

  Highlighter.prototype.ensure = function () {
    var map = this.map;
    if (map.getLayer(this.id)) return true;
    var layer = map.getLayer(this.data.layerId);
    if (!layer) return false;
    var spec = this.data.pointsOnly
      ? {
          type: "circle",
          paint: {
            "circle-radius": 8,
            "circle-opacity": 0,
            "circle-stroke-color": this.color,
            "circle-stroke-width": 2,
          },
        }
      : { type: "line", paint: { "line-color": this.color, "line-width": 2.5 } };
    spec.id = this.id;
    spec.source = layer.source;
    if (layer.sourceLayer) spec["source-layer"] = layer.sourceLayer;
    spec.filter = NOTHING;
    try {
      map.addLayer(spec);
    } catch (e) {
      return false;
    }
    return true;
  };

  Highlighter.prototype.setColor = function (color) {
    if (!color) return;
    this.color = color;
    if (this.map.getLayer(this.id)) {
      var prop = this.data.pointsOnly ? "circle-stroke-color" : "line-color";
      this.map.setPaintProperty(this.id, prop, color);
    }
  };

  Highlighter.prototype.filter = function (filter) {
    clearTimeout(this._timer);
    if (!this.ensure()) return;
    this.map.setFilter(this.id, filter || NOTHING);
  };

  Highlighter.prototype.clear = function () {
    this.filter(null);
  };

  Highlighter.prototype.ids = function (ids) {
    this.filter(["in", ["id"], ["literal", ids]]);
  };

  Highlighter.prototype.one = function (id) {
    this.filter(["==", ["id"], id]);
  };

  // Moves the map to a feature and outlines it until a moment after arriving.
  Highlighter.prototype.goTo = function (feature) {
    var map = this.map;
    var self = this;
    var b = feature.bbox;
    if (feature.isPoint) {
      map.easeTo({ center: [b[0], b[1]], zoom: Math.max(map.getZoom() + 1, 8) });
    } else {
      map.fitBounds([[b[0], b[1]], [b[2], b[3]]], { padding: 60, maxZoom: 12 });
    }
    this.one(feature.id);
    map.once("moveend", function () {
      clearTimeout(self._timer);
      self._timer = setTimeout(function () {
        self.clear();
      }, 2000);
    });
  };

  // ---------------------------------------------------------------------
  // Colors: read the layer's color scale
  // ---------------------------------------------------------------------

  var colorCtx = null;

  // Any CSS color to [r, g, b, a], using the browser's own parser.
  function parseColor(c) {
    if (typeof c !== "string") return null;
    if (!colorCtx) colorCtx = document.createElement("canvas").getContext("2d");
    colorCtx.fillStyle = "#000000";
    colorCtx.fillStyle = c;
    var s = colorCtx.fillStyle;
    if (s[0] === "#") {
      return [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16), 1];
    }
    var m = s.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    var parts = m[1].split(",").map(Number);
    return [parts[0], parts[1], parts[2], parts.length > 3 ? parts[3] : 1];
  }

  function colorToCss(c) {
    return "rgb(" + Math.round(c[0]) + "," + Math.round(c[1]) + "," + Math.round(c[2]) + ")";
  }

  function mix(a, b, t) {
    return [0, 1, 2, 3].map(function (i) {
      return a[i] + (b[i] - a[i]) * t;
    });
  }

  // True if `input` reads the column, e.g. ["get", "x"] or
  // ["to-number", ["get", "x"]].
  function readsColumn(input, column) {
    if (!Array.isArray(input)) return false;
    if (input[0] === "get") return input[1] === column;
    if (input[0] === "to-number" || input[0] === "number") return readsColumn(input[1], column);
    return false;
  }

  // A function value -> [r, g, b, a] for a color expression, or null when
  // the expression is not a scale on `column`.
  function colorScale(expr, column) {
    if (typeof expr === "string") {
      var fixed = parseColor(expr);
      return fixed && function () { return fixed; };
    }
    if (!Array.isArray(expr)) return null;
    var op = expr[0];
    var i;

    if (op === "interpolate" || op === "interpolate-hcl" || op === "interpolate-lab") {
      if (!readsColumn(expr[2], column)) return null;
      var base = expr[1] && expr[1][0] === "exponential" ? expr[1][1] : 1;
      var stops = [];
      for (i = 3; i + 1 < expr.length; i += 2) {
        var col = parseColor(expr[i + 1]);
        if (!isNumber(expr[i]) || !col) return null;
        stops.push([expr[i], col]);
      }
      if (stops.length === 0) return null;
      return function (v) {
        if (v <= stops[0][0]) return stops[0][1];
        for (var k = 1; k < stops.length; k++) {
          if (v <= stops[k][0]) {
            var z0 = stops[k - 1][0];
            var z1 = stops[k][0];
            var t = base === 1
              ? (v - z0) / (z1 - z0)
              : (Math.pow(base, v - z0) - 1) / (Math.pow(base, z1 - z0) - 1);
            return mix(stops[k - 1][1], stops[k][1], t);
          }
        }
        return stops[stops.length - 1][1];
      };
    }

    if (op === "step") {
      if (!readsColumn(expr[1], column)) return null;
      var first = parseColor(expr[2]);
      if (!first) return null;
      var steps = [];
      for (i = 3; i + 1 < expr.length; i += 2) {
        var sc = parseColor(expr[i + 1]);
        if (!isNumber(expr[i]) || !sc) return null;
        steps.push([expr[i], sc]);
      }
      return function (v) {
        var out = first;
        steps.forEach(function (s) {
          if (v >= s[0]) out = s[1];
        });
        return out;
      };
    }

    return null;
  }

  // The layer's color scale on `column` as value -> CSS color, or null.
  // Returns undefined while the style is still loading, so callers retry.
  function layerColors(map, layerId, column) {
    var layer = map.getLayer(layerId);
    if (!layer) return map.isStyleLoaded() ? null : undefined;
    var prop = {
      fill: "fill-color",
      circle: "circle-color",
      line: "line-color",
      "fill-extrusion": "fill-extrusion-color",
    }[layer.type];
    var scale = prop && colorScale(map.getPaintProperty(layerId, prop), column);
    if (!scale) return null;
    return function (v) {
      return colorToCss(scale(v));
    };
  }

  // ---------------------------------------------------------------------
  // Collapsible panel shell shared by the panel components
  // ---------------------------------------------------------------------

  // A control container with a header (title, value shown when collapsed,
  // collapse button) and a body. `onToggle` is called after collapsing or
  // expanding.
  function Panel(map, o, onToggle) {
    var self = this;
    var L = o.labels;
    this.labels = L;
    this.onToggle = onToggle;

    var c = el("div", "maplibregl-ctrl mapboxgl-ctrl mapgl-context-panel");
    c.style.width = o.width + "px";
    if (o.color) c.style.setProperty("--mgc-accent", o.color);
    this.container = c;

    var header = el("div", "mgc-header");
    this.titleEl = el("span", "mgc-title");
    this.miniValueEl = el("span", "mgc-mini-value");
    header.appendChild(this.titleEl);
    header.appendChild(this.miniValueEl);
    if (o.collapsible) {
      var button = el("button", "mgc-toggle");
      button.type = "button";
      button.addEventListener("click", function () {
        self.setCollapsed(!self.collapsed);
      });
      header.appendChild(button);
      this.toggleEl = button;
    }
    c.appendChild(header);

    // Screen readers announce the new content after each move.
    this.body = el("div", "mgc-body");
    this.body.setAttribute("role", "status");
    this.body.setAttribute("aria-live", "polite");
    c.appendChild(this.body);

    var start = o.collapsed;
    if (start == null) start = o.collapsible && map.getCanvas().clientWidth < 480;
    this.setCollapsed(!!start && o.collapsible, true);
  }

  Panel.prototype.setCollapsed = function (collapsed, silent) {
    var L = this.labels;
    this.collapsed = collapsed;
    this.container.classList.toggle("mgc-collapsed", collapsed);
    if (this.toggleEl) {
      this.toggleEl.textContent = collapsed ? "+" : "−";
      this.toggleEl.setAttribute("aria-label", collapsed ? L.expand : L.collapse);
      this.toggleEl.setAttribute("aria-expanded", String(!collapsed));
      this.toggleEl.title = collapsed ? L.expand : L.collapse;
    }
    if (!silent && this.onToggle) this.onToggle();
  };

  // A clickable feature name: hovering outlines it, clicking moves the map.
  function featureLink(highlighter, feature, text, title) {
    var link = el("button", "mgc-link", String(text));
    link.type = "button";
    link.title = title;
    link.addEventListener("click", function () {
      highlighter.goTo(feature);
    });
    link.addEventListener("mouseenter", function () {
      highlighter.one(feature.id);
    });
    link.addEventListener("mouseleave", function () {
      highlighter.clear();
    });
    return link;
  }

  // ---------------------------------------------------------------------
  // Registry and entry point
  // ---------------------------------------------------------------------

  // Adds a control and registers it with mapgl's control list, so mapgl's
  // cleanup on re-render removes it too.
  function addControl(map, control, position, type) {
    map.addControl(control, position);
    if (Array.isArray(map.controls)) {
      map.controls.push({ type: type, control: control });
    }
    var registry = map._mapglContext.controls;
    (registry[type] = registry[type] || []).push(control);
  }

  window.MapglContext = {
    components: {},
    util: {
      isNumber: isNumber,
      el: el,
      svg: svg,
      normalizeText: normalizeText,
      onViewChange: onViewChange,
      Formatter: Formatter,
      numericRows: numericRows,
      layerColors: layerColors,
      Panel: Panel,
      featureLink: featureLink,
      addControl: addControl,
    },
    layerData: layerData,

    init: function (el, x) {
      var map = el.map;
      var config = x.mapgl_context;
      if (!map || !config) return;
      // Fresh state on every render: mapgl rebuilds the map on re-render.
      map._mapglContext = { layers: {}, controls: {} };
      var components = this.components;
      Object.keys(config).forEach(function (type) {
        var start = components[type];
        if (!start) {
          console.error("mapgl context: unknown component " + type);
          return;
        }
        Object.keys(config[type]).forEach(function (key) {
          try {
            start(map, x, config[type][key]);
          } catch (e) {
            console.error("mapgl context: " + type + " failed", e);
          }
        });
      });
    },
  };
})();
