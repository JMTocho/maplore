# Changelog

## maplore 0.0.0.9001

- [`add_view_summary()`](https://jmtocho.github.io/maplore/reference/add_view_summary.md)
  gains:
  - `style`: `"full"` (the default), `"compact"` or `"mini"`, a strip of
    three figures: the features in view, the statistic and the area of
    the view. `compact = TRUE` still works and means
    `style = "compact"`.
  - `show_area` and `area_unit`: the area of the Earth covered by the
    screen, in km² or mi².
  - `chart`: the chart at the bottom of the panel. `"histogram"` (the
    default), `"position"` (a bar of all values with the view and the
    whole map marked on it), `"strip"` (one dot per feature), `"split"`
    (two histograms, the view above all features) or `"none"`.
  - `references`: up to three other values to compare the view with,
    besides the whole map: fixed numbers, such as a target, or groups of
    features defined with the new
    [`reference_group()`](https://jmtocho.github.io/maplore/reference/reference_group.md),
    such as a province. Their values are computed in R with the panel’s
    statistic and weight.
- [`add_feature_search()`](https://jmtocho.github.io/maplore/reference/add_feature_search.md)
  gains `collapsed`: the search box starts folded into a button with a
  magnifying glass, which opens it, and folds back when it loses focus
  while empty. Useful on small maps, such as on phones.
- [`add_view_summary()`](https://jmtocho.github.io/maplore/reference/add_view_summary.md)
  and
  [`add_view_ranking()`](https://jmtocho.github.io/maplore/reference/add_view_ranking.md)
  gain `fade = "moving"`: the panels fade while the map is panned or
  zoomed, so the map shows through, and come back when it stops.
- New texts in
  [`context_labels()`](https://jmtocho.github.io/maplore/reference/context_labels.md):
  `area_zoom_in`, `ref_above`, `ref_below`, `ref_same` and
  `search_open`.
- maplore now imports jsonlite, which mapgl already uses, to read the
  layer’s data in R.

## maplore 0.0.0.9000

- First development version.
- [`add_view_summary()`](https://jmtocho.github.io/maplore/reference/add_view_summary.md):
  live summary of the features in view (count, mean, median or total,
  highest and lowest, histogram), compared with the whole map.
- [`add_view_ranking()`](https://jmtocho.github.io/maplore/reference/add_view_ranking.md):
  the features in view with the highest or lowest values.
- [`add_context_tooltip()`](https://jmtocho.github.io/maplore/reference/add_context_tooltip.md):
  a tooltip with each feature’s rank, the share of features below it and
  its difference with the average.
- [`add_feature_search()`](https://jmtocho.github.io/maplore/reference/add_feature_search.md):
  a search box over a column of the map’s own data, ignoring case and
  accents.
- [`context_labels()`](https://jmtocho.github.io/maplore/reference/context_labels.md):
  texts for all the components, in English or Spanish.
- Datasets: `ar_departments`, `earthquakes` and `jp_prefectures`.
