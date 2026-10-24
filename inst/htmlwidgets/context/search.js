// Feature search: a search box over a column of the layer's own data, with
// suggestions as you type. Choosing a result moves the map to the feature
// and outlines it. Matching ignores case and accents.
(function () {
  "use strict";

  var C = window.MapglContext;
  var U = C.util;
  var el = U.el;
  var counter = 0;

  function FeatureSearchControl(o, data) {
    this.o = o;
    this.data = data;
    this.highlighter = data.highlighter;
    this.uid = "mgc-search-" + (++counter);
    this.entries = [];
    var entries = this.entries;
    data.features.forEach(function (f) {
      var label = f.props[o.search_column];
      if (label == null || label === "") return;
      var detail = o.detail_column ? f.props[o.detail_column] : null;
      entries.push({
        feature: f,
        label: String(label),
        detail: detail == null ? null : String(detail),
        norm: U.normalizeText(label),
      });
    });
    this.matches = [];
    this.active = -1;
  }

  FeatureSearchControl.prototype.onAdd = function (map) {
    var self = this;
    var o = this.o;
    var L = o.labels;
    this.map = map;

    var c = el("div", "maplibregl-ctrl mapboxgl-ctrl mapgl-context-search");
    c.style.width = o.width + "px";
    var input = el("input", "mgc-search-input");
    input.type = "search";
    input.placeholder = o.placeholder || L.search_placeholder;
    input.setAttribute("aria-label", o.placeholder || L.search_placeholder);
    input.setAttribute("role", "combobox");
    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("aria-expanded", "false");
    input.setAttribute("aria-controls", this.uid);
    input.autocomplete = "off";
    var list = el("ul", "mgc-search-list");
    list.id = this.uid;
    list.setAttribute("role", "listbox");
    c.appendChild(input);
    c.appendChild(list);
    this.container = c;
    this.input = input;
    this.list = list;

    input.addEventListener("input", function () {
      self.search(input.value);
    });
    input.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        self.move(1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        self.move(-1);
      } else if (e.key === "Enter") {
        e.preventDefault();
        var m = self.matches[self.active >= 0 ? self.active : 0];
        if (m) self.choose(m);
      } else if (e.key === "Escape") {
        if (self.matches.length) {
          self.close();
        } else {
          input.value = "";
        }
      }
    });
    // Delay so a click on a suggestion lands before the list closes.
    input.addEventListener("blur", function () {
      setTimeout(function () {
        self.close();
      }, 150);
    });
    input.addEventListener("focus", function () {
      if (input.value) self.search(input.value);
    });
    return c;
  };

  FeatureSearchControl.prototype.onRemove = function () {
    if (this.container.parentNode) this.container.parentNode.removeChild(this.container);
    this.map = null;
  };

  // Names starting with the query first, then names containing it.
  FeatureSearchControl.prototype.search = function (text) {
    var q = U.normalizeText(text).trim();
    if (!q) {
      this.close();
      return;
    }
    var starts = [];
    var contains = [];
    var max = this.o.max_results;
    for (var i = 0; i < this.entries.length; i++) {
      var e = this.entries[i];
      var pos = e.norm.indexOf(q);
      if (pos === 0) starts.push(e);
      else if (pos > 0) contains.push(e);
    }
    var byLabel = function (a, b) {
      return a.label.localeCompare(b.label, this.o.locale);
    }.bind(this);
    starts.sort(byLabel);
    contains.sort(byLabel);
    this.matches = starts.concat(contains).slice(0, max);
    this.active = -1;
    this.render();
  };

  FeatureSearchControl.prototype.render = function () {
    var self = this;
    var L = this.o.labels;
    var list = this.list;
    list.textContent = "";
    if (this.matches.length === 0) {
      var none = el("li", "mgc-search-none", L.search_none);
      list.appendChild(none);
    }
    this.matches.forEach(function (m, i) {
      var item = el("li", "mgc-search-item");
      item.id = self.uid + "-" + i;
      item.setAttribute("role", "option");
      item.appendChild(el("span", "mgc-search-label", m.label));
      if (m.detail) item.appendChild(el("span", "mgc-search-detail", m.detail));
      item.addEventListener("mouseenter", function () {
        self.setActive(i);
      });
      item.addEventListener("mousedown", function (e) {
        // Keep focus in the input so blur does not close the list first.
        e.preventDefault();
        self.choose(m);
      });
      list.appendChild(item);
    });
    list.style.display = "block";
    this.input.setAttribute("aria-expanded", "true");
  };

  FeatureSearchControl.prototype.setActive = function (i) {
    var items = this.list.querySelectorAll(".mgc-search-item");
    for (var k = 0; k < items.length; k++) {
      items[k].classList.toggle("mgc-active", k === i);
      items[k].setAttribute("aria-selected", String(k === i));
    }
    this.active = i;
    if (i >= 0 && this.matches[i]) {
      this.input.setAttribute("aria-activedescendant", this.uid + "-" + i);
      this.highlighter.one(this.matches[i].feature.id);
    }
  };

  FeatureSearchControl.prototype.move = function (step) {
    if (!this.matches.length) return;
    var n = this.matches.length;
    this.setActive((this.active + step + n) % n);
  };

  FeatureSearchControl.prototype.close = function () {
    if (this.active >= 0) this.highlighter.clear();
    this.list.style.display = "none";
    this.list.textContent = "";
    this.matches = [];
    this.active = -1;
    this.input.setAttribute("aria-expanded", "false");
    this.input.removeAttribute("aria-activedescendant");
  };

  FeatureSearchControl.prototype.choose = function (m) {
    this.input.value = m.label;
    this.close();
    this.highlighter.goTo(m.feature);
  };

  C.components.feature_search = function (map, x, o) {
    var data = C.layerData(map, x, o.layer_id);
    if (!data) return;
    var control = new FeatureSearchControl(o, data);
    data.highlighter.setColor(o.highlight_color);
    U.addControl(map, control, o.position, "feature_search");
  };
})();
