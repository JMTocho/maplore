# maplore

maplore adds components to [mapgl](https://walker-data.com/mapgl/) maps
that help readers understand what they are looking at: as they pan and
zoom, the map tells them how the area in view compares with the rest.

![Map of the Buenos Aires metropolitan area coloured by projected
population growth, with the four components. Top left, the view summary:
61 of 528 departments, 36% of the population, average -0.4%, 2.5 points
below the national 2.1%. Top right, a search box and the ranking of the
highest values in view, led by San Vicente. Over La Matanza, outlined on
the map, the context tooltip reads: growth 0.6%, rank 399 of 528, higher
than 24%, 1.5 points below the
average](reference/figures/maplore-all.png)

Map of the Buenos Aires metropolitan area coloured by projected
population growth, with the four components. Top left, the view summary:
61 of 528 departments, 36% of the population, average -0.4%, 2.5 points
below the national 2.1%. Top right, a search box and the ranking of the
highest values in view, led by San Vicente. Over La Matanza, outlined on
the map, the context tooltip reads: growth 0.6%, rank 399 of 528, higher
than 24%, 1.5 points below the average

- [`add_view_summary()`](https://jmtocho.github.io/maplore/reference/add_view_summary.md):
  what is in view, compared with the whole map.
- [`add_view_ranking()`](https://jmtocho.github.io/maplore/reference/add_view_ranking.md):
  which features stand out in view.
- [`add_context_tooltip()`](https://jmtocho.github.io/maplore/reference/add_context_tooltip.md):
  whether a value is high or low, and its rank.
- [`add_feature_search()`](https://jmtocho.github.io/maplore/reference/add_feature_search.md):
  find a place in your own data.

Everything runs in the browser, so it works in HTML pages, R Markdown
and Quarto documents and dashboards, with no Shiny server.

## Installation

``` r

# install.packages("pak")
pak::pak("JMTocho/maplore")
```

## Example

``` r

library(mapgl)
library(maplore)

maplibre(center = c(-64, -38.5), zoom = 3.4) |>
  add_fill_layer(
    id = "departments",
    source = ar_departments,
    fill_color = interpolate(
      column = "growth",
      values = c(-10, 0, 10),
      stops = c("#b2182b", "#f7f7f7", "#2166ac")
    )
  ) |>
  add_view_summary("departments", "growth", name_column = "department", suffix = "%") |>
  add_context_tooltip("departments", "growth", name_column = "department", suffix = "%")
```

## Learn more

The [website](https://jmtocho.github.io/maplore/) explains each
component, the included datasets and how maplore works.

maplore is experimental, and its functions may still change. Feedback
and bug reports are welcome in the
[issues](https://github.com/JMTocho/maplore/issues).

Much of the code was written with the help of an AI assistant (Claude,
by Anthropic) and reviewed, tested and checked against independent
calculations in R.
