# Builds `jp_prefectures`: five prefectures of Japan, from north to south,
# with population in 2020 and 2024 and the share of people aged 65 and over.
# Kept deliberately simple: the original boundaries, no simplification, and
# the five prefectures listed by hand.
#
# Sources:
# - Population: Statistics Bureau of Japan, Japan Statistical Yearbook 2026,
#   tables 2-3 (Population by Prefecture) and 2-7 (Population of Three Age
#   Groups by Prefecture). https://www.stat.go.jp/english/data/nenkan/
#   Terms of use compatible with CC BY 4.0:
#   https://www.e-stat.go.jp/en/terms-of-use
# - Boundaries: Natural Earth 1:10m Admin 1 states and provinces, public
#   domain.
library(sf)
library(dplyr)

# The five prefectures: official code, English name and the name used in
# the yearbook tables.
chosen <- data.frame(
  code = c(1, 5, 13, 26, 47),
  prefecture = c("Hokkaido", "Akita", "Tokyo", "Kyoto", "Okinawa"),
  yearbook_name = c("Hokkaido", "Akita-ken", "Tokyo-to", "Kyoto-fu", "Okinawa-ken")
)

yearbook <- "https://www.stat.go.jp/data/nenkan/75nenkan/zuhyou/"
pop_file <- tempfile(fileext = ".xlsx")
age_file <- tempfile(fileext = ".xlsx")
download.file(paste0(yearbook, "y750203000.xlsx"), pop_file, mode = "wb")
download.file(paste0(yearbook, "y750207000.xlsx"), age_file, mode = "wb")

geo_url <- paste0(
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/",
  "geojson/ne_10m_admin_1_states_provinces.geojson"
)
geo_file <- tempfile(fileext = ".geojson")
download.file(geo_url, geo_file, mode = "wb")

# Table 2-3, figures in thousands. Column 1 is the prefecture code and
# column 3 its name; the years are found by their header.
pop_raw <- readxl::read_excel(pop_file, col_names = FALSE, .name_repair = "minimal")
header <- unlist(pop_raw[5, ])
pop <- data.frame(
  yearbook_name = pop_raw[[3]],
  pop_2020 = suppressWarnings(as.numeric(pop_raw[[which(grepl("2020", header))[1]]])) * 1000,
  pop_2024 = suppressWarnings(as.numeric(pop_raw[[which(header == "Population 2024")]])) * 1000
)

# Table 2-7, figures in thousands. Column 2 is the name; columns 8 and 11
# are the 2024 total and the population aged 65 and over.
age_raw <- readxl::read_excel(age_file, col_names = FALSE, .name_repair = "minimal")
age <- data.frame(
  yearbook_name = age_raw[[2]],
  total_2024 = suppressWarnings(as.numeric(age_raw[[8]])),
  over_65_2024 = suppressWarnings(as.numeric(age_raw[[11]]))
)

geo <- st_read(geo_file, quiet = TRUE) |>
  filter(iso_3166_2 %in% sprintf("JP-%02d", chosen$code)) |>
  transmute(code = as.integer(sub("JP-", "", iso_3166_2)))

jp_prefectures <- geo |>
  inner_join(chosen, by = "code") |>
  inner_join(pop, by = "yearbook_name") |>
  inner_join(age, by = "yearbook_name") |>
  transmute(
    code,
    prefecture,
    pop_2020,
    pop_2024,
    change = round(100 * (pop_2024 / pop_2020 - 1), 2),
    aged_65 = round(100 * over_65_2024 / total_2024, 1)
  ) |>
  arrange(code)

# Checks against figures read by hand from the yearbook tables.
stopifnot(
  nrow(jp_prefectures) == 5,
  jp_prefectures$pop_2024[jp_prefectures$prefecture == "Tokyo"] == 14178000,
  jp_prefectures$aged_65[jp_prefectures$prefecture == "Akita"] == 39.5,
  all(st_is_valid(jp_prefectures))
)

usethis::use_data(jp_prefectures, overwrite = TRUE, compress = "xz")
