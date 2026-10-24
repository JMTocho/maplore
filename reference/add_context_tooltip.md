# Add a tooltip that puts each value in context

Adds a tooltip to a layer that shows, on hover (or tap on touch
screens), a feature's value together with where it stands among all
features: its rank, the share of features with a lower value, the
difference with the average, and a small distribution strip with the
feature marked.

## Usage

``` r
add_context_tooltip(
  map,
  layer_id,
  column,
  name_column = NULL,
  label = column,
  weight = NULL,
  unit = "features",
  locale = "en-US",
  digits = 1,
  prefix = "",
  suffix = "",
  diff_suffix = NULL,
  color = NULL,
  highlight = TRUE,
  highlight_color = "#1f2328",
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

  Name of the numeric column to show.

- name_column:

  Optional column with feature names, shown as the tooltip's title.

- label:

  Name of the variable shown in the panel. Defaults to `column`.

- weight:

  Optional numeric column used to weight the average, for example
  population.

- unit:

  Name for the features, shown as "14 of 528 `unit`".

- locale:

  Locale for number formatting, such as `"en-US"` or `"es-AR"`.

- digits:

  Number of decimals for values. Values of a million or more are
  abbreviated, such as `12.4M`.

- prefix, suffix:

  Text added before and after each value, such as `"$"` or `"%"`.

- diff_suffix:

  Text added after the difference between the view and the overall
  average. `NULL` (the default) uses `suffix`, except when `suffix`
  contains `"%"`: a difference between percentages is in percentage
  points, so the `points` label is used instead.

- color:

  Color for the feature's marker on the distribution strip. `NULL` (the
  default) uses the layer's own color scale when it is an
  `interpolate()` or
  [`step_expr()`](https://walker-data.com/mapgl/reference/step_expr.html)
  on `column`, and blue otherwise.

- highlight:

  If `TRUE`, outlines the feature under the pointer.

- highlight_color:

  Color of that outline.

- labels:

  Panel texts, as returned by
  [`context_labels()`](https://jmtocho.github.io/maplore/reference/context_labels.md).

## Value

The modified map object.

## Details

Use it instead of the layer's own `tooltip` argument: with both, two
tooltips are shown.

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
  add_context_tooltip(
    layer_id = "deptos",
    column = "growth",
    name_column = "department",
    label = "Population growth",
    unit = "departments",
    suffix = "%"
  )
} # }
```
