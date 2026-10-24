# Demo: five prefectures of Japan, from Hokkaido to Okinawa. Zoom into
# Tokyo and the share of people aged 65 and over is well below the others;
# move north to Akita and it is the highest.
library(mapgl)
library(maplore)

maplibre(style = carto_style("positron"), center = c(135, 35), zoom = 4) |>
  add_fill_layer(
    id = "prefectures",
    source = jp_prefectures,
    fill_color = interpolate(
      column = "aged_65",
      values = c(22, 30, 40),
      stops = c("#fee8c8", "#fdbb84", "#b30000")
    ),
    fill_opacity = 0.85
  ) |>
  add_view_summary(
    layer_id = "prefectures",
    column = "aged_65",
    label = "Aged 65 and over (2024)",
    name_column = "prefecture",
    weight = "pop_2024",
    weight_label = "population",
    unit = "prefectures",
    suffix = "%"
  ) |>
  add_context_tooltip(
    layer_id = "prefectures",
    column = "aged_65",
    name_column = "prefecture",
    label = "Aged 65 and over",
    weight = "pop_2024",
    unit = "prefectures",
    suffix = "%"
  )
