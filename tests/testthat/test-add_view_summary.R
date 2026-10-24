skip_if_not_installed("mapgl")
skip_if_not_installed("sf")

deptos <- ar_departments[ar_departments$province == "La Pampa", ]

base_map <- function() {
  mapgl::maplibre() |>
    mapgl::add_fill_layer(id = "deptos", source = deptos, fill_color = "red")
}

test_that("stores settings and attaches the JS dependency and hook", {
  m <- base_map() |>
    add_view_summary("deptos", "growth", name_column = "department")

  s <- m$x$mapgl_context$view_summary$deptos
  expect_equal(s$layer_id, "deptos")
  expect_equal(s$column, "growth")
  expect_equal(s$label, "growth")
  expect_equal(s$name_column, "department")
  expect_equal(s$labels$title, "In this view")

  dep_names <- vapply(m$dependencies, function(d) d$name, character(1))
  expect_equal(sum(dep_names == "mapgl-context"), 1)
  dep <- m$dependencies[[which(dep_names == "mapgl-context")]]
  expect_true(file.exists(file.path(dep$src$file, "core.js")))
  expect_true(file.exists(file.path(dep$src$file, "context.css")))

  expect_length(m$jsHooks$render, 1)
  expect_match(m$jsHooks$render[[1]]$code, "MapglContext.init")
})

test_that("diff_suffix uses points for percentages, else the suffix", {
  m <- base_map()
  pct <- add_view_summary(m, "deptos", "growth", suffix = " %")
  expect_equal(pct$x$mapgl_context$view_summary$deptos$diff_suffix, " pts")

  pct_es <- add_view_summary(
    m, "deptos", "growth", suffix = "%", labels = view_summary_labels("es")
  )
  expect_equal(pct_es$x$mapgl_context$view_summary$deptos$diff_suffix, " p.p.")

  other <- add_view_summary(m, "deptos", "pop_2022", suffix = " hab.")
  expect_equal(other$x$mapgl_context$view_summary$deptos$diff_suffix, " hab.")

  custom <- add_view_summary(m, "deptos", "growth", suffix = "%", diff_suffix = "")
  expect_equal(custom$x$mapgl_context$view_summary$deptos$diff_suffix, "")
})

test_that("new display options have sensible defaults", {
  s <- (base_map() |> add_view_summary("deptos", "growth"))$x$mapgl_context$view_summary$deptos
  expect_equal(s$stat, "mean")
  expect_null(s$color)
  expect_equal(s$highlight_color, "#1f2328")
  expect_false(s$compact)
  expect_true(s$collapsible)
  expect_null(s$collapsed)
})

test_that("stat, compact and collapse options are stored", {
  m <- base_map() |>
    add_view_summary(
      "deptos", "pop_2022",
      stat = "sum", color = "darkorange", compact = TRUE,
      collapsible = FALSE, collapsed = TRUE
    )
  s <- m$x$mapgl_context$view_summary$deptos
  expect_equal(s$stat, "sum")
  expect_equal(s$color, "darkorange")
  expect_true(s$compact)
  expect_false(s$collapsible)
  expect_true(s$collapsed)

  expect_error(add_view_summary(base_map(), "deptos", "growth", stat = "mode"), "should be one of")
  expect_error(add_view_summary(base_map(), "deptos", "growth", compact = "yes"), "`compact`")
  expect_error(add_view_summary(base_map(), "deptos", "growth", collapsed = NA), "`collapsed`")
  expect_error(add_view_summary(base_map(), "deptos", "growth", color = 1), "`color`")
})

test_that("weight_label defaults to the weight column", {
  m <- base_map() |> add_view_summary("deptos", "growth", weight = "pop_2022")
  expect_equal(m$x$mapgl_context$view_summary$deptos$weight_label, "pop_2022")
})

test_that("works when the layer uses a separate source", {
  m <- mapgl::maplibre() |>
    mapgl::add_source(id = "src", data = deptos) |>
    mapgl::add_fill_layer(id = "deptos", source = "src", fill_color = "red") |>
    add_view_summary("deptos", "growth")
  expect_equal(m$x$mapgl_context$view_summary$deptos$column, "growth")
})

test_that("calling again for the same layer replaces it; other layers add up", {
  m <- base_map() |>
    mapgl::add_line_layer(id = "bordes", source = deptos, line_color = "black") |>
    add_view_summary("deptos", "growth", width = 200) |>
    add_view_summary("deptos", "growth", width = 300) |>
    add_view_summary("bordes", "pop_2022")

  expect_named(m$x$mapgl_context$view_summary, c("deptos", "bordes"))
  expect_equal(m$x$mapgl_context$view_summary$deptos$width, 300)
  expect_length(m$jsHooks$render, 1)
})

