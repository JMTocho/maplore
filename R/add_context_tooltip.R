#' Add a tooltip that puts each value in context
#'
#' Adds a tooltip to a layer that shows, on hover (or tap on touch screens),
#' a feature's value together with where it stands among all features: its
#' rank, the share of features with a lower value, the difference with the
#' average, and a small distribution strip with the feature marked.
#'
#' Use it instead of the layer's own `tooltip` argument: with both, two
#' tooltips are shown.
#'
#' @inheritParams add_view_summary
#' @param column Name of the numeric column to show.
#' @param name_column Optional column with feature names, shown as the
#'   tooltip's title.
#' @param weight Optional numeric column used to weight the average, for
#'   example population.
#' @param color Color for the feature's marker on the distribution strip.
#'   `NULL` (the default) uses the layer's own color scale when it is an
#'   `interpolate()` or `step_expr()` on `column`, and blue otherwise.
#' @param highlight If `TRUE`, outlines the feature under the pointer.
#' @param highlight_color Color of that outline.
#'
#' @return The modified map object.
#' @export
#'
#' @examples
#' \dontrun{
#' library(mapgl)
#'
#' maplibre(center = c(-64, -38.5), zoom = 3.4) |>
#'   add_fill_layer(
#'     id = "deptos",
#'     source = ar_departments,
#'     fill_color = interpolate(
#'       column = "growth",
#'       values = c(-10, 0, 10),
#'       stops = c("#b2182b", "#f7f7f7", "#2166ac")
#'     )
#'   ) |>
#'   add_context_tooltip(
#'     layer_id = "deptos",
#'     column = "growth",
#'     name_column = "department",
#'     label = "Population growth",
#'     unit = "departments",
#'     suffix = "%"
#'   )
#' }
add_context_tooltip <- function(
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
) {
  check_map(map, "add_context_tooltip")
  check_string(layer_id, "layer_id")
  check_string(column, "column")
  check_string(name_column, "name_column", allow_null = TRUE)
  check_string(label, "label")
  check_string(weight, "weight", allow_null = TRUE)
  check_string(unit, "unit")
  check_string(locale, "locale")
  check_string(prefix, "prefix")
  check_string(suffix, "suffix")
  check_string(diff_suffix, "diff_suffix", allow_null = TRUE)
  check_number(digits, "digits", min = 0, max = 20)
  check_string(color, "color", allow_null = TRUE)
  check_flag(highlight, "highlight")
  check_string(highlight_color, "highlight_color")
  check_labels(labels)
  check_columns(map, layer_id, c(column, name_column, weight))

  if (!is.null(find_layer(map, layer_id)$tooltip)) {
    warning(
      sprintf(
        "Layer \"%s\" already has a tooltip; both will be shown. Remove the layer's `tooltip` to show only the context tooltip.",
        layer_id
      ),
      call. = FALSE
    )
  }

  add_component(map, "context_tooltip", layer_id, list(
    layer_id = layer_id,
    column = column,
    name_column = name_column,
    label = label,
    weight = weight,
    unit = unit,
    locale = locale,
    digits = digits,
    prefix = prefix,
    suffix = suffix,
    diff_suffix = resolve_diff_suffix(diff_suffix, suffix, labels),
    color = color,
    highlight = highlight,
    highlight_color = highlight_color,
    labels = unclass(labels)
  ))
}
