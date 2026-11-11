skip_if_not_installed("mapgl")
skip_if_not_installed("sf")

deptos <- ar_departments[ar_departments$province == "La Pampa", ]

base_map <- function() {
  mapgl::maplibre() |>
    mapgl::add_fill_layer(id = "deptos", source = deptos, fill_color = "red")
}

context_of <- function(m) m$x$mapgl_context

test_that("all components share one dependency and one render hook", {
  m <- base_map() |>
    add_view_summary("deptos", "growth") |>
    add_view_ranking("deptos", "growth", "department") |>
    add_context_tooltip("deptos", "growth") |>
    add_feature_search("deptos", "department")

  dep_names <- vapply(m$dependencies, function(d) d$name, character(1))
  expect_equal(sum(dep_names == "mapgl-context"), 1)
  dep <- m$dependencies[[which(dep_names == "mapgl-context")]]
  for (f in c(dep$script, dep$stylesheet)) {
    expect_true(file.exists(file.path(dep$src$file, f)), info = f)
  }
  expect_equal(dep$script[1], "core.js")
  expect_length(m$jsHooks$render, 1)
  expect_named(
    context_of(m),
    c("view_summary", "view_ranking", "context_tooltip", "feature_search")
  )
})

test_that("add_view_ranking() stores its settings, one per layer and order", {
  m <- base_map() |>
    add_view_ranking("deptos", "growth", "department", n = 3) |>
    add_view_ranking("deptos", "growth", "department", order = "asc")
  r <- context_of(m)$view_ranking
  expect_named(r, c("deptos desc", "deptos asc"))
  expect_equal(r[["deptos desc"]]$n, 3)
  expect_equal(r[["deptos asc"]]$order, "asc")
  expect_equal(r[["deptos desc"]]$position, "top-right")
  expect_null(r[["deptos desc"]]$title)
})

test_that("fade is stored for the summary and the ranking", {
  m <- base_map() |>
    add_view_summary("deptos", "growth", fade = "moving") |>
    add_view_ranking("deptos", "growth", "department", fade = "moving")
  expect_equal(context_of(m)$view_summary$deptos$fade, "moving")
  expect_equal(context_of(m)$view_ranking[["deptos desc"]]$fade, "moving")
  expect_equal(context_of(base_map() |> add_view_summary("deptos", "growth"))$view_summary$deptos$fade, "none")
  expect_error(add_view_summary(base_map(), "deptos", "growth", fade = "glass"), "should be one of")
})

test_that("add_view_ranking() validates its arguments", {
  m <- base_map()
  expect_error(add_view_ranking(m, "deptos", "growth"), "name_column")
  expect_error(add_view_ranking(m, "deptos", "growth", "nope"), "Column `nope` not found")
  expect_error(add_view_ranking(m, "deptos", "growth", "department", n = 0), "`n`")
  expect_error(add_view_ranking(m, "deptos", "growth", "department", order = "up"), "should be one of")
})

test_that("add_context_tooltip() stores its settings", {
  m <- base_map() |>
    add_context_tooltip("deptos", "growth", name_column = "department", suffix = " %")
  t <- context_of(m)$context_tooltip$deptos
  expect_equal(t$column, "growth")
  expect_true(t$highlight)
  expect_equal(t$diff_suffix, " pts")
})

test_that("add_context_tooltip() warns when the layer already has a tooltip", {
  m <- mapgl::maplibre() |>
    mapgl::add_fill_layer(id = "deptos", source = deptos, fill_color = "red", tooltip = "department")
  expect_warning(add_context_tooltip(m, "deptos", "growth"), "already has a tooltip")
  expect_error(add_context_tooltip(base_map(), "deptos", "nope"), "Column `nope` not found")
})

