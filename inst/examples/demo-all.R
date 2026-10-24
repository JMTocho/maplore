# Demo: all the context components on one map. Projected population growth
# 2022-2035 by Argentine department.
#
# - Top left: "in this view" summary.
# - Top right: search box and ranking of the highest values in view.
# - Hover over a department: context tooltip.
library(mapgl)
library(maplore)

colors <- interpolate(
  column = "growth",
  values = c(-10, 0, 10),
  stops = c("#b2182b", "#f7f7f7", "#2166ac")
)

maplibre(style = carto_style("positron"), center = c(-64, -38.5), zoom = 3.4) |>
  add_fill_layer(
    id = "departments",
    source = ar_departments,
    fill_color = colors,
    fill_opacity = 0.85
  ) |>
  add_line_layer(
    id = "borders",
    source = ar_departments,
    line_color = "white",
    line_width = 0.4
  ) |>
  add_view_summary(
    layer_id = "departments",
    column = "growth",
    label = "Population growth 2022-2035",
    name_column = "department",
    weight = "pop_2022",
    weight_label = "population",
    unit = "departments",
    suffix = "%"
  ) |>
  add_feature_search(
    layer_id = "departments",
    search_column = "department",
    detail_column = "province"
  ) |>
  add_view_ranking(
    layer_id = "departments",
    column = "growth",
    name_column = "department",
    label = "Population growth 2022-2035",
    unit = "departments",
    suffix = "%"
  ) |>
  add_context_tooltip(
    layer_id = "departments",
    column = "growth",
    name_column = "department",
    label = "Population growth",
    weight = "pop_2022",
    unit = "departments",
    suffix = "%"
  )
