// Map notes: a panel with context about the whole map (source, notes, a
// link). It starts collapsed as a small "Notes" button and opens on click.
(function () {
  "use strict";

  var C = window.MapglContext;
  var U = C.util;
  var el = U.el;

  function MapNotesControl(o) {
    this.o = o;
  }

  MapNotesControl.prototype.onAdd = function (map) {
    var self = this;
    var o = this.o;
    var L = o.labels;
    this.map = map;
    this.panel = new U.Panel(map, o, function () {
      self.render();
    });
    var c = this.panel.container;
    c.classList.add("mgc-notes");

    var header = this.panel.titleEl.parentNode;
    header.insertBefore(el("span", "mgc-notes-icon", "ⓘ"), this.panel.titleEl);
    this.panel.titleEl.textContent = o.title || L.notes_title;
    // The whole header opens and closes the notes, not only the button.
    header.addEventListener("click", function (e) {
      if (e.target.closest(".mgc-toggle")) return;
      self.panel.setCollapsed(!self.panel.collapsed);
    });

    this.render();
    return c;
  };

  MapNotesControl.prototype.onRemove = function () {
    this.panel.destroy();
    this.map = null;
  };

  MapNotesControl.prototype.render = function () {
    var o = this.o;
    var L = o.labels;
    var body = this.panel.body;
    body.textContent = "";
    if (this.panel.collapsed) return;

    if (o.source) {
      var source = el("div", "mgc-notes-source");
      source.appendChild(el("strong", null, L.notes_source + ": "));
      source.appendChild(document.createTextNode(o.source));
      body.appendChild(source);
    }
    if (o.notes && o.notes.length) {
      var list = el("ul", "mgc-notes-list");
      o.notes.forEach(function (note) {
        list.appendChild(el("li", null, note));
      });
      body.appendChild(list);
    }
    if (o.link) {
      var a = el("a", "mgc-notes-link", (o.link_label || L.notes_link) + " ↗");
      a.href = o.link;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      body.appendChild(a);
    }
  };

  C.components.map_notes = function (map, x, o) {
    // Links are checked in R too; never follow anything but http(s).
    if (o.link && !/^https?:\/\//i.test(o.link)) o.link = null;
    U.addControl(map, new MapNotesControl(o), o.position, "map_notes");
  };
})();
