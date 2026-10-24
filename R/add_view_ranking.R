#' Add a ranking of the features in view
#'
#' Adds a panel listing the features in view with the highest (or lowest)
#' values, updated as the map is panned and zoomed. Each entry shows the
#' value, a bar on the scale of the whole layer and the feature's rank among
#' all features; clicking on a name moves the map to it.
#'
#' Which features count as "in view" follows the same rules as
#' [add_view_summary()].
#'
#' @inheritParams add_view_summary
#' @param column Name of the numeric column to rank by.
#' @param name_column Column with the feature names to list.
#' @param n Number of features to list.
#' @param order `"desc"` (the default) lists the highest values first;
#'   `"asc"`, the lowest.
#' @param title Title of the panel. `NULL` (the default) uses the
#'   `ranking_highest` or `ranking_lowest` label.
#' @param color Color for the bars. `NULL` (the default) uses the layer's own
#'   color scale when it is an `interpolate()` or `step_expr()` on `column`,
#'   and blue otherwise.
#' @param highlight_color Color of the outline drawn around a feature when
#'   hovering over its name.
#' @param collapsible If `TRUE`, adds a button to collapse the panel down to
#'   its title and the first name.
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
#'   add_view_ranking(
#'     layer_id = "deptos",
#'     column = "growth",
#'     name_column = "department",
#'     label = "Population growth 2022-2035",
#'     unit = "departments",
#'     suffix = "%"
#'   )
#' }
add_view_ranking <- function(
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
) {
  check_map(map, "add_view_ranking")
  check_string(layer_id, "layer_id")
  check_string(column, "column")
  check_string(name_column, "name_column")
  check_string(label, "label")
  check_number(n, "n", min = 1, max = 50)
  order <- match.arg(order)
  check_string(title, "title", allow_null = TRUE)
  check_string(unit, "unit")
  check_string(locale, "locale")
  check_string(prefix, "prefix")
  check_string(suffix, "suffix")
  check_number(digits, "digits", min = 0, max = 20)
  check_number(width, "width", min = 100)
  check_string(color, "color", allow_null = TRUE)
  check_string(highlight_color, "highlight_color")
  check_flag(collapsible, "collapsible")
  check_flag(collapsed, "collapsed", allow_null = TRUE)
  position <- check_position(position)
  check_labels(labels)
  check_columns(map, layer_id, c(column, name_column))

  # One ranking per layer and order, so a map can list both ends.
  add_component(map, "view_ranking", paste(layer_id, order), list(
    layer_id = layer_id,
    column = column,
    name_column = name_column,
    label = label,
    n = n,
    order = order,
    title = title,
    unit = unit,
    locale = locale,
    digits = digits,
    prefix = prefix,
    suffix = suffix,
    position = position,
    width = width,
    color = color,
    highlight_color = highlight_color,
    collapsible = collapsible,
    collapsed = collapsed,
    labels = unclass(labels)
  ))
}
