# Add notes about the whole map

Adds a small "Notes" button that opens a panel with context about the
map and its data: where the data come from, what the figures do not
include, and a link to learn more. Unlike a tooltip, the notes are about
the whole map, not about one feature. They start collapsed, so they do
not cover the map, and open with a click.

## Usage

``` r
add_map_notes(
  map,
  source = NULL,
  notes = NULL,
  link = NULL,
  link_label = NULL,
  title = NULL,
  position = "bottom-left",
  width = 280,
  collapsed = TRUE,
  fade = c("none", "moving"),
  labels = context_labels()
)
```

## Arguments

- map:

  A map created with
  [`mapgl::maplibre()`](https://walker-data.com/mapgl/reference/maplibre.html)
  or
  [`mapgl::mapboxgl()`](https://walker-data.com/mapgl/reference/mapboxgl.html).

- source:

  Where the data come from, such as `"INDEC, 2022 census"`.

- notes:

  One or more notes about the map or its data, each shown as a bullet,
  such as what the figures do not include.

- link:

  Optional web address to learn more, starting with `http://` or
  `https://`. It opens in a new tab.

- link_label:

  Text of the link. `NULL` (the default) uses the `notes_link` label,
  "More information".

- title:

  Title of the panel. `NULL` (the default) uses the `notes_title` label,
  "Notes".

- position:

  Corner for the notes: one of `"bottom-left"` (the default),
  `"bottom-right"`, `"top-left"` or `"top-right"`.

- width:

  Width of the open panel in pixels.

- collapsed:

  If `TRUE` (the default), the notes start collapsed to a small button.
  `FALSE` shows them open.

- fade:

  `"moving"` fades the panel while the map is panned or zoomed. `"none"`
  (the default) keeps it always solid.

- labels:

  Panel texts, as returned by
  [`context_labels()`](https://jmtocho.github.io/maplore/reference/context_labels.md).

## Value

The modified map object.

## Details

Texts are shown as plain text, never as HTML.

## Examples

``` r
if (FALSE) { # \dontrun{
library(mapgl)

maplibre(center = c(-64, -38.5), zoom = 3.4) |>
  add_fill_layer(id = "departments", source = ar_departments, fill_color = "#9ecae1") |>
  add_map_notes(
    source = "INDEC, population projections 2022-2035.",
    notes = c(
      "Growth is the total change between 2022 and 2035, not per year.",
      "Islas del Atlantico Sur is not included: it has no estimates."
    ),
    link = "https://www.indec.gob.ar"
  )
} # }
```
