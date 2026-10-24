# Demo: projected population growth 2022-2035 by Argentine department.
# Zoom into a province and the panel compares it with the whole country.
library(mapgl)
library(maplore)

# Centered on mainland Argentina: the bounds of the whole dataset would
# include the Antártida Argentina department and frame the South Pole.
maplibre(style = carto_style("positron"), center = c(-64, -38.5), zoom = 3.4) |>
  add_fill_layer(
    id = "departments",
    source = ar_departments,
    fill_color = interpolate(
      column = "growth",
      values = c(-10, 0, 10),
      stops = c("#b2182b", "#f7f7f7", "#2166ac")
    ),
    fill_opacity = 0.85,
    tooltip = "department"
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
  )
