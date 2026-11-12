#' Add notes about the whole map
#'
#' Adds a small "Notes" button that opens a panel with context about the map
#' and its data: where the data come from, what the figures do not include,
#' and a link to learn more. Unlike a tooltip, the notes are about the whole
#' map, not about one feature. They start collapsed, so they do not cover
#' the map, and open with a click.
#'
#' Texts are shown as plain text, never as HTML.
#'
#' @param map A map created with [mapgl::maplibre()] or [mapgl::mapboxgl()].
#' @param source Where the data come from, such as `"INDEC, 2022 census"`.
#' @param notes One or more notes about the map or its data, each shown as
#'   a bullet, such as what the figures do not include.
#' @param link Optional web address to learn more, starting with `http://`
#'   or `https://`. It opens in a new tab.
#' @param link_label Text of the link. `NULL` (the default) uses the
#'   `notes_link` label, "More information".
#' @param title Title of the panel. `NULL` (the default) uses the
#'   `notes_title` label, "Notes".
#' @param position Corner for the notes: one of `"bottom-left"` (the
#'   default), `"bottom-right"`, `"top-left"` or `"top-right"`.
#' @param width Width of the open panel in pixels.
#' @param collapsed If `TRUE` (the default), the notes start collapsed to a
#'   small button. `FALSE` shows them open.
#' @param fade `"moving"` fades the panel while the map is panned or zoomed.
#'   `"none"` (the default) keeps it always solid.
#' @param labels Panel texts, as returned by [context_labels()].
#'
#' @return The modified map object.
#' @export
#'
#' @examplesIf requireNamespace("mapgl", quietly = TRUE)
#' library(mapgl)
#'
#' maplibre(center = c(-64, -38.5), zoom = 3.4) |>
#'   add_fill_layer(id = "departments", source = ar_departments, fill_color = "#9ecae1") |>
#'   add_map_notes(
#'     source = "INDEC, population projections 2022-2035.",
#'     notes = c(
#'       "Growth is the total change between 2022 and 2035, not per year.",
#'       "Islas del Atlantico Sur (Islas Malvinas) has no estimates."
#'     ),
#'     link = "https://www.indec.gob.ar"
#'   )
add_map_notes <- function(
  map,
  source = NULL,
  notes = NULL,
  link = NULL,
  link_label = NULL,
  title = NULL,
  position = "bottom-left",
  width = 280,
  collapsed = TRUE,
  fade = c("none", "moving"),
  labels = context_labels()
) {
  check_map(map, "add_map_notes")
  check_string(source, "source", allow_null = TRUE)
  if (!is.null(notes) &&
      (!is.character(notes) || length(notes) == 0 || anyNA(notes) || any(!nzchar(notes)))) {
    stop("`notes` must be a character vector of non-empty notes.", call. = FALSE)
  }
  if (is.null(source) && is.null(notes)) {
    stop("Give at least a `source` or some `notes`.", call. = FALSE)
  }
  check_string(link, "link", allow_null = TRUE)
  if (!is.null(link) && !grepl("^https?://", link, ignore.case = TRUE)) {
    stop("`link` must start with `http://` or `https://`.", call. = FALSE)
  }
  check_string(link_label, "link_label", allow_null = TRUE)
  check_string(title, "title", allow_null = TRUE)
  position <- check_position(position)
  check_number(width, "width", min = 100)
  check_flag(collapsed, "collapsed")
  fade <- match.arg(fade)
  check_labels(labels)

  # One set of notes per map: adding them again replaces them.
  add_component(map, "map_notes", "notes", list(
    source = source,
    # A list keeps a single note as a JSON array.
    notes = if (is.null(notes)) NULL else as.list(notes),
    link = link,
    link_label = link_label,
    title = title,
    position = position,
    width = width,
    collapsible = TRUE,
    collapsed = collapsed,
    fade = fade,
    labels = unclass(labels)
  ))
}
