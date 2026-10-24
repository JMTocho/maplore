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

  expect_error(add_feature_search(base_map(), "deptos", "nope"), "Column `nope` not found")
  expect_error(add_feature_search(base_map(), "deptos", "department", max_results = 0), "`max_results`")
})

test_that("every function rejects Shiny proxies", {
  proxy <- structure(list(), class = "maplibre_proxy")
  expect_error(add_view_ranking(proxy, "deptos", "growth", "department"), "Shiny proxies")
  expect_error(add_context_tooltip(proxy, "deptos", "growth"), "Shiny proxies")
  expect_error(add_feature_search(proxy, "deptos", "department"), "Shiny proxies")
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
