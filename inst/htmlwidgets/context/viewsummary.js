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
    var self = this;
    (o.references || []).forEach(function (ref) {
      body.appendChild(el("div", "mgc-muted mgc-reference", self.referenceText(view, ref)));
    });

    if (o.style === "compact") return;

    if (o.name_column) body.appendChild(this.extremes(view));
    if (o.chart === "histogram") {
      body.appendChild(this.histogramSvg(rows, view, whole));
      if (!whole) body.appendChild(this.legend());
    } else if (o.chart === "position") {
      body.appendChild(o.stat === "sum" ? this.shareSvg(view) : this.positionSvg(view, whole));
    } else if (o.chart === "strip") {
      body.appendChild(this.stripSvg(rows, view, whole));
    } else if (o.chart === "split") {
      body.appendChild(this.splitSvg(rows, view, whole));
    }
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
    var lines = [whole ? detail : detail + " — " + this.comparison(view)];
    var self = this;
    (o.references || []).forEach(function (ref) {
      lines.push(self.referenceText(view, ref));
    });
    cell(stat, o.label, lines.join("\n"));

    if (o.show_area) {
      cell(el("div", "mgc-mini-num", this.areaValue(area)), this.areaCaption(),
        area == null ? L.area_zoom_in : null);
    }
    return grid;
  };

  // "▲ 4.8 pts above CABA (-5.2%)". With stat = "sum", the view as a share
  // of the reference: "62% of CABA (3.1M)".
  ViewSummaryControl.prototype.referenceText = function (view, ref) {
    var o = this.o;
    var L = o.labels;
    var f = this.f;
    var shown = ref.label + " (" + f.fmt(ref.value) + ")";
    if (o.stat === "sum") {
      if (ref.value === 0) return shown;
      return f.pct(view.value / ref.value) + " " + L.of + " " + shown;
    }
    var diff = view.value - ref.value;
    if (Number(diff.toFixed(o.digits)) === 0) return "= " + L.ref_same + " " + shown;
    return (diff > 0 ? "▲ " : "▼ ") + f.num(Math.abs(diff)) + o.diff_suffix + " " +
      (diff > 0 ? L.ref_above : L.ref_below) + " " + shown;
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

  // A bar spanning all values, in the map's colors, with the value in view
  // (dot) and the overall value (dashed line) marked on it. Hovering over a
  // stretch of the bar outlines the features in that range, as with the
  // histogram.
  ViewSummaryControl.prototype.positionSvg = function (view, whole) {
    var self = this;
    var o = this.o;
    var L = o.labels;
    var f = this.f;
    var lo = this.lo;
    var hi = this.hi;
    var bins = o.bins;
    var colors = this.binColors();
    var accent = o.color || "#1f6feb";

    var W = 240;
    var barY = 14;
    var barH = 8;
    var s = svg("svg", {
      viewBox: "0 0 " + W + " 40",
      class: "mgc-position",
      role: "img",
      "aria-label": L.view + ": " + f.fmt(view.value) + ", " + L.all + ": " + f.fmt(this.overall.value),
    });

    var bw = W / bins;
    var binW = (hi - lo) / bins;
    for (var i = 0; i < bins; i++) {
      var g = svg("g", { class: "mgc-bin" });
      g.appendChild(svg("rect", {
        x: i * bw, y: barY, width: bw + 0.5, height: barH,
        class: "mgc-position-bar", style: "fill:" + (colors ? colors[i] : accent),
      }));
      g.appendChild(svg("rect", { x: i * bw, y: 0, width: bw, height: 30, class: "mgc-hit" }));
      var tip = svg("title");
      tip.textContent = f.fmt(lo + i * binW) + " – " + f.fmt(lo + (i + 1) * binW);
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
    s.appendChild(svg("rect", { x: 0, y: barY, width: W, height: barH, class: "mgc-position-frame" }));

    var xOf = function (v) {
      var x = hi > lo ? ((v - lo) / (hi - lo)) * W : W / 2;
      return Math.min(Math.max(x, 0), W);
    };
    var xAll = xOf(this.overall.value);
    s.appendChild(svg("line", { x1: xAll, x2: xAll, y1: barY - 6, y2: barY + barH + 6, class: "mgc-mean-all" }));
    if (!whole) {
      s.appendChild(svg("circle", {
        cx: xOf(view.value), cy: barY + barH / 2, r: 5.5, class: "mgc-position-dot",
      }));
    }

    var lab = function (x, anchor, text) {
      var t = svg("text", { x: x, y: 38, "text-anchor": anchor, class: "mgc-axis" });
      t.textContent = text;
      return t;
    };
    s.appendChild(lab(0, "start", f.fmt(lo)));
    s.appendChild(lab(W, "end", f.fmt(hi)));

    var wrap = el("div", "mgc-position-wrap");
    wrap.appendChild(s);
    var legend = el("div", "mgc-legend");
    if (!whole) {
      var dot = el("span", "mgc-legend-item");
      dot.appendChild(el("i", "mgc-key-dot"));
      dot.appendChild(document.createTextNode(L.view));
      legend.appendChild(dot);
    }
    var line = el("span", "mgc-legend-item");
    line.appendChild(el("i", "mgc-key-line"));
    line.appendChild(document.createTextNode(whole ? L.whole_map : L.all));
    legend.appendChild(line);
    wrap.appendChild(legend);
    return wrap;
  };

  // One dot per feature along the scale of values: all features in grey,
  // those in view in the map's colors on top. Dots get a fixed vertical
  // offset from their id, so they do not overlap much and do not move as the
  // map moves. Above STRIP_MAX features, an even sample of them is drawn.
  var STRIP_MAX = 2000;

  function jitter(id) {
    // A cheap, stable pseudo-random number in [0, 1) from an integer id.
    var x = Math.sin(id * 12.9898 + 78.233) * 43758.5453;
    return x - Math.floor(x);
  }

  // Every k-th row in value order, so the sample keeps the distribution.
  function evenSample(rows, max) {
    if (rows.length <= max) return rows;
    var sorted = rows.slice().sort(function (a, b) {
      return a.value - b.value;
    });
    var step = sorted.length / max;
    var out = [];
    for (var i = 0; i < max; i++) out.push(sorted[Math.floor(i * step)]);
    return out;
  }

  ViewSummaryControl.prototype.stripSvg = function (rows, view, whole) {
    var self = this;
    var o = this.o;
    var L = o.labels;
    var f = this.f;
    var lo = this.lo;
    var hi = this.hi;
    var bins = o.bins;
    var colors = this.binColors();
    var accent = o.color || "#1f6feb";
    if (!this._stripAll) this._stripAll = evenSample(this.rows, STRIP_MAX);

    var W = 240;
    var H = 40;
    var pad = 4;
    var s = svg("svg", {
      viewBox: "0 0 " + W + " " + (H + 14),
      class: "mgc-strip",
      role: "img",
      "aria-label": L.view + " vs. " + L.all,
    });
    var xOf = function (v) {
      return hi > lo ? ((v - lo) / (hi - lo)) * W : W / 2;
    };
    var yOf = function (r) {
      return pad + jitter(r.id) * (H - 2 * pad);
    };
    var fillOf = function (v) {
      return colors ? colors[binOf(v, lo, hi, bins)] : accent;
    };

    // Hover bands first, so the dots stay on top and the bands catch the
    // pointer between them.
    var bw = W / bins;
    var binW = (hi - lo) / bins;
    for (var i = 0; i < bins; i++) {
      var g = svg("g", { class: "mgc-bin" });
      g.appendChild(svg("rect", { x: i * bw, y: 0, width: bw, height: H, class: "mgc-hit" }));
      var tip = svg("title");
      tip.textContent = f.fmt(lo + i * binW) + " – " + f.fmt(lo + (i + 1) * binW);
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

    var dots = svg("g", { class: "mgc-strip-dots" });
    if (!whole) {
      this._stripAll.forEach(function (r) {
        dots.appendChild(svg("circle", { cx: xOf(r.value), cy: yOf(r), r: 1.6, class: "mgc-strip-all" }));
      });
    }
    evenSample(rows, STRIP_MAX).forEach(function (r) {
      dots.appendChild(svg("circle", {
        cx: xOf(r.value), cy: yOf(r), r: whole ? 1.8 : 2.4,
        class: "mgc-strip-view", style: "fill:" + fillOf(r.value),
      }));
    });
    s.appendChild(dots);

    if (o.stat !== "sum") {
      s.appendChild(svg("line", {
        x1: xOf(this.overall.value), x2: xOf(this.overall.value), y1: 0, y2: H, class: "mgc-mean-all",
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

    var wrap = el("div", "mgc-position-wrap");
    wrap.appendChild(s);
    if (!whole) wrap.appendChild(this.legend());
    return wrap;
  };

  // Two histograms on the same bins, one above the other: the features in
  // view (in the map's colors) and all features (grey), each scaled to its
  // own tallest bar and marked with its own mean. When the whole layer is in
  // view, a single histogram in the map's colors.
  ViewSummaryControl.prototype.splitSvg = function (rows, view, whole) {
    var self = this;
    var o = this.o;
    var L = o.labels;
    var f = this.f;
    var lo = this.lo;
    var hi = this.hi;
    var bins = o.bins;
    var colors = this.binColors();
    var accent = o.color || "#1f6feb";
    var viewBins = histogram(rows, lo, hi, bins);

    var W = 240;
    var rowH = 26;
    var labelH = 11;
    var gap = 6;
    var panels = whole
      ? [{ counts: this.allBins, label: L.whole_map + " (" + f.int(this.overall.n) + ")", colored: true, mean: this.overall.value, meanClass: "mgc-mean-all" }]
      : [
          { counts: viewBins, label: L.view + " (" + f.int(view.n) + ")", colored: true, mean: view.value, meanClass: "mgc-mean-view" },
          { counts: this.allBins, label: L.all + " (" + f.int(this.overall.n) + ")", colored: false, mean: this.overall.value, meanClass: "mgc-mean-all" },
        ];
    var totalH = panels.length * (labelH + rowH) + (panels.length - 1) * gap;
    var s = svg("svg", {
      viewBox: "0 0 " + W + " " + (totalH + 13),
      class: "mgc-split",
      role: "img",
      "aria-label": panels.map(function (p) { return p.label; }).join(" / "),
    });
    var xOf = function (v) {
      return hi > lo ? ((v - lo) / (hi - lo)) * W : W / 2;
    };
    var bw = W / bins;

    panels.forEach(function (p, k) {
      var top = k * (labelH + rowH + gap);
      var base = top + labelH + rowH;
      var t = svg("text", { x: 0, y: top + 8, class: "mgc-split-label" });
      t.textContent = p.label;
      s.appendChild(t);
      var max = Math.max.apply(null, p.counts) || 1;
      for (var i = 0; i < bins; i++) {
        if (!p.counts[i]) continue;
        var h = Math.max((p.counts[i] / max) * rowH, 1);
        s.appendChild(svg("rect", {
          x: i * bw + 0.5, y: base - h, width: bw - 1, height: h,
          class: p.colored ? "mgc-bar-view mgc-split-bar" : "mgc-bar-all mgc-split-bar",
          style: p.colored ? "fill:" + (colors ? colors[i] : accent) : "",
          "data-bin": i,
        }));
      }
      s.appendChild(svg("line", { x1: 0, x2: W, y1: base + 0.5, y2: base + 0.5, class: "mgc-split-base" }));
      if (o.stat !== "sum") {
        s.appendChild(svg("line", {
          x1: xOf(p.mean), x2: xOf(p.mean), y1: top + labelH, y2: base, class: p.meanClass,
        }));
      }
    });

    // Hover bands across both histograms, on top so they catch the pointer.
    var binW = (hi - lo) / bins;
    for (var i = 0; i < bins; i++) {
      var g = svg("g", { class: "mgc-bin" });
      g.appendChild(svg("rect", { x: i * bw, y: labelH, width: bw, height: totalH - labelH, class: "mgc-hit" }));
      var tip = svg("title");
      tip.textContent = f.fmt(lo + i * binW) + " – " + f.fmt(lo + (i + 1) * binW) + ": " +
        (whole ? "" : viewBins[i] + " " + L.view.toLowerCase() + " / ") +
        this.allBins[i] + " " + L.all.toLowerCase();
      g.appendChild(tip);
      (function (bin, group) {
        group.addEventListener("mouseenter", function () {
          group.classList.add("mgc-bin-active");
          s.querySelectorAll('.mgc-split-bar[data-bin="' + bin + '"]').forEach(function (r) {
            r.classList.add("mgc-split-active");
          });
          self.highlightBin(bin);
        });
        group.addEventListener("mouseleave", function () {
          group.classList.remove("mgc-bin-active");
          s.querySelectorAll(".mgc-split-active").forEach(function (r) {
            r.classList.remove("mgc-split-active");
          });
          self.highlighter.clear();
        });
      })(i, g);
      s.appendChild(g);
    }

    var lab = function (x, anchor, text) {
      var t = svg("text", { x: x, y: totalH + 11, "text-anchor": anchor, class: "mgc-axis" });
      t.textContent = text;
      return t;
    };
    s.appendChild(lab(0, "start", f.fmt(lo)));
    s.appendChild(lab(W, "end", f.fmt(hi)));

    var wrap = el("div", "mgc-position-wrap");
    wrap.appendChild(s);
    return wrap;
  };

  // With stat = "sum" the value in view is not on the scale of single
  // values, so the bar shows the share of the total that is in view.
  ViewSummaryControl.prototype.shareSvg = function (view) {
    var o = this.o;
    var share = this.overall.value !== 0 ? view.value / this.overall.value : 0;
    share = Math.min(Math.max(share, 0), 1);
    var W = 240;
    var s = svg("svg", {
      viewBox: "0 0 " + W + " 22",
      class: "mgc-position",
      role: "img",
      "aria-label": this.f.share(view.value, this.overall.value) + " " + o.labels.share,
    });
    s.appendChild(svg("rect", { x: 0, y: 4, width: W, height: 8, class: "mgc-share-track" }));
    s.appendChild(svg("rect", {
      x: 0, y: 4, width: Math.max(share * W, 1), height: 8,
      class: "mgc-share-fill", style: "fill:" + (o.color || "#1f6feb"),
    }));
    var t = svg("text", { x: W, y: 21, "text-anchor": "end", class: "mgc-axis" });
    t.textContent = this.f.share(view.value, this.overall.value) + " " + o.labels.share;
    s.appendChild(t);
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
