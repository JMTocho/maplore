# Demo: depth of earthquakes in southern South America, 2016-2025.
# Earthquakes get deeper from west to east: zoom into the Chilean coast and
# then into Santiago del Estero and compare.
library(mapgl)
library(maplore)

maplibre(style = carto_style("positron"), center = c(-66, -33), zoom = 4) |>
  add_circle_layer(
    id = "earthquakes",
    source = earthquakes,
    circle_color = interpolate(
      column = "depth",
      values = c(0, 100, 300, 600),
      stops = c("#fde725", "#21918c", "#3b528b", "#440154")
    ),
    circle_radius = 4,
    circle_opacity = 0.8,
    circle_stroke_color = "white",
    circle_stroke_width = 0.5,
    tooltip = "place"
  ) |>
  add_view_summary(
    layer_id = "earthquakes",
    column = "depth",
    label = "Depth",
    name_column = "place",
    unit = "earthquakes",
    digits = 0,
    suffix = " km",
    labels = context_labels("en", highest = "Deepest", lowest = "Shallowest")
  )
