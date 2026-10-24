#' Argentine departments with projected population growth
#'
#' The 528 departments (*departamentos* and *partidos*) of Argentina with
#' their estimated population for 2022 and 2035 and the projected growth
#' between both years. Department and province names are in Spanish, as in
#' the official sources.
#'
#' @format An `sf` object with 528 rows and 7 columns:
#' \describe{
#'   \item{id}{Five-digit INDEC department code.}
#'   \item{department}{Department name.}
#'   \item{province}{Province name.}
#'   \item{pop_2022}{Estimated population, 2022.}
#'   \item{pop_2035}{Projected population, 2035.}
#'   \item{growth}{Projected population growth 2022-2035, in percent.}
#'   \item{geometry}{Department boundaries (WGS 84).}
#' }
#'
#' @source
#' - Geometries: Instituto Geográfico Nacional, via the Georef service of
#'   datos.gob.ar (CC BY 4.0),
#'   <https://infra.datos.gob.ar/georef/departamentos.geojson>.
#' - Population: INDEC, *Estimaciones de población por sexo, departamento y
#'   año calendario 2022-2035*,
#'   <https://www.indec.gob.ar/ftp/cuadros/poblacion/base_estimaciones_pob_deptos_2022_2035.csv>.
#'
#' The "Islas del Atlántico Sur" department is not included because it has
#' no population estimates.
"ar_departments"

#' Earthquakes in southern South America
#'
#' The 2,569 earthquakes of magnitude 4.5 or more recorded between 2016 and
#' 2025 in southern South America (latitudes 20°S to 56°S, longitudes 76°W
#' to 52°W). Earthquakes get deeper from west to east, following the Nazca
#' plate as it sinks under South America.
#'
#' @format An `sf` object with 2,569 points and 6 columns:
#' \describe{
#'   \item{id}{USGS event id.}
#'   \item{date}{Date (UTC).}
#'   \item{magnitude}{Magnitude.}
#'   \item{depth}{Depth in kilometres.}
#'   \item{place}{Description of the location, as given by the USGS.}
#'   \item{geometry}{Epicentre (WGS 84).}
#' }
#'
#' @source U.S. Geological Survey (USGS) Earthquake Catalog, public domain,
#'   <https://earthquake.usgs.gov/earthquakes/search/>.
"earthquakes"

#' Five prefectures of Japan: a shrinking, ageing population
#'
#' Five prefectures of Japan, from north to south (Hokkaido, Akita, Tokyo,
#' Kyoto and Okinawa), with their population in 2020 (census) and 2024
#' (official estimate), the change between both years and the share of
#' people aged 65 and over in 2024. Tokyo is the only one that grew; in
#' Akita almost 40% of people are 65 or older.
#'
#' @format An `sf` object with 5 rows and 7 columns:
#' \describe{
#'   \item{code}{Official prefecture code (JIS X 0401).}
#'   \item{prefecture}{Prefecture name.}
#'   \item{pop_2020}{Population, 2020 census.}
#'   \item{pop_2024}{Population, 2024 estimate, rounded to thousands.}
#'   \item{change}{Population change 2020-2024, in percent.}
#'   \item{aged_65}{Share of the population aged 65 and over in 2024, in
#'     percent.}
#'   \item{geometry}{Prefecture boundaries (WGS 84).}
#' }
#'
#' @source
#' - Population: Statistics Bureau of Japan, *Japan Statistical Yearbook
#'   2026*, tables 2-3 and 2-7, <https://www.stat.go.jp/english/data/nenkan/>.
#'   Created by editing those tables. Terms of use compatible with CC BY 4.0:
#'   <https://www.e-stat.go.jp/en/terms-of-use>.
#' - Boundaries: Natural Earth 1:10m Admin 1 states and provinces, public
#'   domain, <https://www.naturalearthdata.com/>.
"jp_prefectures"
