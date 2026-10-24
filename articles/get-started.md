# Get started

A choropleth tells readers *where* values are high or low, but not *how
much* the area they are looking at differs from the rest. maplore adds
components to [mapgl](https://walker-data.com/mapgl/) maps that answer
that as readers pan and zoom.

This page builds a map of Argentina’s projected population growth, one
component at a time. Every map here is live: pan, zoom and hover over
it.

``` r

library(mapgl)
library(maplore)
```

## The data

`ar_departments` comes with maplore: the 528 Argentine departments with
their estimated population in 2022 and 2035 and the projected growth
between both years, in percent.

``` r

head(sf::st_drop_geometry(ar_departments))
#>      id department                        province pop_2022 pop_2035 growth
#> 1 02007   Comuna 1 Ciudad Autónoma de Buenos Aires   250490   251915   0.57
#> 2 02014   Comuna 2 Ciudad Autónoma de Buenos Aires   154123   142387  -7.61
#> 3 02021   Comuna 3 Ciudad Autónoma de Buenos Aires   190296   170489 -10.41
#> 4 02028   Comuna 4 Ciudad Autónoma de Buenos Aires   244077   229894  -5.81
#> 5 02035   Comuna 5 Ciudad Autónoma de Buenos Aires   189214   174772  -7.63
#> 6 02042   Comuna 6 Ciudad Autónoma de Buenos Aires   186039   170806  -8.19
```

## A summary of what is in view

Start with a regular mapgl map: a fill layer colored by growth. Then add
[`add_view_summary()`](https://jmtocho.github.io/maplore/reference/add_view_summary.md)
with the layer’s ID and the column to summarise.

``` r

colors <- interpolate(
  column = "growth",
  values = c(-10, 0, 10),
  stops = c("#b2182b", "#f7f7f7", "#2166ac")
)

map <- maplibre(style = carto_style("positron"), center = c(-64, -38.5), zoom = 3.4) |>
  add_fill_layer(
    id = "departments",
    source = ar_departments,
    fill_color = colors,
    fill_opacity = 0.85
  ) |>
  add_view_summary(
    layer_id = "departments",
    column = "growth",
    label = "Population growth 2022-2035",
    name_column = "department",
    weight = "pop_2022",
    weight_label = "population",
    unit = "departments",
    suffix = "%"
  )
```

Zoom into Buenos Aires: the panel shows how many departments are in
view, their average growth weighted by population, how it compares with
the whole country, the highest and lowest departments, and a histogram
of the values in view over all values. The histogram uses the map’s
colors, so it works as a legend too:

- hover over a bar to outline the departments in that range;
- click on the highest or lowest name to go there.

## More components

All the components can be used together. Add a ranking of the
departments in view, a tooltip that puts each value in context and a
search box:

``` r

map |>
  add_view_ranking(
    layer_id = "departments",
    column = "growth",
    name_column = "department",
    label = "Population growth",
    unit = "departments",
    suffix = "%"
  ) |>
  add_context_tooltip(
    layer_id = "departments",
    column = "growth",
    name_column = "department",
    label = "Population growth",
    weight = "pop_2022",
    unit = "departments",
    suffix = "%"
  ) |>
  add_feature_search(
    layer_id = "departments",
    search_column = "department",
    detail_column = "province"
  )
```

## In other languages

Numbers are formatted for any locale, and every text can be changed. The
package includes English and Spanish texts:

``` r

add_view_summary(
  ...,
  locale = "es-AR",               # 1.234,5 instead of 1,234.5
  labels = context_labels("es")   # Spanish texts
)

context_labels("en", title = "Visible now")  # change any text
```

## Where it works

Everything runs in the browser. The components work in any place where a
mapgl map works: the RStudio and Positron viewers, HTML files saved with
[`htmlwidgets::saveWidget()`](https://rdrr.io/pkg/htmlwidgets/man/saveWidget.html),
R Markdown and Quarto documents, and Quarto dashboards, with no Shiny
server.

Next, see [the
components](https://jmtocho.github.io/maplore/articles/components.md) in
detail.
