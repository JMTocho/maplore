# Datasets

maplore includes three small datasets to try the components with. All of
them are `sf` objects, ready to use as a mapgl source.

| Dataset | What | Geometry | Source |
|----|----|----|----|
| `ar_departments` | The 528 departments of Argentina, with population in 2022 and 2035 and the projected growth | Polygons | IGN, INDEC |
| `earthquakes` | The 2,569 earthquakes of magnitude 4.5 or more in southern South America, 2016-2025, with magnitude and depth | Points | USGS |
| `jp_prefectures` | Five prefectures of Japan, from Hokkaido to Okinawa, with population in 2020 and 2024 and the share of people aged 65 and over | Polygons | Statistics Bureau of Japan, Natural Earth |

## Stories in the data

- **Argentina** (`ar_departments`): the City of Buenos Aires is
  projected to lose 5% of its population between 2022 and 2035, while 23
  of the 24 surrounding *partidos* grow.
- **Earthquakes** (`earthquakes`): earthquakes get deeper from west to
  east, from about 56 km on the Chilean coast to about 200 km under
  Santiago del Estero, following the Nazca plate as it sinks under South
  America.
- **Japan** (`jp_prefectures`): a shrinking, ageing country. Of the five
  prefectures, only Tokyo grew between 2020 and 2024, and in Akita
  almost 40% of people are 65 or older.

## Sources and licenses

- `ar_departments`: boundaries from the Instituto Geográfico Nacional,
  via the Georef service of datos.gob.ar (CC BY 4.0); population from
  INDEC, *Estimaciones de población por sexo, departamento y año
  calendario 2022-2035*.
- `earthquakes`: U.S. Geological Survey Earthquake Catalog, public
  domain.
- `jp_prefectures`: population from the Statistics Bureau of Japan,
  *Japan Statistical Yearbook 2026*, tables 2-3 and 2-7, used under
  terms compatible with CC BY 4.0; boundaries from Natural Earth, public
  domain.

The scripts that download and prepare each dataset are in the
[`data-raw`](https://github.com/JMTocho/maplore/tree/main/data-raw)
folder of the repository. See each dataset’s help page, such as
[`?jp_prefectures`](https://jmtocho.github.io/maplore/reference/jp_prefectures.md),
for its columns.
