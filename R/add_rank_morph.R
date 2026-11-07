#' Turn the map into a ranking of shapes
#'
#' Adds a button that lifts every polygon of a layer out of the map and lines
#' them up in a grid, sorted by a column, all at the same size and with their
#' rank, name and value below. Another click sends them back to their place.
#' Shapes keep their form and colour, so readers see at a glance both where
#' each one is and how it ranks.
#'
#' While the shapes are out of the map, panning and zooming are paused, and
#' the grid scrolls with the mouse wheel or a finger when it is taller than
#' the map. On a globe the map turns flat during the animation and back to a
#' globe at the end. Features without a value in `column` are left out of
#' the grid. For small islands far from the main part of a feature (more
#' than about twice its size away), the grid shows the main part only.
#'
#' The animation is meant for a few shapes, such as the provinces of a
#' country: it works best with up to 30 features, gives a warning from 31
#' to 50, and an error above 50, where shapes become too small to
#' recognise. Readers who prefer reduced motion
#' (an operating system setting) see the result without the animation.
#'
#' @param map A map created with [mapgl::maplibre()] or [mapgl::mapboxgl()].
#' @param layer_id ID of a fill layer whose source is an sf object or inline
#'   GeoJSON.
#' @param column Numeric column to sort by.
#' @param name_column Column with the name shown under each shape.
#' @param order `"desc"` (the default) puts the highest value first, `"asc"`
#'   the lowest.
#' @param title Optional title shown above the grid while it is visible.
#' @param duration Length of the animation, in seconds.
#' @param locale,digits,prefix,suffix Number formatting for the values, as
#'   in [add_view_summary()].
#' @param position Corner for the button: one of `"top-right"` (the
#'   default), `"top-left"`, `"bottom-right"` or `"bottom-left"`.
#' @param labels Button texts, as returned by [context_labels()]
#'   (`morph_sort` and `morph_back`).
#'
#' @return The modified map object.
#' @export
#'
#' @examples
#' \dontrun{
#' library(mapgl)
#'
#' maplibre(center = c(137, 37), zoom = 4.2) |>
#'   add_fill_layer(
#'     id = "prefectures",
#'     source = jp_prefectures,
#'     fill_color = interpolate(
#'       column = "change",
#'       values = c(-7, 0, 1),
#'       stops = c("#b2182b", "#f7f7f7", "#2166ac")
#'     )
#'   ) |>
#'   add_rank_morph(
#'     layer_id = "prefectures",
#'     column = "change",
#'     name_column = "prefecture",
#'     suffix = " %",
#'     title = "Population change, 2020-2024"
#'   )
#' }
add_rank_morph <- function(
  map,
  layer_id,
  column,
  name_column,
  order = c("desc", "asc"),
  title = NULL,
  duration = 1.6,
  locale = "en-US",
  digits = 1,
  prefix = "",
  suffix = "",
  position = "top-right",
  labels = context_labels()
) {
  check_map(map, "add_rank_morph")
  check_string(layer_id, "layer_id")
  check_string(column, "column")
  check_string(name_column, "name_column")
  order <- match.arg(order)
  check_string(title, "title", allow_null = TRUE)
  check_number(duration, "duration", min = 0, max = 10)
  check_string(locale, "locale")
  check_number(digits, "digits", min = 0, max = 20)
  check_string(prefix, "prefix")
  check_string(suffix, "suffix")
  position <- check_position(position)
  check_labels(labels)

  layer <- find_layer(map, layer_id)
  if (!identical(layer$type, "fill")) {
    stop(
      sprintf("Layer \"%s\" must be a fill layer (polygons).", layer_id),
      call. = FALSE
    )
  }
  geojson <- check_columns(map, layer_id, c(column, name_column))
  n <- lengths(regmatches(geojson, gregexpr('"type":"Feature"', geojson, fixed = TRUE)))
  if (n > 50) {
    stop(
      sprintf(
        "Layer \"%s\" has %d features: `add_rank_morph()` works with up to 50, so each shape stays big enough to recognise. Filter or group the data first.",
        layer_id, n
      ),
      call. = FALSE
    )
  }
  if (n > 30) {
    warning(
      sprintf(
        "Layer \"%s\" has %d features: the shapes will be small. `add_rank_morph()` works best with up to 30.",
        layer_id, n
      ),
      call. = FALSE
    )
  }

  # One morph per layer: adding it again replaces it.
  add_component(map, "rank_morph", layer_id, list(
    layer_id = layer_id,
    column = column,
    name_column = name_column,
    order = order,
    title = title,
    duration = duration,
    locale = locale,
    digits = digits,
    prefix = prefix,
    suffix = suffix,
    position = position,
    labels = unclass(labels)
  ))
}
