# Add a ranking of the features in view

Adds a panel listing the features in view with the highest (or lowest)
values, updated as the map is panned and zoomed. Each entry shows the
value, a bar on the scale of the whole layer and the feature's rank
among all features; clicking on a name moves the map to it.

## Usage

``` r
add_view_ranking(
  map,
  layer_id,
  column,
  name_column,
  label = column,
  n = 5,
  order = c("desc", "asc"),
  title = NULL,
  unit = "features",
  locale = "en-US",
  digits = 1,
  prefix = "",
  suffix = "",
  position = "top-right",
  width = 240,
  color = NULL,
  highlight_color = "#1f2328",
  collapsible = TRUE,
  collapsed = NULL,
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

  ID of the layer to summarise: a polygon layer (such as
  [`mapgl::add_fill_layer()`](https://walker-data.com/mapgl/reference/add_fill_layer.html))
  or a point layer (such as
  [`mapgl::add_circle_layer()`](https://walker-data.com/mapgl/reference/add_circle_layer.html)
  or
  [`mapgl::add_symbol_layer()`](https://walker-data.com/mapgl/reference/add_symbol_layer.html)).
  Its source must be an `sf` object or inline GeoJSON added in R; vector
  tile sources are not supported.

- column:

  Name of the numeric column to rank by.

- name_column:

  Column with the feature names to list.

- label:

  Name of the variable shown in the panel. Defaults to `column`.

- n:

  Number of features to list.

- order:

  `"desc"` (the default) lists the highest values first; `"asc"`, the
  lowest.

- title:

  Title of the panel. `NULL` (the default) uses the `ranking_highest` or
  `ranking_lowest` label.

- unit:

  Name for the features, shown as "14 of 528 `unit`".

- locale:

  Locale for number formatting, such as `"en-US"` or `"es-AR"`.

- digits:

  Number of decimals for values. Values of a million or more are
  abbreviated, such as `12.4M`.

- prefix, suffix:

  Text added before and after each value, such as `"$"` or `"%"`.

- position:

  Corner for the panel: one of `"top-left"`, `"top-right"`,
  `"bottom-left"` or `"bottom-right"`.

- width:

  Width of the panel in pixels.

- color:

  Color for the bars. `NULL` (the default) uses the layer's own color
  scale when it is an `interpolate()` or
  [`step_expr()`](https://walker-data.com/mapgl/reference/step_expr.html)
  on `column`, and blue otherwise.

- highlight_color:

  Color of the outline drawn around a feature when hovering over its
  name.

- collapsible:

  If `TRUE`, adds a button to collapse the panel down to its title and
  the first name.

- collapsed:

  Whether the panel starts collapsed. `NULL` (the default) starts
  collapsed on maps narrower than 480 pixels, such as on phones.

- labels:

  Panel texts, as returned by
  [`context_labels()`](https://jmtocho.github.io/maplore/reference/context_labels.md).

## Value

The modified map object.

## Details

Which features count as "in view" follows the same rules as
[`add_view_summary()`](https://jmtocho.github.io/maplore/reference/add_view_summary.md).

## Examples

``` r
if (FALSE) { # \dontrun{
library(mapgl)

maplibre(center = c(-64, -38.5), zoom = 3.4) |>
  add_fill_layer(
    id = "deptos",
    source = ar_departments,
    fill_color = interpolate(
      column = "growth",
      values = c(-10, 0, 10),
      stops = c("#b2182b", "#f7f7f7", "#2166ac")
    )
  ) |>
  add_view_ranking(
    layer_id = "deptos",
    column = "growth",
    name_column = "department",
    label = "Population growth 2022-2035",
    unit = "departments",
    suffix = "%"
  )
} # }
```
