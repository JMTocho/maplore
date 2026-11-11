# Texts for the context components

Returns the texts used by
[`add_view_summary()`](https://jmtocho.github.io/maplore/reference/add_view_summary.md),
[`add_view_ranking()`](https://jmtocho.github.io/maplore/reference/add_view_ranking.md),
[`add_context_tooltip()`](https://jmtocho.github.io/maplore/reference/add_context_tooltip.md),
[`add_feature_search()`](https://jmtocho.github.io/maplore/reference/add_feature_search.md),
[`add_map_notes()`](https://jmtocho.github.io/maplore/reference/add_map_notes.md)
and
[`add_rank_morph()`](https://jmtocho.github.io/maplore/reference/add_rank_morph.md).
Start from English or Spanish and override any text through `...`.

## Usage

``` r
context_labels(lang = c("en", "es"), ...)

view_summary_labels(lang = c("en", "es"), ...)
```

## Arguments

- lang:

  Base language: `"en"` (English) or `"es"` (Spanish).

- ...:

  Texts to override, by name. Common: `of`, `above`, `below`, `same`,
  `points`, `empty`, `go_to`, `collapse`, `expand`. View summary:
  `title`, `whole_map`, `average`, `median`, `sum`, `overall`,
  `highest`, `lowest`, `share`, `view`, `all`. Ranking:
  `ranking_highest`, `ranking_lowest`, `in_view`, `rank_overall`.
  Context tooltip: `rank`, `higher_than`, `average_of_all`. Search:
  `search_placeholder`, `search_none`, `search_open`. Area:
  `area_zoom_in`. References: `ref_above`, `ref_below`, `ref_same`. Map
  notes: `notes_title`, `notes_source`, `notes_link`. Rank morph:
  `morph_sort`, `morph_back`, `morph_highest`, `morph_lowest` (`{n}` and
  `{total}` are replaced by the numbers).

## Value

A list of class `context_labels`.

## Details

`view_summary_labels()` is the same function under its earlier name.

## Examples

``` r
context_labels("es")
#> <context_labels>
#>   title              En esta vista
#>   whole_map          Todo el mapa
#>   of                 de
#>   average            Promedio
#>   median             Mediana
#>   sum                Total
#>   overall            total
#>   above              sobre el
#>   below              bajo el
#>   same               igual al
#>   points             p.p.
#>   highest            Máximo
#>   lowest             Mínimo
#>   share              del total
#>   empty              No hay nada en la vista. Alejá el zoom o mové el mapa.
#>   view               En la vista
#>   all                Todos
#>   go_to              Ver en el mapa
#>   collapse           Minimizar
#>   expand             Expandir
#>   ranking_highest    Más altos en la vista
#>   ranking_lowest     Más bajos en la vista
#>   in_view            en la vista
#>   rank_overall       puesto en el total
#>   rank               Puesto
#>   higher_than        más alto que el
#>   average_of_all     promedio
#>   search_placeholder Buscar…
#>   search_none        Sin resultados
#>   search_open        Buscar
#>   area_zoom_in       Acercá el zoom, o incliná menos el mapa, para ver la superficie
#>   ref_above          por encima de
#>   ref_below          por debajo de
#>   ref_same           igual a
#>   notes_title        Notas
#>   notes_source       Fuente
#>   notes_link         Más información
#>   morph_sort         Ordenar ↕
#>   morph_back         Volver al mapa
#>   morph_highest      Los {n} más altos de {total}
#>   morph_lowest       Los {n} más bajos de {total}
context_labels("en", title = "Visible now")
#> <context_labels>
#>   title              Visible now
#>   whole_map          Whole map
#>   of                 of
#>   average            Average
#>   median             Median
#>   sum                Total
#>   overall            overall
#>   above              above
#>   below              below
#>   same               same as
#>   points             pts
#>   highest            Highest
#>   lowest             Lowest
#>   share              of total
#>   empty              Nothing in view. Zoom out or move the map.
#>   view               In view
#>   all                All
#>   go_to              Show on the map
#>   collapse           Collapse
#>   expand             Expand
#>   ranking_highest    Highest in view
#>   ranking_lowest     Lowest in view
#>   in_view            in view
#>   rank_overall       overall rank
#>   rank               Rank
#>   higher_than        higher than
#>   average_of_all     the average
#>   search_placeholder Search…
#>   search_none        No matches
#>   search_open        Search
#>   area_zoom_in       Zoom in, or tilt the map less, to see the area in view
#>   ref_above          above
#>   ref_below          below
#>   ref_same           same as
#>   notes_title        Notes
#>   notes_source       Source
#>   notes_link         More information
#>   morph_sort         Sort ↕
#>   morph_back         Back to the map
#>   morph_highest      The {n} highest of {total}
#>   morph_lowest       The {n} lowest of {total}
```
