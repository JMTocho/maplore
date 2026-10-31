# The components

Each component answers a question people ask when they look at a map.
The examples use `jp_prefectures`, five prefectures of Japan from north
to south, and `earthquakes`, points in southern South America.

``` r

library(mapgl)
library(maplore)

japan <- maplibre(style = carto_style("positron"), center = c(135, 35), zoom = 4) |>
  add_fill_layer(
    id = "prefectures",
    source = jp_prefectures,
    fill_color = interpolate(
      column = "aged_65",
      values = c(22, 30, 40),
      stops = c("#fee8c8", "#fdbb84", "#b30000")
    ),
    fill_opacity = 0.85
  )
```

## What am I looking at? `add_view_summary()`

A panel that summarises the features in view and compares them with the
whole map.

``` r

japan |>
  add_view_summary(
    layer_id = "prefectures",
    column = "aged_65",
    label = "Aged 65 and over",
    name_column = "prefecture",
    weight = "pop_2024",
    weight_label = "population",
    unit = "prefectures",
    suffix = "%"
  )
```

Options:

- `stat`: `"mean"` (the default), `"median"` or `"sum"`. `"sum"` suits
  absolute values, such as population, and shows the share of the total
  in view: *“16.8M, 36% of total”*. Values of a million or more are
  abbreviated.
- `weight`: a column to weight the mean or median, such as population.
- `style`: how much the panel shows. `"full"` (the default) is the panel
  above; `"compact"` keeps only the count, the value and the comparison;
  `"mini"` is a strip of three figures, shown below.
- `show_area = TRUE`: adds the area of the Earth covered by the screen,
  in km² (or mi², with `area_unit = "mi2"`). The `"mini"` style shows it
  by default.
- `collapsed`: the button in the corner collapses the panel to its title
  and value. On maps narrower than 480 px, such as on phones, the panel
  starts collapsed; `collapsed = FALSE` keeps it open and
  `collapsible = FALSE` removes the button.
- `color`: one color for the histogram instead of the map’s colors.

### A smaller panel: `style = "mini"`

Three figures side by side: how many features are in view out of the
total, the statistic (hover over it to see how it compares with the
whole map), and the area covered by the screen.

``` r

japan |>
  add_view_summary(
    layer_id = "prefectures",
    column = "aged_65",
    label = "Aged 65 and over",
    weight = "pop_2024",
    unit = "prefectures",
    suffix = "%",
    style = "mini"
  )
```

The area shows as a dash when part of the screen is not on the Earth,
such as when the globe does not fill the screen: zoom in to see it.

## Which ones stand out here? `add_view_ranking()`

A live list of the features in view with the highest values, or the
lowest with `order = "asc"`. Each entry shows a bar on the scale of the
whole map and its overall rank (`#2` = second of all). Click on a name
to go there.

``` r

japan |>
  add_view_ranking(
    layer_id = "prefectures",
    column = "change",
    name_column = "prefecture",
    label = "Population change 2020-2024",
    order = "asc",
    unit = "prefectures",
    suffix = "%"
  )
```

## Is this value high or low? `add_context_tooltip()`

A tooltip that shows a feature’s value together with its rank, the share
of features below it, its difference with the average, and a small strip
of the whole distribution with the feature marked. Use it instead of the
layer’s own `tooltip`, or both will show.

``` r

japan |>
  add_context_tooltip(
    layer_id = "prefectures",
    column = "aged_65",
    name_column = "prefecture",
    label = "Aged 65 and over",
    weight = "pop_2024",
    unit = "prefectures",
    suffix = "%"
  )
```

## Where is this place? `add_feature_search()`

A search box over a column of your data. Matching ignores case and
accents (“tokyo” finds “Tokyo”, “cordoba” finds “Córdoba”), and
`detail_column` tells apart repeated names. Choosing a result moves the
map there and outlines it. It works with the keyboard: arrows, Enter and
Escape.

Unlike
[`mapgl::add_geocoder_control()`](https://walker-data.com/mapgl/reference/add_geocoder_control.html),
which searches places around the world, this searches the map’s own
data.

``` r

japan |>
  add_feature_search(layer_id = "prefectures", search_column = "prefecture")
```

## Point layers

All the components work with point layers too
([`add_circle_layer()`](https://walker-data.com/mapgl/reference/add_circle_layer.html),
[`add_symbol_layer()`](https://walker-data.com/mapgl/reference/add_symbol_layer.html)),
clustered or not. On a clustered layer every point in view counts,
whether it is drawn on its own or inside a cluster.

Earthquakes get deeper from west to east, following the Nazca plate as
it sinks under South America. Zoom from the Chilean coast to Santiago
del Estero and the average depth goes from about 56 km to about 200 km:

``` r

maplibre(style = carto_style("positron"), center = c(-66, -33), zoom = 4) |>
  add_circle_layer(
    id = "earthquakes",
    source = earthquakes,
    circle_color = interpolate(
      column = "depth",
      values = c(0, 100, 300, 600),
      stops = c("#fde725", "#21918c", "#3b528b", "#440154")
    ),
    circle_radius = 4,
    circle_stroke_color = "white",
    circle_stroke_width = 0.5
  ) |>
  add_view_summary(
    layer_id = "earthquakes",
    column = "depth",
    label = "Depth",
    name_column = "place",
    unit = "earthquakes",
    digits = 0,
    suffix = " km",
    labels = context_labels(highest = "Deepest", lowest = "Shallowest")
  )
```
