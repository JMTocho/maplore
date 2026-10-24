#' Add a search box over the layer's own features
#'
#' Adds a search box that suggests features of a layer as you type, matching
#' a column such as a name. Choosing a suggestion moves the map to the
#' feature and outlines it. Matching ignores case and accents, so "cordoba"
#' finds "Córdoba". Unlike [mapgl::add_geocoder_control()], which searches
#' places around the world, this searches your data.
#'
#' The search box works with the keyboard: arrow keys move through the
#' suggestions, Enter chooses one and Escape closes them.
#'
#' @inheritParams add_view_summary
#' @param layer_id ID of the layer to search. Its source must be an `sf`
#'   object or inline GeoJSON added in R.
#' @param search_column Column to search, such as the feature names.
#' @param detail_column Optional column shown next to each suggestion to tell
#'   apart features with the same name, such as the province.
#' @param placeholder Text shown in the empty search box. `NULL` (the
#'   default) uses the `search_placeholder` label, "Search…".
#' @param max_results Maximum number of suggestions.
#' @param locale Locale used to sort the suggestions alphabetically.
#' @param position Corner for the search box: one of `"top-left"`,
#'   `"top-right"`, `"bottom-left"` or `"bottom-right"`.
#' @param width Width of the search box in pixels.
#' @param highlight_color Color of the outline drawn around the chosen
#'   feature.
#'
#' @return The modified map object.
#' @export
#'
#' @examples
#' \dontrun{
#' library(mapgl)
#'
#' maplibre(center = c(-64, -38.5), zoom = 3.4) |>
#'   add_fill_layer(id = "deptos", source = ar_departments, fill_color = "#9ecae1") |>
#'   add_feature_search(
#'     layer_id = "deptos",
#'     search_column = "department",
#'     detail_column = "province"
#'   )
#' }
add_feature_search <- function(
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
) {
  check_map(map, "add_feature_search")
  check_string(layer_id, "layer_id")
  check_string(search_column, "search_column")
  check_string(detail_column, "detail_column", allow_null = TRUE)
  check_string(placeholder, "placeholder", allow_null = TRUE)
  check_number(max_results, "max_results", min = 1, max = 50)
  check_string(locale, "locale")
  check_number(width, "width", min = 100)
  check_string(highlight_color, "highlight_color")
  position <- check_position(position)
  check_labels(labels)
  check_columns(map, layer_id, c(search_column, detail_column))

  add_component(map, "feature_search", layer_id, list(
    layer_id = layer_id,
    search_column = search_column,
    detail_column = detail_column,
    placeholder = placeholder,
    max_results = max_results,
    locale = locale,
    position = position,
    width = width,
    highlight_color = highlight_color,
    labels = unclass(labels)
  ))
}
