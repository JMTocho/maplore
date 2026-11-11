# Turn the map into a ranking of shapes

Adds a button that lifts every polygon of a layer out of the map and
lines them up in a grid, sorted by a column, all at the same size and
with their rank, name and value below. Another click sends them back to
their place. Shapes keep their form and colour, so readers see at a
glance both where each one is and how it ranks.

## Usage

``` r
add_rank_morph(
  map,
  layer_id,
  column,
  name_column,
  order = c("desc", "asc"),
  n = 30,
  title = NULL,
  duration = 1.6,
  locale = "en-US",
  digits = 1,
  prefix = "",
  suffix = "",
  position = "top-right",
  labels = context_labels()
)
```

## Arguments

- map:

  A map created with
  [`mapgl::maplibre()`](https://walker-data.com/mapgl/reference/maplibre.html)
  or
  [`mapgl::mapboxgl()`](https://walker-data.com/mapgl/reference/mapboxgl.html).

- layer_id:

  ID of a fill layer whose source is an sf object or inline GeoJSON.

- column:

  Numeric column to sort by.

- name_column:

  Column with the name shown under each shape.

- order:

  `"desc"` (the default) puts the highest value first, `"asc"` the
  lowest.

- n:

  Largest number of shapes in the grid, from 1 to 50. With more than 30,
  shapes become small and hard to recognise.

- title:

  Optional title shown above the grid while it is visible.

- duration:

  Length of the animation, in seconds.

- locale, digits, prefix, suffix:

  Number formatting for the values, as in
  [`add_view_summary()`](https://jmtocho.github.io/maplore/reference/add_view_summary.md).

- position:

  Corner for the button: one of `"top-right"` (the default),
  `"top-left"`, `"bottom-right"` or `"bottom-left"`.

- labels:

  Texts, as returned by
  [`context_labels()`](https://jmtocho.github.io/maplore/reference/context_labels.md):
  `morph_sort` and `morph_back` for the button, `morph_highest` and
  `morph_lowest` for the line under the title.

## Value

The modified map object.

## Details

While the shapes are out of the map, panning and zooming are paused, and
the grid scrolls with the mouse wheel or a finger when it is taller than
the map. On a globe the map turns flat during the animation and back to
a globe at the end. Features without a value in `column` are left out of
the grid. For small islands far from the main part of a feature (more
than about twice its size away), the grid shows the main part only.

The animation is meant for a few shapes, such as the provinces of a
country. When the layer has more than `n` features, only the first `n`
(the highest, or the lowest with `order = "asc"`) move to the grid, and
the rest fade under it; a line under the title tells readers, such as
"The 30 highest of 529". To show them all, group the features first,
such as departments into provinces. Readers who prefer reduced motion
(an operating system setting) see the result without the animation.

## Examples

``` r
if (FALSE) { # \dontrun{
library(mapgl)

maplibre(center = c(137, 37), zoom = 4.2) |>
  add_fill_layer(
    id = "prefectures",
    source = jp_prefectures,
    fill_color = interpolate(
      column = "change",
      values = c(-7, 0, 1),
      stops = c("#b2182b", "#f7f7f7", "#2166ac")
    )
  ) |>
  add_rank_morph(
    layer_id = "prefectures",
    column = "change",
    name_column = "prefecture",
    suffix = " %",
    title = "Population change, 2020-2024"
  )
} # }
```
