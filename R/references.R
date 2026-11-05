#' A group of features to compare the view with
#'
#' Defines a reference for the `references` argument of [add_view_summary()]:
#' the features of the layer whose `column` takes one of `values`, such as
#' all the departments of a province. Its value is computed with the same
#' statistic and weight as the panel.
#'
#' @param column Name of the column that defines the group.
#' @param values Values of `column` that belong to the group.
#'
#' @return An object of class `maplore_reference_group`.
#' @export
#'
#' @examples
#' reference_group("province", "Ciudad Autónoma de Buenos Aires")
#' reference_group("region", c("Kanto", "Kansai"))
reference_group <- function(column, values) {
  check_string(column, "column")
  if (!is.atomic(values) || length(values) == 0 || anyNA(values)) {
    stop("`values` must be a vector of one or more values, without `NA`.", call. = FALSE)
  }
  structure(list(column = column, values = values), class = "maplore_reference_group")
}

#' @export
print.maplore_reference_group <- function(x, ...) {
  cat("<reference_group> ", x$column, " in ", paste(x$values, collapse = ", "), "\n", sep = "")
  invisible(x)
}

# Validates `references` and computes each one's value with the panel's
# statistic and weight. Returns a list of list(label, value) for the browser.
resolve_references <- function(references, map, layer_id, column, stat, weight) {
  if (is.null(references)) {
    return(NULL)
  }
  if (!is.list(references) || inherits(references, "maplore_reference_group")) {
    stop(
      "`references` must be a named list, such as `list(\"Target\" = 2)`.",
      call. = FALSE
    )
  }
  if (length(references) == 0) {
    return(NULL)
  }
  if (length(references) > 3) {
    stop("`references` can have at most 3 references.", call. = FALSE)
  }
  labels <- names(references)
  if (is.null(labels) || anyNA(labels) || any(!nzchar(labels)) || anyDuplicated(labels)) {
    stop("Every reference needs a different, non-empty name.", call. = FALSE)
  }

  props <- NULL
  out <- vector("list", length(references))
  for (i in seq_along(references)) {
    ref <- references[[i]]
    if (inherits(ref, "maplore_reference_group")) {
      if (is.null(props)) props <- layer_properties(map, layer_id)
      value <- group_value(props, ref, column, stat, weight, labels[i])
    } else if (is.numeric(ref) && length(ref) == 1 && is.finite(ref)) {
      value <- ref
    } else {
      stop(
        sprintf(
          "Reference \"%s\" must be a single number or a `reference_group()`.",
          labels[i]
        ),
        call. = FALSE
      )
    }
    out[[i]] <- list(label = labels[i], value = value)
  }
  out
}

# The layer's feature properties as a data frame.
layer_properties <- function(map, layer_id) {
  geojson <- jsonlite::fromJSON(layer_geojson(map, layer_id), simplifyVector = TRUE)
  props <- geojson$features$properties
  if (!is.data.frame(props)) {
    stop(sprintf("Layer \"%s\" has no feature properties.", layer_id), call. = FALSE)
  }
  props
}

group_value <- function(props, ref, column, stat, weight, label) {
  if (!ref$column %in% names(props)) {
    stop(
      sprintf("Column `%s` of reference \"%s\" is not in the layer's data.", ref$column, label),
      call. = FALSE
    )
  }
  in_group <- props[[ref$column]] %in% ref$values
  values <- suppressWarnings(as.numeric(props[[column]][in_group]))
  weights <- if (is.null(weight)) {
    rep(1, length(values))
  } else {
    suppressWarnings(as.numeric(props[[weight]][in_group]))
  }
  keep <- is.finite(values)
  values <- values[keep]
  weights <- weights[keep]
  weights[!is.finite(weights) | weights < 0] <- 0
  if (length(values) == 0) {
    stop(
      sprintf("Reference \"%s\" matches no features with a value in `%s`.", label, column),
      call. = FALSE
    )
  }
  switch(
    stat,
    sum = sum(values),
    mean = if (sum(weights) > 0) sum(weights * values) / sum(weights) else mean(values),
    median = weighted_median(values, if (sum(weights) > 0) weights else rep(1, length(values)))
  )
}

# Same rule as the browser: the value where the cumulative weight reaches
# half of the total, averaging two values when it lands exactly on half.
weighted_median <- function(values, weights) {
  o <- order(values)
  values <- values[o]
  cum <- cumsum(weights[o])
  half <- sum(weights) / 2
  i <- which(cum >= half)[1]
  if (isTRUE(all.equal(cum[i], half)) && i < length(values)) {
    (values[i] + values[i + 1]) / 2
  } else {
    values[i]
  }
}