test_that("reports missing layers and columns", {
  m <- base_map()
  expect_error(add_view_summary(m, "nope", "growth"), "Layer \"nope\" not found")
  expect_error(add_view_summary(m, "deptos", "nope"), "Column `nope` not found")
  expect_error(
    add_view_summary(m, "deptos", "growth", weight = "nope"),
    "Column `nope` not found"
  )
})

test_that("rejects layers without inline data", {
  m <- mapgl::maplibre() |>
    mapgl::add_vector_source(id = "tiles", url = "https://example.com/tiles.json") |>
    mapgl::add_fill_layer(
      id = "deptos", source = "tiles", source_layer = "x", fill_color = "red"
    )
  expect_error(add_view_summary(m, "deptos", "growth"), "inline GeoJSON")
})

test_that("validates its arguments", {
  m <- base_map()
  expect_error(add_view_summary(list(), "deptos", "growth"), "must be created with")
  expect_error(add_view_summary(m, "deptos", "growth", position = "middle"), "should be one of")
  expect_error(add_view_summary(m, "deptos", "growth", bins = 1), "`bins`")
  expect_error(add_view_summary(m, "deptos", "growth", digits = -1), "`digits`")
  expect_error(add_view_summary(m, "deptos", c("a", "b")), "single string")
  expect_error(add_view_summary(m, "deptos", "growth", labels = list()), "context_labels")
  expect_error(
    add_view_summary(structure(list(), class = "maplibre_proxy"), "deptos", "growth"),
    "Shiny proxies"
  )
  expect_error(
    add_view_summary(mapgl::compare(m, m), "deptos", "growth"),
    "compare widgets"
  )
})

test_that("view_summary_labels() has presets and overrides", {
  en <- view_summary_labels()
  es <- view_summary_labels("es")
  expect_s3_class(en, "context_labels")
  expect_equal(en$title, "In this view")
  expect_equal(es$title, "En esta vista")
  expect_equal(names(en), names(es))

  expect_equal(es$median, "Mediana")
  expect_equal(es$collapse, "Minimizar")

  custom <- view_summary_labels("es", title = "Lo que ves")
  expect_equal(custom$title, "Lo que ves")
  expect_equal(custom$of, "de")

  expect_error(view_summary_labels(titel = "x"), "Unknown label")
  expect_error(view_summary_labels(title = 1), "single string")
  expect_output(print(es), "En esta vista")
})

test_that("works with point layers, clustered or not", {
  m <- mapgl::maplibre() |>
    mapgl::add_circle_layer(id = "earthquakes", source = earthquakes, circle_color = "red") |>
    add_view_summary("earthquakes", "depth", name_column = "place")
  expect_equal(m$x$mapgl_context$view_summary$earthquakes$column, "depth")

  clustered <- mapgl::maplibre() |>
    mapgl::add_circle_layer(
      id = "earthquakes", source = earthquakes, circle_color = "red",
      cluster_options = mapgl::cluster_options()
    ) |>
    add_view_summary("earthquakes", "depth")
  expect_equal(clustered$x$mapgl_context$view_summary$earthquakes$layer_id, "earthquakes")
})

test_that("earthquakes has the documented shape", {
  expect_s3_class(earthquakes, "sf")
  expect_equal(nrow(earthquakes), 2569)
  expect_named(
    earthquakes,
    c("id", "date", "magnitude", "depth", "place", "geometry")
  )
  expect_false(anyDuplicated(earthquakes$id) > 0)
  expect_true(all(sf::st_geometry_type(earthquakes) == "POINT"))
  expect_true(all(earthquakes$magnitude >= 4.5))
})

test_that("jp_prefectures has the documented shape and yearbook figures", {
  expect_s3_class(jp_prefectures, "sf")
  expect_equal(jp_prefectures$prefecture, c("Hokkaido", "Akita", "Tokyo", "Kyoto", "Okinawa"))
  expect_named(
    jp_prefectures,
    c("code", "prefecture", "pop_2020", "pop_2024", "change", "aged_65", "geometry")
  )
  expect_true(all(sf::st_is_valid(jp_prefectures)))
  # Figures from the yearbook tables.
  expect_equal(jp_prefectures$pop_2020[jp_prefectures$prefecture == "Tokyo"], 14047594)
  expect_equal(jp_prefectures$aged_65[jp_prefectures$prefecture == "Akita"], 39.5)
  expect_equal(sum(jp_prefectures$change > 0), 1)
})

test_that("ar_departments has the documented shape", {
  expect_s3_class(ar_departments, "sf")
  expect_equal(nrow(ar_departments), 528)
  expect_named(
    ar_departments,
    c("id", "department", "province", "pop_2022", "pop_2035", "growth", "geometry")
  )
  expect_false(anyDuplicated(ar_departments$id) > 0)
  expect_true(is.numeric(ar_departments$growth))
})
