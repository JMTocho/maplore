# Add a search box over the layer's own features

Adds a search box that suggests features of a layer as you type,
matching a column such as a name. Choosing a suggestion moves the map to
the feature and outlines it. Matching ignores case and accents, so
"cordoba" finds "Córdoba". Unlike
[`mapgl::add_geocoder_control()`](https://walker-data.com/mapgl/reference/add_geocoder_control.html),
which searches places around the world, this searches your data.

## Usage

``` r
add_feature_search(
  map,
  layer_id,
  search_column,
  detail_column = NULL,
  placeholder = NULL,
  max_results = 8,
  locale = "en-US",
  position = "top-right",
  width = 240,
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

  ID of the layer to search. Its source must be an `sf` object or inline
  GeoJSON added in R.

- search_column:

  Column to search, such as the feature names.

- detail_column:

  Optional column shown next to each suggestion to tell apart features
  with the same name, such as the province.

- placeholder:

  Text shown in the empty search box. `NULL` (the default) uses the
  `search_placeholder` label, "Search…".

- max_results:

  Maximum number of suggestions.

- locale:

  Locale used to sort the suggestions alphabetically.

- position:

  Corner for the search box: one of `"top-left"`, `"top-right"`,
  `"bottom-left"` or `"bottom-right"`.

- width:

  Width of the search box in pixels.

- highlight_color:

  Color of the outline drawn around the chosen feature.

- labels:

  Panel texts, as returned by
  [`context_labels()`](https://jmtocho.github.io/maplore/reference/context_labels.md).

## Value

The modified map object.

## Details

The search box works with the keyboard: arrow keys move through the
suggestions, Enter chooses one and Escape closes them.

## Examples

``` r
if (FALSE) { # \dontrun{
library(mapgl)

maplibre(center = c(-64, -38.5), zoom = 3.4) |>
  add_fill_layer(id = "deptos", source = ar_departments, fill_color = "#9ecae1") |>
  add_feature_search(
    layer_id = "deptos",
    search_column = "department",
    detail_column = "province"
  )
} # }
```
