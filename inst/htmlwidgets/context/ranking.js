// Ranking panel: the highest (or lowest) features in view, updated as the
// map moves. Each name moves the map to the feature, and its rank among all
// features is shown for context.
(function () {
  "use strict";

  var C = window.MapglContext;
  var U = C.util;
  var el = U.el;

  function ViewRankingControl(o, data) {
    this.o = o;
    this.data = data;
    this.desc = o.order === "desc";
    this.rows = U.numericRows(data, o.column, null, o.name_column);
    var desc = this.desc;
    var sorted = this.rows.slice().sort(function (a, b) {
      return desc ? b.value - a.value : a.value - b.value;
    });
    // Rank among all features, in the order of the list (1 = first).
    this.rank = {};
    var rank = this.rank;
    sorted.forEach(function (r, i) {
      rank[r.id] = i + 1;
    });
    this.byId = {};
    var byId = this.byId;
    this.rows.forEach(function (r) {
      byId[r.id] = r;
    });
    this.lo = sorted.length ? Math.min(sorted[0].value, sorted[sorted.length - 1].value) : 0;
    this.hi = sorted.length ? Math.max(sorted[0].value, sorted[sorted.length - 1].value) : 0;
    this.f = new U.Formatter(o);
    this.highlighter = data.highlighter;
    this._signature = null;
  }

  ViewRankingControl.prototype.onAdd = function (map) {
    var self = this;
    this.map = map;
    this.panel = new U.Panel(map, this.o, function () {
      self._signature = null;
      self.update();
    });
    this.panel.container.classList.add("mgc-ranking");
    this.stop = U.onViewChange(map, function () {
      self.update();
    });
    return this.panel.container;
  };

  ViewRankingControl.prototype.onRemove = function () {
    this.stop();
    var c = this.panel.container;
    if (c.parentNode) c.parentNode.removeChild(c);
    this.map = null;
  };

  ViewRankingControl.prototype.colorOf = function () {
    if (this._colors === undefined) {
      var scale = this.o.color ? null : U.layerColors(this.map, this.o.layer_id, this.o.column);
      if (scale === undefined) return null;
      this._colors = scale;
    }
    return this._colors;
  };

  ViewRankingControl.prototype.update = function () {
    if (!this.map) return;
    var self = this;
    var o = this.o;
    var L = o.labels;
    var f = this.f;
    var panel = this.panel;
    var byId = this.byId;
    var desc = this.desc;

    // Keep the best n in one pass instead of sorting everything in view,
    // which matters with tens of thousands of points.
    var before = function (a, b) {
      return desc ? a.value > b.value : a.value < b.value;
    };
    var top = [];
    var count = 0;
    var n = o.n;
    this.data.tracker.visibleIds().forEach(function (id) {
      var r = byId[id];
      if (!r) return;
      count++;
      if (top.length === n && !before(r, top[n - 1])) return;
      var i = top.length < n ? top.length : n - 1;
      top[i] = r;
      while (i > 0 && before(top[i], top[i - 1])) {
        var tmp = top[i - 1];
        top[i - 1] = top[i];
        top[i] = tmp;
        i--;
      }
    });

    var signature = top.map(function (r) { return r.id; }).join(",") + ":" +
      count + ":" + panel.collapsed + ":" + (this._colors !== undefined);
    if (signature === this._signature) return;
    this._signature = signature;

    panel.titleEl.textContent = o.title || (desc ? L.ranking_highest : L.ranking_lowest);
    panel.miniValueEl.textContent = top.length ? String(top[0].name) : "";

    var body = panel.body;
    body.textContent = "";
    if (panel.collapsed) return;

    if (top.length === 0) {
      body.appendChild(el("div", "mgc-empty", L.empty));
      return;
    }

    body.appendChild(el("div", "mgc-muted",
      o.label + " · " + f.int(count) + " " + o.unit + " " + L.in_view));

    var colors = this.colorOf();
    var accent = o.color || null;
    var span = this.hi - this.lo;
    var list = el("ol", "mgc-rank-list");
    top.forEach(function (r, i) {
      var item = el("li", "mgc-rank-item");
      item.appendChild(el("span", "mgc-rank-pos", String(i + 1)));

      var main = el("div", "mgc-rank-main");
      var line = el("div", "mgc-rank-line");
      line.appendChild(U.featureLink(self.highlighter, r.feature, r.name, L.go_to));
      line.appendChild(el("span", "mgc-rank-value", f.fmt(r.value)));
      main.appendChild(line);

      // Bar length on the overall range, so bars compare across views.
      var track = el("div", "mgc-rank-track");
      var bar = el("div", "mgc-rank-bar");
      var share = span > 0 ? (r.value - self.lo) / span : 1;
      bar.style.width = Math.max(share * 100, 2) + "%";
      var color = colors ? colors(r.value) : accent;
      if (color) bar.style.background = color;
      track.appendChild(bar);
      main.appendChild(track);
      item.appendChild(main);

      var overall = el("span", "mgc-rank-overall", "#" + f.int(self.rank[r.id]));
      overall.title = L.rank_overall + ": " + f.int(self.rank[r.id]) + " " + L.of + " " + f.int(self.rows.length);
      item.appendChild(overall);
      list.appendChild(item);
    });
    body.appendChild(list);

    body.appendChild(el("div", "mgc-footnote",
      "# = " + L.rank_overall + " (" + L.of + " " + f.int(this.rows.length) + ")"));
  };

  C.components.view_ranking = function (map, x, o) {
    var data = C.layerData(map, x, o.layer_id);
    if (!data) return;
    var control = new ViewRankingControl(o, data);
    if (control.rows.length === 0) {
      console.error("mapgl context: column " + o.column + " has no numeric values");
      return;
    }
    data.highlighter.setColor(o.highlight_color);
    U.addControl(map, control, o.position, "view_ranking");
  };
})();
