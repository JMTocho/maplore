#' Texts for the context components
#'
#' Returns the texts used by [add_view_summary()], [add_view_ranking()],
#' [add_context_tooltip()] and [add_feature_search()]. Start from English or
#' Spanish and override any text through `...`.
#'
#' `view_summary_labels()` is the same function under its earlier name.
#'
#' @param lang Base language: `"en"` (English) or `"es"` (Spanish).
#' @param ... Texts to override, by name. Common: `of`, `above`, `below`,
#'   `same`, `points`, `empty`, `go_to`, `collapse`, `expand`. View summary:
#'   `title`, `whole_map`, `average`, `median`, `sum`, `overall`, `highest`,
#'   `lowest`, `share`, `view`, `all`. Ranking: `ranking_highest`,
#'   `ranking_lowest`, `in_view`, `rank_overall`. Context tooltip: `rank`,
#'   `higher_than`, `average_of_all`. Search: `search_placeholder`,
#'   `search_none`. Area: `area_zoom_in`.
#'
#' @return A list of class `context_labels`.
#' @export
#'
#' @examples
#' context_labels("es")
#' context_labels("en", title = "Visible now")
context_labels <- function(lang = c("en", "es"), ...) {
  lang <- match.arg(lang)
  texts <- switch(
    lang,
    en = list(
      title = "In this view",
      whole_map = "Whole map",
      of = "of",
      average = "Average",
      median = "Median",
      sum = "Total",
      overall = "overall",
      above = "above",
      below = "below",
      same = "same as",
      points = "pts",
      highest = "Highest",
      lowest = "Lowest",
      share = "of total",
      empty = "Nothing in view. Zoom out or move the map.",
      view = "In view",
      all = "All",
      go_to = "Show on the map",
      collapse = "Collapse",
      expand = "Expand",
      ranking_highest = "Highest in view",
      ranking_lowest = "Lowest in view",
      in_view = "in view",
      rank_overall = "overall rank",
      rank = "Rank",
      higher_than = "higher than",
      average_of_all = "the average",
      search_placeholder = "Search\u2026",
      search_none = "No matches",
      area_zoom_in = "Zoom in, or tilt the map less, to see the area in view"
    ),
    es = list(
      title = "En esta vista",
      whole_map = "Todo el mapa",
      of = "de",
      average = "Promedio",
      median = "Mediana",
      sum = "Total",
      overall = "total",
      above = "sobre el",
      below = "bajo el",
      same = "igual al",
      points = "p.p.",
      highest = "M\u00e1ximo",
      lowest = "M\u00ednimo",
      share = "del total",
      empty = "No hay nada en la vista. Alej\u00e1 el zoom o mov\u00e9 el mapa.",
      view = "En la vista",
      all = "Todos",
      go_to = "Ver en el mapa",
      collapse = "Minimizar",
      expand = "Expandir",
      ranking_highest = "M\u00e1s altos en la vista",
      ranking_lowest = "M\u00e1s bajos en la vista",
      in_view = "en la vista",
      rank_overall = "puesto en el total",
      rank = "Puesto",
      higher_than = "m\u00e1s alto que el",
      average_of_all = "promedio",
      search_placeholder = "Buscar\u2026",
      search_none = "Sin resultados",
      area_zoom_in = "Acerc\u00e1 el zoom, o inclin\u00e1 menos el mapa, para ver la superficie"
    )
  )

  overrides <- list(...)
  unknown <- setdiff(names(overrides), names(texts))
  if (length(unknown) > 0) {
    stop(
      sprintf("Unknown label(s): %s.", paste0("`", unknown, "`", collapse = ", ")),
      call. = FALSE
    )
  }
  for (name in names(overrides)) {
    check_string(overrides[[name]], name)
    texts[[name]] <- overrides[[name]]
  }

  structure(texts, class = "context_labels")
}

#' @rdname context_labels
#' @export
view_summary_labels <- context_labels

#' @export
print.context_labels <- function(x, ...) {
  cat("<context_labels>\n")
  for (name in names(x)) {
    cat(sprintf("  %-18s %s\n", name, x[[name]]))
  }
  invisible(x)
}
