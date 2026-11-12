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

A panel that summarizes the features in view and compares them with the
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
- `fade = "moving"`: the panel fades while the map is panned or zoomed,
  so the map shows through, and comes back when the map stops.
- `chart`: the chart at the bottom of the panel, shown below.
- `references`: other values to compare the view with, shown below.
- `color`: one color for the chart instead of the map’s colors.

### Choosing the chart: `chart`

The chart at the bottom of the panel can be:

- `"histogram"` (the default): the values in view over the distribution
  of all values, as above.
- `"position"`: a bar spanning all values, in the map’s colors, with the
  value in view (dot) and the whole map (dashed line) marked on it. The
  simplest to read.
- `"strip"`: one dot per feature, those in view in the map’s colors over
  all the others in gray. It shows where the features in view fall among
  all of them; above 2,000 features, an even sample is drawn.
- `"split"`: two histograms on the same scale, the view above and all
  features below.
- `"none"`: no chart, for a shorter panel.

In all of them, hovering over the chart outlines the features in that
range of values on the map.

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
    suffix = "%",
    chart = "position"
  )
```

### Comparing with other references: `references`

Besides the whole map, the panel can compare the view with up to three
other values, as a named list. Each one is either a fixed number, such
as a target or a national figure, or a
[`reference_group()`](https://jmtocho.github.io/maplore/reference/reference_group.md)
of features, whose value is computed with the same statistic and weight
as the panel.

The five prefectures of `jp_prefectures` are younger, on average, than
Japan as a whole, where 29.3% of people were 65 or older in 2024. Here
the view is compared with Tokyo and with the national figure:

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
    suffix = "%",
    chart = "none",
    references = list(
      "Tokyo" = reference_group("prefecture", "Tokyo"),
      "Japan" = 29.3
    )
  )
```

Zoom into Akita, in the north: it is far above both Tokyo and Japan.

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
    weight_label = "population",
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

Use `n` to show fewer entries, such as `n = 3` on small maps. Like the
summary, the ranking takes `fade = "moving"`, `collapsed` and `width`.

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

On small maps, such as on phones, `collapsed = TRUE` folds the search
box into a button with a magnifying glass, which opens it. It folds back
when it loses focus while empty, and Escape closes it. `width` sets the
width of the open box.

``` r

japan |>
  add_feature_search(
    layer_id = "prefectures",
    search_column = "prefecture",
    collapsed = TRUE,
    width = 200
  )
```

## How do they rank? `add_rank_morph()`

A button that lifts the shapes out of the map and lines them up, sorted
by a column, all at the same size, with their rank, name and value
below. Shapes keep their form and color, so readers see at once where
each one is and how it ranks. Another click sends them back to their
place.

``` r

japan |>
  add_rank_morph(
    layer_id = "prefectures",
    column = "aged_65",
    name_column = "prefecture",
    suffix = "%",
    title = "Share of people aged 65 and over, 2024"
  )
```

While the shapes are out of the map, the map does not move, and the
other maplore panels hide. If the shapes do not fit, the grid scrolls.
It works with polygon layers of up to 50 features, and best with up to
30, such as the provinces or states of a country. `duration` sets the
length of the animation, in seconds; readers who turned on reduced
motion in their system see the result without the animation.

## Where do these data come from? `add_map_notes()`

A small “Notes” button that opens a panel about the whole map: the
source of the data, what the figures do not include, and a link to learn
more. It starts collapsed, so it does not cover the map.

``` r

japan |>
  add_map_notes(
    source = "Statistics Bureau of Japan, Japan Statistical Yearbook 2026.",
    notes = c(
      "Share of the population aged 65 and over, in 2024.",
      "Only five of the 47 prefectures are shown."
    ),
    link = "https://www.stat.go.jp/english/data/nenkan/"
  )
```

## Making room on small screens

On a phone, several panels can cover the map and the controls of mapgl,
such as its legend or navigation buttons. A few options help:

- `style = "mini"` or `chart = "none"` for a shorter summary.
- `n = 3` for a shorter ranking.
- `collapsed = TRUE` to start the search box, the summary or the ranking
  collapsed. The summary and the ranking already start collapsed on maps
  narrower than 480 px, and the notes always do.
- `width` to make each panel narrower.
- `fade = "moving"`, so the panels give way to the map while it moves.
- `position`, to place each component in a different corner, away from
  the legend.

## Point layers

All the components except
[`add_rank_morph()`](https://jmtocho.github.io/maplore/reference/add_rank_morph.md)
work with point layers too
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
