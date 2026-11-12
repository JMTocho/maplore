// Rank morph: a button that moves every polygon of a layer out of the map
// and lines them up in a grid, all at the same size, sorted by a column; and
// back to the map. The shapes keep their form, so readers see at once where
// each one is and how they rank.
(function () {
  "use strict";

  var C = window.MapglContext;
  var U = C.util;
  var el = U.el;

  var MIN_SLOT = 72;
  var MAX_SLOT = 140;
  var LABEL_H = 34;
  var MARGIN = 16;
  var VEIL_OPACITY = 0.88;
  var WORLD = [[[-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]]];

  function ease(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function RankMorphControl(o, data) {
    this.o = o;
    this.f = new U.Formatter(o);
    var desc = o.order !== "asc";
    // Only features with a value and polygon parts take part.
    this.items = data.features.filter(function (ft) {
      return U.isNumber(ft.props[o.column]) && ft.geometry &&
        (ft.geometry.type === "Polygon" || ft.geometry.type === "MultiPolygon");
    }).map(function (ft) {
      return {
        props: ft.props,
        value: ft.props[o.column],
        polys: ft.geometry.type === "Polygon" ? [ft.geometry.coordinates] : ft.geometry.coordinates,
      };
    });
    this.items.sort(function (a, b) {
      return desc ? b.value - a.value : a.value - b.value;
    });
    // Only the first n move; the rest stay in place and fade under the veil.
    this.total = this.items.length;
    this.rest = this.items.slice(o.n);
    this.items = this.items.slice(0, o.n);
    this.state = "map";
    this.scroll = 0;
    this.maxScroll = 0;
    this.id = "mapgl-context-morph-" + o.layer_id;
  }

  RankMorphControl.prototype.onAdd = function (map) {
    var self = this;
    var L = this.o.labels;
    this.map = map;
    var c = el("div", "maplibregl-ctrl mapboxgl-ctrl mapgl-context-morph");
    var button = el("button", "mgc-morph-button", L.morph_sort);
    button.type = "button";
    button.addEventListener("click", function () {
      if (self.state === "map") self.toRow();
      else if (self.state === "row") self.toMap();
    });
    c.appendChild(button);
    this.container = c;
    this.button = button;

    var box = map.getContainer();
    this._wheel = function (e) {
      if (self.state !== "row") return;
      e.preventDefault();
      self.scrollBy(e.deltaY);
    };
    this._touchStart = function (e) {
      if (self.state === "row" && e.touches.length === 1) self._touchY = e.touches[0].clientY;
    };
    this._touchMove = function (e) {
      if (self.state !== "row" || self._touchY == null) return;
      e.preventDefault();
      self.scrollBy(self._touchY - e.touches[0].clientY);
      self._touchY = e.touches[0].clientY;
    };
    this._touchEnd = function () {
      self._touchY = null;
    };
    // The grid is laid out for the map's size: redo it when that changes.
    this._resize = function () {
      if (self.state !== "row") return;
      self.layout();
      self.scroll = Math.min(self.scroll, self.maxScroll);
      self.frame(1);
      self.showLabels();
    };
    box.addEventListener("wheel", this._wheel, { passive: false });
    box.addEventListener("touchstart", this._touchStart, { passive: true });
    box.addEventListener("touchmove", this._touchMove, { passive: false });
    box.addEventListener("touchend", this._touchEnd);
    map.on("resize", this._resize);
    return c;
  };

  RankMorphControl.prototype.onRemove = function () {
    var map = this.map;
    var box = map.getContainer();
    box.removeEventListener("wheel", this._wheel);
    box.removeEventListener("touchstart", this._touchStart);
    box.removeEventListener("touchmove", this._touchMove);
    box.removeEventListener("touchend", this._touchEnd);
    map.off("resize", this._resize);
    this.removeOverlays();
    box.classList.remove("mgc-morph-active");
    [this.id, this.id + "-veil", this.id + "-rest"].forEach(function (id) {
      if (map.getLayer(id)) map.removeLayer(id);
      if (map.getSource(id)) map.removeSource(id);
    });
    if (this.container.parentNode) this.container.parentNode.removeChild(this.container);
    this.map = null;
  };

  // ---- geometry in screen pixels ------------------------------------------
  // Positions are computed on screen, so shapes keep their proportions
  // whatever their latitude, and turned back into lng/lat for each frame.
  RankMorphControl.prototype.starts = function () {
    var map = this.map;
    return this.items.map(function (it) {
      var px = it.polys.map(function (poly) {
        return poly.map(function (ring) {
          return ring.map(function (c) {
            var p = map.project(c);
            return [p.x, p.y];
          });
        });
      });
      // The shape is fitted to its largest part and the parts near it (for
      // Tierra del Fuego: Isla Grande and the Malvinas). Far islands shrink
      // into the slot, so the main shape stays big enough to recognise.
      var boxes = px.map(function (poly) {
        var b = [Infinity, Infinity, -Infinity, -Infinity];
        poly[0].forEach(function (p) {
          b[0] = Math.min(b[0], p[0]); b[1] = Math.min(b[1], p[1]);
          b[2] = Math.max(b[2], p[0]); b[3] = Math.max(b[3], p[1]);
        });
        return b;
      });
      var main = 0;
      boxes.forEach(function (b, i) {
        var m = boxes[main];
        if ((b[2] - b[0]) * (b[3] - b[1]) > (m[2] - m[0]) * (m[3] - m[1])) main = i;
      });
      var mb = boxes[main];
      var reach = 2.5 * Math.max(mb[2] - mb[0], mb[3] - mb[1]);
      var mx = (mb[0] + mb[2]) / 2;
      var my = (mb[1] + mb[3]) / 2;
      var near = boxes.map(function (b) {
        return Math.abs((b[0] + b[2]) / 2 - mx) <= reach && Math.abs((b[1] + b[3]) / 2 - my) <= reach;
      });
      var bbox = [Infinity, Infinity, -Infinity, -Infinity];
      boxes.forEach(function (b, i) {
        if (!near[i]) return;
        bbox[0] = Math.min(bbox[0], b[0]); bbox[1] = Math.min(bbox[1], b[1]);
        bbox[2] = Math.max(bbox[2], b[2]); bbox[3] = Math.max(bbox[3], b[3]);
      });
      return { px: px, bbox: bbox, near: near };
    });
  };

  // A grid that fits the width: as many columns as fit slots of at least
  // MIN_SLOT px, in balanced rows (24 shapes: 2 rows of 12 on a laptop, 6 of 4
  // on a phone). Rows taller than the map start below the title and scroll.
  RankMorphControl.prototype.layout = function () {
    var canvas = this.map.getCanvas();
    var W = canvas.clientWidth;
    var H = canvas.clientHeight;
    var n = this.items.length;
    var titleH = this.titleHeight();
    var maxCols = Math.max(1, Math.floor((W - 2 * MARGIN) / MIN_SLOT));
    var rows = Math.ceil(n / Math.min(n, maxCols));
    var cols = Math.ceil(n / rows);
    var size = Math.min(MAX_SLOT, (W - 2 * MARGIN) / cols);
    var rowH = size + LABEL_H;
    var free = H - titleH - 2 * MARGIN;
    this.maxScroll = Math.max(0, rows * rowH - free);
    var top = titleH + MARGIN + (this.maxScroll > 0 ? 0 : (free - rows * rowH) / 2);
    var left = (W - cols * size) / 2;

    var starts = this.startPx;
    this.endPx = starts.map(function (st, i) {
      var slot = {
        cx: left + ((i % cols) + 0.5) * size,
        cy: top + Math.floor(i / cols) * rowH + size / 2,
        size: size,
      };
      var b = st.bbox;
      var k = (size * 0.82) / Math.max(b[2] - b[0], b[3] - b[1], 1);
      var ox = (b[0] + b[2]) / 2;
      var oy = (b[1] + b[3]) / 2;
      return {
        slot: slot,
        px: st.px.map(function (poly, j) {
          return poly.map(function (ring) {
            return ring.map(function (p) {
              if (!st.near[j]) return [slot.cx, slot.cy];
              return [slot.cx + (p[0] - ox) * k, slot.cy + (p[1] - oy) * k];
            });
          });
        }),
      };
    });
  };

  RankMorphControl.prototype.titleHeight = function () {
    var sub = this.rest.length > 0;
    if (!this.o.title && !sub) return 0;
    var h = !this.o.title ? 22 : (this.map.getCanvas().clientWidth < 600 ? 62 : 44);
    return h + (sub ? 18 : 0);
  };

  // "The 30 highest of 529": tells readers that not every feature is shown.
  RankMorphControl.prototype.subtitle = function () {
    var L = this.o.labels;
    var template = this.o.order === "asc" ? L.morph_lowest : L.morph_highest;
    return template.replace("{n}", this.f.int(this.items.length)).replace("{total}", this.f.int(this.total));
  };

  // ---- drawing ----------------------------------------------------------------
  RankMorphControl.prototype.frame = function (t) {
    var map = this.map;
    var starts = this.startPx;
    var ends = this.endPx;
    var dy = this.scroll;
    var fc = { type: "FeatureCollection", features: this.items.map(function (it, i) {
      var coords = starts[i].px.map(function (poly, a) {
        return poly.map(function (ring, b) {
          return ring.map(function (p, c) {
            var q = ends[i].px[a][b][c];
            var ll = map.unproject([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - dy - p[1]) * t]);
            return [ll.lng, ll.lat];
          });
        });
      });
      return { type: "Feature", properties: it.props, geometry: { type: "MultiPolygon", coordinates: coords } };
    }) };
    map.getSource(this.id).setData(fc);
  };

  RankMorphControl.prototype.animate = function (from, to, done) {
    var self = this;
    var duration = 1000 * this.o.duration;
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var t0 = performance.now();
    (function step(now) {
      if (!self.map) return;
      var t = reduce || duration <= 0 ? 1 : Math.min((now - t0) / duration, 1);
      // Clamped: the easing can return values a hair outside [0, 1].
      var p = Math.min(Math.max(from + (to - from) * ease(t), 0), 1);
      self.frame(p);
      self.map.setPaintProperty(self.id + "-veil", "fill-opacity", VEIL_OPACITY * p);
      if (t < 1) requestAnimationFrame(step);
      else done();
    })(t0);
  };

  RankMorphControl.prototype.ensureLayers = function () {
    var map = this.map;
    if (map.getSource(this.id)) return;
    var o = this.o;
    if (this.rest.length > 0) {
      // Below the veil, so the shapes left out fade as the others move.
      map.addSource(this.id + "-rest", { type: "geojson", data: { type: "FeatureCollection",
        features: this.rest.map(function (it) {
          return { type: "Feature", properties: it.props,
            geometry: { type: "MultiPolygon", coordinates: it.polys } };
        }) } });
      map.addLayer({ id: this.id + "-rest", type: "fill", source: this.id + "-rest",
        layout: { visibility: "none" }, paint: {
          "fill-color": map.getPaintProperty(o.layer_id, "fill-color") || "#1f6feb",
          "fill-opacity": map.getPaintProperty(o.layer_id, "fill-opacity") == null ? 1 :
            map.getPaintProperty(o.layer_id, "fill-opacity"),
        } });
    }
    map.addSource(this.id + "-veil", { type: "geojson", data: {
      type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: WORLD } } });
    map.addLayer({ id: this.id + "-veil", type: "fill", source: this.id + "-veil",
      paint: { "fill-color": "#ffffff", "fill-opacity": 0 } });
    map.addSource(this.id, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    map.addLayer({ id: this.id, type: "fill", source: this.id, paint: {
      "fill-color": map.getPaintProperty(o.layer_id, "fill-color") || "#1f6feb",
      "fill-outline-color": "#ffffff",
    } });
  };

  // ---- overlays: title and labels -------------------------------------------
  RankMorphControl.prototype.showTitle = function () {
    var sub = this.rest.length > 0;
    if (!this.o.title && !sub) return;
    var narrow = this.map.getCanvas().clientWidth < 600;
    var t = el("div", "mgc-morph-title" + (narrow ? " mgc-morph-narrow" : ""));
    if (this.o.title) t.appendChild(el("div", "mgc-morph-title-text", this.o.title));
    if (sub) t.appendChild(el("div", "mgc-morph-subtitle", this.subtitle()));
    // Room for the button when it sits in a top corner.
    var pos = this.o.position;
    if (pos === "top-right") t.style.paddingRight = (this.container.offsetWidth + 24) + "px";
    if (pos === "top-left") t.style.paddingLeft = (this.container.offsetWidth + 24) + "px";
    this.map.getContainer().appendChild(t);
    this.titleEl = t;
    requestAnimationFrame(function () {
      t.classList.add("mgc-morph-in");
    });
  };

  RankMorphControl.prototype.showLabels = function () {
    var self = this;
    var f = this.f;
    var o = this.o;
    if (this.labelsEl) this.labelsEl.remove();
    var box = el("div", "mgc-morph-labels");
    box.style.transform = "translateY(" + (-this.scroll) + "px)";
    this.endPx.forEach(function (e, i) {
      var it = self.items[i];
      var d = el("div", "mgc-morph-label");
      d.style.left = (e.slot.cx - e.slot.size / 2) + "px";
      d.style.width = e.slot.size + "px";
      d.style.top = (e.slot.cy + e.slot.size / 2 + 2) + "px";
      var name = o.name_column ? it.props[o.name_column] : "";
      d.appendChild(el("div", "mgc-morph-name", (i + 1) + ". " + (name == null ? "" : name)));
      d.appendChild(el("div", "mgc-morph-value", f.fmt(it.value)));
      d.title = (name == null ? "" : name + ": ") + f.fmt(it.value);
      box.appendChild(d);
    });
    var container = this.map.getContainer();
    if (this.titleEl) container.insertBefore(box, this.titleEl);
    else container.appendChild(box);
    this.labelsEl = box;
    requestAnimationFrame(function () {
      box.classList.add("mgc-morph-in");
    });
  };

  RankMorphControl.prototype.removeOverlays = function () {
    if (this.labelsEl) this.labelsEl.remove();
    if (this.titleEl) this.titleEl.remove();
    this.labelsEl = null;
    this.titleEl = null;
  };

  RankMorphControl.prototype.scrollBy = function (d) {
    if (this.maxScroll === 0) return;
    var next = Math.min(Math.max(this.scroll + d, 0), this.maxScroll);
    if (next === this.scroll) return;
    this.scroll = next;
    this.frame(1);
    if (this.labelsEl) this.labelsEl.style.transform = "translateY(" + (-this.scroll) + "px)";
  };

  // ---- locking the map while the shapes are out of it -----------------------
  var HANDLERS = ["dragPan", "scrollZoom", "boxZoom", "dragRotate", "keyboard", "doubleClickZoom", "touchZoomRotate"];

  RankMorphControl.prototype.lock = function (on) {
    var map = this.map;
    HANDLERS.forEach(function (h) {
      if (map[h]) map[h][on ? "disable" : "enable"]();
    });
  };

  // ---- the two states --------------------------------------------------------
  RankMorphControl.prototype.toRow = function () {
    var self = this;
    var map = this.map;
    var L = this.o.labels;
    if (this.items.length === 0) return;
    this.state = "moving";
    this.button.disabled = true;
    // The new text now, so the title leaves room for the button's final width.
    this.button.textContent = L.morph_back;
    this.lock(true);
    this.scroll = 0;
    // Other panels would describe a map that is not there: hide them.
    map.getContainer().classList.add("mgc-morph-active");

    var go = function () {
      self.ensureLayers();
      self.startPx = self.starts();
      self.layout();
      self.showTitle();
      map.setLayoutProperty(self.o.layer_id, "visibility", "none");
      if (map.getLayer(self.id + "-rest")) map.setLayoutProperty(self.id + "-rest", "visibility", "visible");
      self.animate(0, 1, function () {
        self.state = "row";
        self.button.disabled = false;
        self.showLabels();
      });
    };
    // The shapes move on a flat map: switch from the globe while they are out.
    var p = map.getProjection && map.getProjection();
    this.wasGlobe = !!p && (p.type === "globe" || p.name === "globe");
    if (this.wasGlobe) {
      map.setProjection({ type: "mercator" });
      // One frame is enough for the flat projection to apply; waiting for
      // "idle" would also wait for every tile to load.
      map.once("render", go);
      map.triggerRepaint();
    } else {
      go();
    }
  };

  RankMorphControl.prototype.toMap = function () {
    var self = this;
    var map = this.map;
    var L = this.o.labels;
    this.state = "moving";
    this.button.disabled = true;
    this.removeOverlays();
    this.animate(1, 0, function () {
      map.setLayoutProperty(self.o.layer_id, "visibility", "visible");
      if (map.getLayer(self.id + "-rest")) map.setLayoutProperty(self.id + "-rest", "visibility", "none");
      map.getSource(self.id).setData({ type: "FeatureCollection", features: [] });
      if (self.wasGlobe) map.setProjection({ type: "globe" });
      self.lock(false);
      map.getContainer().classList.remove("mgc-morph-active");
      self.state = "map";
      self.button.disabled = false;
      self.button.textContent = L.morph_sort;
    });
  };

  C.components.rank_morph = function (map, x, o) {
    var data = C.layerData(map, x, o.layer_id);
    if (!data) return;
    var control = new RankMorphControl(o, data);
    if (control.items.length === 0) {
      console.error("mapgl context: layer " + o.layer_id + " has no polygons with a value in " + o.column);
      return;
    }
    U.addControl(map, control, o.position, "rank_morph");
  };
})();
