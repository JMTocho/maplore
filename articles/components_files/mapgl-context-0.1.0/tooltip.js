// Context tooltip: on hover (or tap), shows a feature's value together with
// where it stands among all features: its rank, the share of features below
// it, the difference with the average and a small distribution strip.
(function () {
  "use strict";

  var C = window.MapglContext;
  var U = C.util;
  var el = U.el;
  var svg = U.svg;
  var STRIP_BINS = 30;

  function ContextTooltip(map, o, data) {
    this.map = map;
    this.o = o;
    this.data = data;
    this.f = new U.Formatter(o);
    this.highlighter = data.highlighter;

    var rows = U.numericRows(data, o.column, o.weight, o.name_column);
    this.rows = rows;
    this.byId = {};
    var byId = this.byId;
    rows.forEach(function (r) {
      byId[r.id] = r;
    });

    // Sorted values for ranks and shares below, by binary search.
    this.sorted = rows.map(function (r) { return r.value; }).sort(function (a, b) { return a - b; });
    var sumW = 0;
    var sumWV = 0;
    rows.forEach(function (r) {
      sumW += r.weight;
      sumWV += r.weight * r.value;
    });
    var n = rows.length;
    this.mean = sumW > 0 ? sumWV / sumW : this.sorted.reduce(function (s, v) { return s + v; }, 0) / n;
    this.lo = this.sorted[0];
    this.hi = this.sorted[n - 1];

    var lo = this.lo;
    var span = this.hi - lo;
    this.bins = new Array(STRIP_BINS).fill(0);
    var bins = this.bins;
    this.sorted.forEach(function (v) {
      var b = span > 0 ? Math.floor(((v - lo) / span) * STRIP_BINS) : 0;
      bins[Math.min(b, STRIP_BINS - 1)]++;
    });

    this.box = el("div", "mgc-tooltip");
    this.box.setAttribute("role", "tooltip");
    map.getContainer().appendChild(this.box);
    this.bind();
  }

  // Number of values strictly below / strictly above v.
  ContextTooltip.prototype.countBelow = function (v) {
    var a = this.sorted;
    var lo = 0;
    var hi = a.length;
    while (lo < hi) {
      var mid = (lo + hi) >> 1;
      if (a[mid] < v) lo = mid + 1; else hi = mid;
    }
    return lo;
  };

  ContextTooltip.prototype.countAbove = function (v) {
    var a = this.sorted;
    var lo = 0;
    var hi = a.length;
    while (lo < hi) {
      var mid = (lo + hi) >> 1;
      if (a[mid] <= v) lo = mid + 1; else hi = mid;
    }
    return a.length - lo;
  };

  ContextTooltip.prototype.bind = function () {
    var self = this;
    var map = this.map;
    var id = this.o.layer_id;
    var canvas = map.getCanvas();

    var show = function (e) {
      var feature = e.features && e.features[0];
      var row = feature && feature.id != null ? self.byId[feature.id] : null;
      if (!row) {
        self.hide();
        return;
      }
      canvas.style.cursor = "pointer";
      if (row.id !== self.current) {
        self.current = row.id;
        self.render(row);
        if (self.o.highlight) self.highlighter.one(row.id);
      }
      self.place(e.point);
    };

    map.on("mousemove", id, show);
    // Touch screens have no hover: tap to show.
    map.on("click", id, show);
    map.on("mouseleave", id, function () {
      canvas.style.cursor = "";
      self.hide();
    });
    map.on("movestart", function (e) {
      if (e.originalEvent && e.originalEvent.type === "touchstart") self.hide();
    });
  };

  ContextTooltip.prototype.hide = function () {
    if (this.current == null) return;
    this.current = null;
    this.box.style.display = "none";
    if (this.o.highlight) this.highlighter.clear();
  };

  // Next to the pointer, flipped to stay inside the map.
  ContextTooltip.prototype.place = function (point) {
    var box = this.box;
    box.style.display = "block";
    var container = this.map.getContainer();
    var W = container.clientWidth;
    var H = container.clientHeight;
    var w = box.offsetWidth;
    var h = box.offsetHeight;
    var x = point.x + 14;
    var y = point.y + 14;
    if (x + w > W - 4) x = point.x - w - 14;
    if (y + h > H - 4) y = point.y - h - 14;
    box.style.left = Math.max(4, x) + "px";
    box.style.top = Math.max(4, y) + "px";
  };

  ContextTooltip.prototype.render = function (row) {
    var o = this.o;
    var L = o.labels;
    var f = this.f;
    var n = this.rows.length;
    var box = this.box;
    box.textContent = "";

    if (o.name_column) box.appendChild(el("div", "mgc-tt-name", String(row.name)));
    var valueLine = el("div", "mgc-tt-value");
    valueLine.appendChild(el("span", "mgc-label", o.label + ": "));
    valueLine.appendChild(el("strong", null, f.fmt(row.value)));
    box.appendChild(valueLine);

    // Rank 1 = highest; ties share the best rank.
    var rank = this.countAbove(row.value) + 1;
    var below = n > 1 ? this.countBelow(row.value) / (n - 1) : 0;
    box.appendChild(el("div", "mgc-muted",
      L.rank + " " + f.int(rank) + " " + L.of + " " + f.int(n) + " " + o.unit +
      " · " + L.higher_than + " " + f.pct(below)));

    var diff = row.value - this.mean;
    var cmp;
    if (Number(diff.toFixed(o.digits)) === 0) {
      cmp = "= " + L.same + " " + L.average_of_all + " (" + f.fmt(this.mean) + ")";
    } else {
      cmp = (diff > 0 ? "▲ " : "▼ ") + f.num(Math.abs(diff)) + o.diff_suffix + " " +
        (diff > 0 ? L.above : L.below) + " " + L.average_of_all + " (" + f.fmt(this.mean) + ")";
    }
    box.appendChild(el("div", "mgc-muted", cmp));
    box.appendChild(this.strip(row.value));
  };

  // Distribution of all values in grey, with this feature marked.
  ContextTooltip.prototype.strip = function (value) {
    var W = 200;
    var H = 22;
    var lo = this.lo;
    var hi = this.hi;
    var maxBin = Math.max.apply(null, this.bins) || 1;
    var bw = W / STRIP_BINS;
    var s = svg("svg", { viewBox: "0 0 " + W + " " + (H + 4), class: "mgc-tt-strip", "aria-hidden": "true" });
    for (var i = 0; i < STRIP_BINS; i++) {
      var h = (this.bins[i] / maxBin) * H;
      s.appendChild(svg("rect", { x: i * bw + 0.5, y: H - h, width: bw - 1, height: h, class: "mgc-bar-all" }));
    }
    var xOf = function (v) {
      return hi > lo ? ((v - lo) / (hi - lo)) * W : W / 2;
    };
    s.appendChild(svg("line", { x1: xOf(this.mean), x2: xOf(this.mean), y1: 0, y2: H, class: "mgc-mean-all" }));
    var colors = this.o.color ? null : U.layerColors(this.map, this.o.layer_id, this.o.column);
    var fill = colors ? colors(value) : (this.o.color || "#1f6feb");
    s.appendChild(svg("circle", {
      cx: Math.min(Math.max(xOf(value), 4), W - 4), cy: H - 2, r: 4,
      class: "mgc-tt-marker", style: "fill:" + fill,
    }));
    return s;
  };

  C.components.context_tooltip = function (map, x, o) {
    var data = C.layerData(map, x, o.layer_id);
    if (!data) return;
    if (U.numericRows(data, o.column).length === 0) {
      console.error("mapgl context: column " + o.column + " has no numeric values");
      return;
    }
    data.highlighter.setColor(o.highlight_color);
    var tooltip = new ContextTooltip(map, o, data);
    map._mapglContext.tooltips = map._mapglContext.tooltips || {};
    map._mapglContext.tooltips[o.layer_id] = tooltip;
  };
})();
