// "In this view" summary panel: summarises the features in view and compares
// them with the whole layer. Overall statistics are computed once; view
// statistics are recomputed as the map moves.
(function () {
  "use strict";

  var C = window.MapglContext;
  var U = C.util;
  var el = U.el;
  var svg = U.svg;

  function summarise(rows, stat) {
    if (rows.length === 0) return null;
    var sumW = 0;
    var sumWV = 0;
    var sum = 0;
    var min = rows[0];
    var max = rows[0];
    rows.forEach(function (r) {
      sumW += r.weight;
      sumWV += r.weight * r.value;
      sum += r.value;
      if (r.value < min.value) min = r;
      if (r.value > max.value) max = r;
    });
    var value;
    if (stat === "sum") {
      value = sum;
    } else if (stat === "median") {
      value = median(rows, sumW);
    } else {
      value = sumW > 0 ? sumWV / sumW : sum / rows.length;
    }
    return { n: rows.length, value: value, min: min, max: max, weight: sumW };
  }

  // Weighted median: the value where the cumulative weight reaches half of
  // the total. Without weights (or with all weights 0) every row counts 1.
  function median(rows, sumW) {
    var useWeight = sumW > 0;
    var total = useWeight ? sumW : rows.length;
    var sorted = rows.slice().sort(function (a, b) {
      return a.value - b.value;
    });
    var acc = 0;
    for (var i = 0; i < sorted.length; i++) {
      acc += useWeight ? sorted[i].weight : 1;
      if (acc > total / 2) return sorted[i].value;
      if (acc === total / 2 && i + 1 < sorted.length) {
        return (sorted[i].value + sorted[i + 1].value) / 2;
      }
    }
    return sorted[sorted.length - 1].value;
  }

  var EARTH_RADIUS_KM = 6371.0088;
  var KM2_PER_MI2 = 2.589988;
  var DEG = Math.PI / 180;

  // Area of a ring of [lng, lat] on the sphere, in km2 (as in Chamberlain
  // and Duquette, 2007, the formula used by geojson-area and turf).
  function ringAreaKm2(ring) {
    // Keep longitudes continuous across the antimeridian.
    for (var k = 1; k < ring.length; k++) {
      while (ring[k][0] - ring[k - 1][0] > 180) ring[k][0] -= 360;
      while (ring[k][0] - ring[k - 1][0] < -180) ring[k][0] += 360;
    }
    var sum = 0;
    for (var j = 0; j < ring.length; j++) {
      var a = ring[j];
      var b = ring[(j + 1) % ring.length];
      sum += (b[0] - a[0]) * DEG * (2 + Math.sin(a[1] * DEG) + Math.sin(b[1] * DEG));
    }
    return Math.abs(sum * EARTH_RADIUS_KM * EARTH_RADIUS_KM / 2);
  }

  // Area on the Earth covered by the screen, in km2, or null when part of
  // the screen is not on the Earth: around the globe when zoomed out, or the
  // sky when the map is tilted towards the horizon. The area of the visible
  // part of a globe is hard to estimate well, so it is not shown. The
  // screen's edges are sampled, so the outline follows the projection.
  function screenAreaKm2(map) {
    var canvas = map.getCanvas();
    var w = canvas.clientWidth;
    var h = canvas.clientHeight;
    var steps = 8;
    var ring = [];
    var edge = function (x0, y0, x1, y1) {
      for (var i = 0; i < steps; i++) {
        var t = i / steps;
        ring.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]);
      }
    };
    edge(0, 0, w, 0);
    edge(w, 0, w, h);
    edge(w, h, 0, h);
    edge(0, h, 0, 0);
    for (var k = 0; k < ring.length; k++) {
      var ll = map.unproject(ring[k]);
      var back = map.project(ll);
      if (Math.abs(back.x - ring[k][0]) > 1 || Math.abs(back.y - ring[k][1]) > 1) return null;
      ring[k] = [ll.lng, ll.lat];
    }
    return ringAreaKm2(ring);
  }

  function binOf(v, lo, hi, bins) {
    var span = hi - lo;
    var b = span > 0 ? Math.floor(((v - lo) / span) * bins) : 0;
    return Math.min(Math.max(b, 0), bins - 1);
  }

  function histogram(rows, lo, hi, bins) {
    var counts = new Array(bins).fill(0);
    rows.forEach(function (r) {
      counts[binOf(r.value, lo, hi, bins)]++;
    });
    return counts;
  }

  function ViewSummaryControl(o, data) {
    this.o = o;
    this.data = data;
    this.rows = U.numericRows(data, o.column, o.weight, o.name_column);
    this.byId = {};
    var byId = this.byId;
    this.rows.forEach(function (r) {
      byId[r.id] = r;
    });
    this.overall = summarise(this.rows, o.stat);
    this.lo = this.overall.min.value;
    this.hi = this.overall.max.value;
    this.allBins = histogram(this.rows, this.lo, this.hi, o.bins);
    this.f = new U.Formatter(o);
    this.highlighter = data.highlighter;
    this._signature = null;
  }

  ViewSummaryControl.prototype.onAdd = function (map) {
    var self = this;
    this.map = map;
    this.panel = new U.Panel(map, this.o, function () {
      self._signature = null;
      self.update();
    });
    if (this.o.style !== "full") this.panel.container.classList.add("mgc-" + this.o.style);
    this.stop = U.onViewChange(map, function () {
      self.update();
    });
    return this.panel.container;
  };

  ViewSummaryControl.prototype.onRemove = function () {
    this.stop();
    var c = this.panel.container;
    if (c.parentNode) c.parentNode.removeChild(c);
    this.map = null;
  };

  ViewSummaryControl.prototype.visibleRows = function () {
    var byId = this.byId;
    var rows = [];
    this.data.tracker.visibleIds().forEach(function (id) {
      if (byId[id]) rows.push(byId[id]);
    });
    return rows;
  };

  ViewSummaryControl.prototype.binColors = function () {
    if (this._binColors !== undefined) return this._binColors;
    var o = this.o;
    if (o.color) {
      this._binColors = null;
      return null;
    }
    var scale = U.layerColors(this.map, o.layer_id, o.column);
    if (scale === undefined) return null;
    var colors = null;
    if (scale) {
      var w = (this.hi - this.lo) / o.bins;
      colors = [];
      for (var i = 0; i < o.bins; i++) colors.push(scale(this.lo + (i + 0.5) * w));
    }
    this._binColors = colors;
    return colors;
  };

  ViewSummaryControl.prototype.update = function () {
    if (!this.map) return;
    var o = this.o;
    var L = o.labels;
    var f = this.f;
    var panel = this.panel;
    var rows = this.visibleRows();
    var view = summarise(rows, o.stat);
    var all = this.overall;
    var whole = !!view && view.n === all.n;

    // Skip rebuilding when the features in view have not changed: keeps
    // hover state and saves work (highlighting itself triggers map events).
    var idSum = 0;
    rows.forEach(function (r) {
      idSum += r.id;
    });
    // The area changes with every zoom even when the features in view do
    // not; three significant digits are enough to show it.
    var area = o.show_area ? screenAreaKm2(this.map) : null;
    if (area != null && o.area_unit === "mi2") area = area / KM2_PER_MI2;
    var areaKey = area == null ? "-" : Number(area.toPrecision(3));
    var signature = rows.length + ":" + idSum + ":" + panel.collapsed + ":" +
      (this._binColors !== undefined) + ":" + areaKey;
    if (signature === this._signature) return;
    this._signature = signature;

    panel.titleEl.textContent = whole ? L.whole_map : (o.title || L.title);
    panel.miniValueEl.textContent = view ? f.fmt(view.value) : "";

    var body = panel.body;
    body.textContent = "";
    if (panel.collapsed) return;

    if (!view) {
      body.appendChild(el("div", "mgc-empty", L.empty));
      return;
    }

    if (o.style === "mini") {
      body.appendChild(this.miniGrid(view, whole, area));
      return;
    }

    var count = f.int(view.n) + " " + L.of + " " + f.int(all.n) + " " + o.unit;
    if (o.weight && all.weight > 0) {
      count += " · " + f.share(view.weight, all.weight) + " " + L.share +
        (o.weight_label ? " (" + o.weight_label + ")" : "");
    }
    body.appendChild(el("div", "mgc-muted", count));
    if (o.show_area) {
      var areaLine = el("div", "mgc-muted", "≈ " + this.areaText(area));
      if (area == null) areaLine.title = L.area_zoom_in;
      body.appendChild(areaLine);
    }

    var statLabel = { mean: L.average, median: L.median, sum: L.sum }[o.stat];
    body.appendChild(el("div", "mgc-label", statLabel + " · " + o.label));
    body.appendChild(el("div", "mgc-value", f.fmt(view.value)));

    if (!whole) body.appendChild(el("div", "mgc-muted", this.comparison(view)));

    if (o.style === "compact") return;

    if (o.name_column) body.appendChild(this.extremes(view));
    body.appendChild(this.histogramSvg(rows, view, whole));
    if (!whole) body.appendChild(this.legend());
  };

  // "310,000" or "1.99M"; a dash when the area is not meaningful.
  ViewSummaryControl.prototype.areaValue = function (area) {
    if (area == null) return "—";
    if (area < 1e6) return this.f.int(area);
    if (!this.areaFormat) {
      this.areaFormat = new Intl.NumberFormat(this.o.locale, {
        notation: "compact",
        maximumSignificantDigits: 3,
      });
    }
    return this.areaFormat.format(area);
  };

  // "km² in view"
  ViewSummaryControl.prototype.areaCaption = function () {
    return (this.o.area_unit === "mi2" ? "mi²" : "km²") + " " + this.o.labels.in_view;
  };

  ViewSummaryControl.prototype.areaText = function (area) {
    return this.areaValue(area) + " " + this.areaCaption();
  };

  // Three figures side by side: features in view, the statistic and the
  // area of the view.
  ViewSummaryControl.prototype.miniGrid = function (view, whole, area) {
    var o = this.o;
    var L = o.labels;
    var f = this.f;
    var all = this.overall;
    var grid = el("div", "mgc-mini-grid");
    var cell = function (value, caption, title) {
      var c = el("div", "mgc-mini-cell");
      c.appendChild(value);
      c.appendChild(el("div", "mgc-mini-cap", caption));
      if (title) c.title = title;
      grid.appendChild(c);
    };

    cell(el("div", "mgc-mini-num", f.int(view.n) + " / " + f.int(all.n)), o.unit);

    var stat = el("div", "mgc-mini-num", f.fmt(view.value));
    if (!whole && o.stat !== "sum") {
      var diff = view.value - all.value;
      if (Number(diff.toFixed(o.digits)) !== 0) {
        stat.appendChild(el("span", "mgc-mini-arrow", diff > 0 ? "▲" : "▼"));
      }
    }
    // The caption is just the variable; the statistic and the comparison
    // with the whole map are in the tooltip, to keep the strip short.
    var statLabel = { mean: L.average, median: L.median, sum: L.sum }[o.stat];
    var detail = statLabel + " · " + o.label;
    cell(stat, o.label, whole ? detail : detail + " — " + this.comparison(view));

    if (o.show_area) {
      cell(el("div", "mgc-mini-num", this.areaValue(area)), this.areaCaption(),
        area == null ? L.area_zoom_in : null);
    }
    return grid;
  };

  ViewSummaryControl.prototype.comparison = function (view) {
    var o = this.o;
    var L = o.labels;
    var f = this.f;
    var all = this.overall;
    if (o.stat === "sum") {
      return f.share(view.value, all.value) + " " + L.share + " (" + f.fmt(all.value) + ")";
    }
    var diff = view.value - all.value;
    if (Number(diff.toFixed(o.digits)) === 0) {
      return "= " + L.same + " " + L.overall + " (" + f.fmt(all.value) + ")";
    }
    return (diff > 0 ? "▲ " : "▼ ") + f.num(Math.abs(diff)) + o.diff_suffix + " " +
      (diff > 0 ? L.above : L.below) + " " + L.overall + " (" + f.fmt(all.value) + ")";
  };

  // Highest and lowest in view; each name moves the map to that feature.
  ViewSummaryControl.prototype.extremes = function (view) {
    var self = this;
    var L = this.o.labels;
    var box = el("div", "mgc-extremes");
    var line = function (prefix, row) {
      var div = el("div");
      if (prefix) div.appendChild(document.createTextNode(prefix + ": "));
      div.appendChild(U.featureLink(self.highlighter, row.feature, row.name, L.go_to));
      div.appendChild(document.createTextNode(" (" + self.f.fmt(row.value) + ")"));
      return div;
    };
    if (view.n === 1) {
      box.appendChild(line(null, view.max));
    } else {
      box.appendChild(line(L.highest, view.max));
      box.appendChild(line(L.lowest, view.min));
    }
    return box;
  };

  ViewSummaryControl.prototype.legend = function () {
    var L = this.o.labels;
    var colors = this.binColors();
    var legend = el("div", "mgc-legend");
    var item = function (cls, text, background) {
      var span = el("span", "mgc-legend-item");
      var key = el("i", cls);
      if (background) key.style.background = background;
      span.appendChild(key);
      span.appendChild(document.createTextNode(text));
      return span;
    };
    legend.appendChild(item("mgc-key-view", L.view,
      colors ? "linear-gradient(90deg, " + colors.join(", ") + ")" : null));
    legend.appendChild(item("mgc-key-all", L.all));
    return legend;
  };

  // Overall distribution in grey, view distribution in the map's colors (or
  // the accent color). Each is scaled to its own tallest bar so the shapes
  // can be compared even when only a few features are in view. When the
  // whole layer is in view, the overall bars are drawn in color.
  ViewSummaryControl.prototype.histogramSvg = function (rows, view, whole) {
    var self = this;
    var o = this.o;
    var L = o.labels;
    var f = this.f;
    var all = this.overall;
    var lo = this.lo;
    var hi = this.hi;
    var bins = o.bins;
    var colors = this.binColors();
    var accent = o.color || "#1f6feb";
    var viewBins = histogram(rows, lo, hi, bins);
    var maxAll = Math.max.apply(null, this.allBins) || 1;
    var maxView = Math.max.apply(null, viewBins) || 1;

    var W = 240;
    var H = 56;
    var bw = W / bins;
    var s = svg("svg", {
      viewBox: "0 0 " + W + " " + (H + 14),
      class: "mgc-histogram",
      role: "img",
      "aria-label": L.view + " vs. " + L.all,
    });

    var binW = (hi - lo) / bins;
    for (var i = 0; i < bins; i++) {
      var g = svg("g", { class: "mgc-bin" });
      var fill = colors ? colors[i] : accent;
      var ha = (this.allBins[i] / maxAll) * H;
      var allBar = svg("rect", {
        x: i * bw + 1, y: H - ha, width: bw - 2, height: ha, class: "mgc-bar-all",
      });
      if (whole) {
        allBar.setAttribute("style", "fill:" + fill);
        allBar.setAttribute("class", "mgc-bar-all mgc-bar-colored");
      }
      g.appendChild(allBar);
      if (!whole && viewBins[i] > 0) {
        var hv = (viewBins[i] / maxView) * H;
        g.appendChild(svg("rect", {
          x: i * bw + bw * 0.2, y: H - hv, width: bw * 0.6, height: hv,
          class: "mgc-bar-view", style: "fill:" + fill,
        }));
      }
      // Full-height hit area, so short bars are easy to hover.
      g.appendChild(svg("rect", { x: i * bw, y: 0, width: bw, height: H, class: "mgc-hit" }));
      var tip = svg("title");
      tip.textContent = f.fmt(lo + i * binW) + " – " + f.fmt(lo + (i + 1) * binW) +
        ": " + viewBins[i] + " " + L.view.toLowerCase() + " / " + this.allBins[i] + " " + L.all.toLowerCase();
      g.appendChild(tip);
      (function (bin, group) {
        group.addEventListener("mouseenter", function () {
          group.classList.add("mgc-bin-active");
          self.highlightBin(bin);
        });
        group.addEventListener("mouseleave", function () {
          group.classList.remove("mgc-bin-active");
          self.highlighter.clear();
        });
      })(i, g);
      s.appendChild(g);
    }

    if (o.stat !== "sum") {
      var xOf = function (v) {
        return hi > lo ? ((v - lo) / (hi - lo)) * W : W / 2;
      };
      s.appendChild(svg("line", {
        x1: xOf(all.value), x2: xOf(all.value), y1: 0, y2: H, class: "mgc-mean-all",
      }));
      if (!whole) {
        s.appendChild(svg("line", {
          x1: xOf(view.value), x2: xOf(view.value), y1: 0, y2: H, class: "mgc-mean-view",
        }));
      }
    }

    var lab = function (x, anchor, text) {
      var t = svg("text", { x: x, y: H + 11, "text-anchor": anchor, class: "mgc-axis" });
      t.textContent = text;
      return t;
    };
    s.appendChild(lab(0, "start", f.fmt(lo)));
    s.appendChild(lab(W, "end", f.fmt(hi)));
    return s;
  };

  ViewSummaryControl.prototype.highlightBin = function (i) {
    var bins = this.o.bins;
    var w = (this.hi - this.lo) / bins;
    var value = ["to-number", ["get", this.o.column]];
    // Bins are [from, to); the first and last are open-ended so they also
    // catch the minimum and maximum despite rounding.
    var filter = ["all", ["has", this.o.column]];
    if (i > 0) filter.push([">=", value, this.lo + i * w]);
    if (i < bins - 1) filter.push(["<", value, this.lo + (i + 1) * w]);
    this.highlighter.filter(filter);
  };

  C.components.view_summary = function (map, x, o) {
    var data = C.layerData(map, x, o.layer_id);
    if (!data) return;
    var control = new ViewSummaryControl(o, data);
    if (control.rows.length === 0) {
      console.error("mapgl context: column " + o.column + " has no numeric values");
      return;
    }
    data.highlighter.setColor(o.highlight_color);
    U.addControl(map, control, o.position, "view_summary");
  };
})();