test_that("add_feature_search() stores its settings", {
  m <- base_map() |>
    add_feature_search("deptos", "department", detail_column = "province", max_results = 5)
  s <- context_of(m)$feature_search$deptos
  expect_equal(s$search_column, "department")
  expect_equal(s$detail_column, "province")
  expect_equal(s$max_results, 5)
  expect_null(s$placeholder)
  expect_false(s$collapsed)

  folded <- base_map() |> add_feature_search("deptos", "department", collapsed = TRUE, width = 180)
  expect_true(context_of(folded)$feature_search$deptos$collapsed)
  expect_equal(context_of(folded)$feature_search$deptos$width, 180)
  expect_error(add_feature_search(base_map(), "deptos", "department", collapsed = NA), "`collapsed`")

  expect_error(add_feature_search(base_map(), "deptos", "nope"), "Column `nope` not found")
  expect_error(add_feature_search(base_map(), "deptos", "department", max_results = 0), "`max_results`")
})

test_that("add_map_notes() stores its settings and validates them", {
  m <- base_map() |>
    add_map_notes(source = "INDEC", notes = "Growth is the total change.", link = "https://www.indec.gob.ar")
  n <- context_of(m)$map_notes$notes
  expect_equal(n$source, "INDEC")
  expect_equal(n$notes, list("Growth is the total change."))
  expect_true(n$collapsed)
  expect_equal(n$position, "bottom-left")

  expect_error(add_map_notes(base_map()), "at least a `source`")
  expect_error(add_map_notes(base_map(), notes = c("a", NA)), "non-empty notes")
  expect_error(add_map_notes(base_map(), source = "x", link = "javascript:alert(1)"), "http")
  expect_error(add_map_notes(list(), source = "x"), "must be created with")
})

test_that("add_rank_morph() stores its settings and validates them", {
  m <- base_map() |>
    add_rank_morph("deptos", "growth", "department", suffix = " %", title = "Growth")
  r <- context_of(m)$rank_morph$deptos
  expect_equal(r$column, "growth")
  expect_equal(r$order, "desc")
  expect_equal(r$duration, 1.6)
  expect_equal(r$position, "top-right")
  expect_true(nzchar(r$labels$morph_sort))

  expect_error(add_rank_morph(base_map(), "deptos", "nope", "department"), "not found")
  expect_error(add_rank_morph(base_map(), "deptos", "growth", "department", duration = -1), "duration")
  many <- function(d) {
    mapgl::maplibre() |> mapgl::add_fill_layer(id = "d", source = d, fill_color = "red")
  }
  mid <- ar_departments[ar_departments$province %in% c("La Pampa", "Mendoza"), ]
  expect_warning(add_rank_morph(many(mid), "d", "growth", "department", n = 40), "up to 30")
  expect_message(
    m2 <- add_rank_morph(many(ar_departments), "d", "growth", "department"),
    "show the 30 highest"
  )
  expect_equal(context_of(m2)$rank_morph$d$n, 30L)
  expect_message(
    add_rank_morph(many(mid), "d", "growth", "department", order = "asc", n = 10),
    "show the 10 lowest"
  )
  expect_error(add_rank_morph(base_map(), "deptos", "growth", "department", n = 60), "n")
  expect_error(add_rank_morph(base_map(), "deptos", "growth", "department", n = 2.5), "whole")
  pts <- mapgl::maplibre() |>
    mapgl::add_circle_layer(id = "pts", source = earthquakes[1:5, ], circle_color = "red")
  expect_error(add_rank_morph(pts, "pts", "magnitude", "place"), "fill layer")
})

test_that("every function rejects Shiny proxies", {
  proxy <- structure(list(), class = "maplibre_proxy")
  expect_error(add_view_ranking(proxy, "deptos", "growth", "department"), "Shiny proxies")
  expect_error(add_context_tooltip(proxy, "deptos", "growth"), "Shiny proxies")
  expect_error(add_feature_search(proxy, "deptos", "department"), "Shiny proxies")
  expect_error(add_rank_morph(proxy, "deptos", "growth", "department"), "Shiny proxies")
})

test_that("context_labels() covers every component in both languages", {
  en <- context_labels()
  es <- context_labels("es")
  expect_equal(names(en), names(es))
  for (name in c("ranking_highest", "rank", "higher_than", "search_placeholder")) {
    expect_true(nzchar(en[[name]]), info = name)
    expect_true(nzchar(es[[name]]), info = name)
  }
  expect_identical(view_summary_labels("es"), es)
})
