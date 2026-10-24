# Adds a component's settings to the map. All components share one
# JavaScript dependency and one render hook, which reads
# x$mapgl_context[[type]][[key]]; both are added on first use. Adding a
# component again with the same type and key replaces it.
add_component <- function(map, type, key, config) {
  context <- map$x$mapgl_context
  if (is.null(context)) {
    map$dependencies <- c(map$dependencies, list(context_dependency()))
    map <- htmlwidgets::onRender(
      map,
      "function(el, x) { MapglContext.init(el, x); }"
    )
    context <- list()
  }
  if (is.null(context[[type]])) context[[type]] <- list()
  context[[type]][[key]] <- config
  map$x$mapgl_context <- context
  map
}

context_dependency <- function() {
  htmltools::htmlDependency(
    name = "mapgl-context",
    version = as.character(utils::packageVersion("maplore")),
    src = system.file("htmlwidgets", "context", package = "maplore"),
    # core.js first: the other scripts register themselves in it.
    script = c(
      "core.js", "viewsummary.js", "ranking.js", "tooltip.js",
      "search.js"
    ),
    stylesheet = "context.css"
  )
}

check_map <- function(map, fun) {
  if (inherits(map, c("mapboxgl_proxy", "maplibre_proxy"))) {
    stop(sprintf("`%s()` does not support Shiny proxies yet.", fun), call. = FALSE)
  }
  if (inherits(map, c("mapboxgl_compare", "maplibregl_compare"))) {
    stop(sprintf("`%s()` does not support compare widgets yet.", fun), call. = FALSE)
  }
  if (!inherits(map, c("maplibregl", "mapboxgl"))) {
    stop(
      "`map` must be created with `mapgl::maplibre()` or `mapgl::mapboxgl()`.",
      call. = FALSE
    )
  }
}

find_layer <- function(map, layer_id) {
  for (l in map$x$layers) {
    if (identical(l$id, layer_id)) return(l)
  }
  stop(sprintf("Layer \"%s\" not found in the map.", layer_id), call. = FALSE)
}

# Returns the inline GeoJSON text behind a layer.
layer_geojson <- function(map, layer_id) {
  source <- find_layer(map, layer_id)$source
  if (is.character(source)) {
    found <- NULL
    for (s in map$x$sources) {
      if (identical(s$id, source)) found <- s
    }
    source <- found
  }
  geojson <- if (is.list(source)) source$data else NULL
  if (!is.character(geojson) || !grepl("^\\s*\\{", geojson)) {
    stop(
      sprintf(
        "Layer \"%s\" must use an sf object or inline GeoJSON as its source.",
        layer_id
      ),
      call. = FALSE
    )
  }
  geojson
}

# Checks that the columns exist in the layer's data. A plain text search
# avoids parsing the GeoJSON, which would need a JSON parser as a dependency.
check_columns <- function(map, layer_id, columns) {
  geojson <- layer_geojson(map, layer_id)
  for (col in columns) {
    if (!grepl(paste0('"', col, '":'), geojson, fixed = TRUE)) {
      stop(
        sprintf("Column `%s` not found in the data of layer \"%s\".", col, layer_id),
        call. = FALSE
      )
    }
  }
  invisible(geojson)
}

# A difference between percentages is in percentage points.
resolve_diff_suffix <- function(diff_suffix, suffix, labels) {
  if (!is.null(diff_suffix)) {
    return(diff_suffix)
  }
  if (grepl("%", suffix, fixed = TRUE)) paste0(" ", labels$points) else suffix
}

check_labels <- function(labels) {
  if (!inherits(labels, "context_labels")) {
    stop("`labels` must be created with `context_labels()`.", call. = FALSE)
  }
}

check_position <- function(position) {
  match.arg(position, c("top-left", "top-right", "bottom-left", "bottom-right"))
}

check_string <- function(x, name, allow_null = FALSE) {
  if (allow_null && is.null(x)) {
    return(invisible())
  }
  if (!is.character(x) || length(x) != 1 || is.na(x)) {
    stop(sprintf("`%s` must be a single string.", name), call. = FALSE)
  }
}

check_flag <- function(x, name, allow_null = FALSE) {
  if (allow_null && is.null(x)) {
    return(invisible())
  }
  if (!is.logical(x) || length(x) != 1 || is.na(x)) {
    stop(sprintf("`%s` must be `TRUE` or `FALSE`.", name), call. = FALSE)
  }
}

check_number <- function(x, name, min = -Inf, max = Inf) {
  if (!is.numeric(x) || length(x) != 1 || is.na(x) || x < min || x > max) {
    stop(
      sprintf("`%s` must be a single number between %s and %s.", name, min, max),
      call. = FALSE
    )
  }
}
