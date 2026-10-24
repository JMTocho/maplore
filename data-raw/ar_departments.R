# Builds `ar_departments`: Argentine departments with projected population
# growth 2022-2035.
#
# Sources:
# - Geometries: Instituto Geográfico Nacional via the Georef service,
#   https://infra.datos.gob.ar/georef/departamentos.geojson (CC BY 4.0).
# - Population: INDEC, "Estimaciones de población por sexo, departamento y
#   año calendario 2022-2035",
#   https://www.indec.gob.ar/ftp/cuadros/poblacion/base_estimaciones_pob_deptos_2022_2035.csv
library(sf)
library(dplyr)

geo_url <- "https://infra.datos.gob.ar/georef/departamentos.geojson"
pop_url <- "https://www.indec.gob.ar/ftp/cuadros/poblacion/base_estimaciones_pob_deptos_2022_2035.csv"

geo_file <- tempfile(fileext = ".geojson")
pop_file <- tempfile(fileext = ".csv")
download.file(geo_url, geo_file, mode = "wb")
download.file(pop_url, pop_file, mode = "wb")

geo <- st_read(geo_file, quiet = TRUE)
# `provincia` comes as a JSON string such as {"id": "06", "nombre": "Buenos Aires", ...}
geo$provincia <- sub('.*"nombre": "([^"]+)".*', "\\1", geo$provincia)

pop <- read.csv2(
  pop_file,
  fileEncoding = "UTF-8-BOM",
  colClasses = c("Código.departamento" = "character")
) |>
  mutate(id = sprintf("%05d", as.integer(Código.departamento))) |>
  filter(Fecha %in% c(2022, 2035)) |>
  group_by(id, Fecha) |>
  summarise(pop = sum(Población), .groups = "drop") |>
  tidyr::pivot_wider(names_from = Fecha, values_from = pop, names_prefix = "pop_")

ar_departments <- geo |>
  inner_join(pop, by = "id") |>
  transmute(
    id,
    department = nombre,
    province = provincia,
    pop_2022,
    pop_2035,
    growth = round(100 * (pop_2035 / pop_2022 - 1), 2)
  ) |>
  arrange(id)

usethis::use_data(ar_departments, overwrite = TRUE, compress = "xz")
