# Add an "in this view" summary panel to a map

Adds a panel that summarises the features of a layer that are currently
visible and compares them with the whole layer: how many are in view,
their average (or median, or total), the highest and lowest values, and
a histogram of the visible values over the distribution of all values.
The panel updates as the map is panned and zoomed.

## Usage

``` r
add_view_summary(
  map,
  layer_id,
  column,
  label = column,
  name_column = NULL,
  stat = c("mean", "median", "sum"),
  weight = NULL,
  weight_label = weight,
  title = NULL,
  unit = "features",
  locale = "en-US",
  digits = 1,
  prefix = "",
  suffix = "",
  diff_suffix = NULL,
  position = "top-left",
  width = 260,
  color = NULL,
  highlight_color = "#1f2328",
  bins = 20,
  compact = FALSE,
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

  Name of the numeric column to summarise.

- label:

  Name of the variable shown in the panel. Defaults to `column`.

- name_column:

  Optional column with feature names, used to report the highest and
  lowest features in view.

- stat:

  Statistic shown for the features in view: `"mean"` (the default),
  `"median"` or `"sum"`. For `"sum"` the panel shows which share of the
  overall total is in view, which suits absolute values such as
  population or sales.

- weight:

  Optional numeric column used to weight the mean or median, for example
  population. When given, the panel also shows the share of the total
  weight that is in view. It is not used by `stat = "sum"`.

- weight_label:

  Name of the weight shown in the panel. Defaults to `weight`.

- title:

  Title of the panel. `NULL` (the default) uses the `title` label, "In
  this view".

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

- position:

  Corner for the panel: one of `"top-left"`, `"top-right"`,
  `"bottom-left"` or `"bottom-right"`.

- width:

  Width of the panel in pixels.

- color:

  Color for the histogram bars of the features in view. `NULL` (the
  default) uses the layer's own color scale when it is an
  `interpolate()` or
  [`step_expr()`](https://walker-data.com/mapgl/reference/step_expr.html)
  on `column`, and blue otherwise.

- highlight_color:

  Color of the outline drawn around features when hovering over the
  histogram or the highest and lowest names.

- bins:

  Number of histogram bins.

- compact:

  If `TRUE`, shows only the count, the value and the comparison, without
  highest and lowest or histogram.

- collapsible:

  If `TRUE`, adds a button to collapse the panel down to its title and
  value.

- collapsed:

  Whether the panel starts collapsed. `NULL` (the default) starts
  collapsed on maps narrower than 480 pixels, such as on phones.

- labels:

  Panel texts, as returned by
  [`context_labels()`](https://jmtocho.github.io/maplore/reference/context_labels.md).

## Value

The modified map object.

## Details

The panel is also a way into the map: hovering over a histogram bar
outlines the features in that range, and clicking on the name of the
highest or lowest feature moves the map to it. When the layer is colored
with `mapgl::interpolate()` or
[`mapgl::step_expr()`](https://walker-data.com/mapgl/reference/step_expr.html)
on the same column, the histogram uses the same colors, so it doubles as
a legend.

All the work happens in the browser, so the panel works in static HTML,
R Markdown and Quarto documents without Shiny.

A feature counts as "in view" when any part of it is on screen: for
points, when the point is on screen. Features outside the layer's zoom
range are not counted, and neither are features hidden by the layer's
`filter` (in that case only features drawn on screen are counted, so
very small features may be missed at low zoom).

On a clustered layer (`cluster_options` in
[`mapgl::add_circle_layer()`](https://walker-data.com/mapgl/reference/add_circle_layer.html)),
every point in view is counted, whether it is drawn on its own or inside
a cluster. Use the ID of the layer itself, not of its `-clusters` layer.

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
    ),
    fill_opacity = 0.8
  ) |>
  add_view_summary(
    layer_id = "deptos",
    column = "growth",
    label = "Population growth 2022-2035",
    name_column = "department",
    weight = "pop_2022",
    weight_label = "population",
    unit = "departments",
    suffix = "%"
  )
} # }
```
