# Builds `earthquakes`: earthquakes of magnitude 4.5 or more in southern
# South America, 2016-2025.
#
# Source: U.S. Geological Survey (USGS) Earthquake Catalog, public domain,
# https://earthquake.usgs.gov/fdsnws/event/1/
library(sf)

url <- paste0(
  "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson",
  "&starttime=2016-01-01&endtime=2025-12-31",
  "&minlatitude=-56&maxlatitude=-20&minlongitude=-76&maxlongitude=-52",
  "&minmagnitude=4.5&orderby=time-asc"
)
file <- tempfile(fileext = ".geojson")
download.file(url, file, mode = "wb")

raw <- st_read(file, quiet = TRUE)
coords <- st_coordinates(raw)

earthquakes <- st_sf(
  id = paste0(raw$net, raw$code),
  date = as.Date(as.POSIXct(raw$time / 1000, origin = "1970-01-01", tz = "UTC")),
  magnitude = raw$mag,
  depth = round(coords[, "Z"], 1),
  place = raw$place,
  # Drop the depth coordinate: mapgl draws 2D points.
  geometry = st_sfc(lapply(seq_len(nrow(coords)), function(i) {
    st_point(coords[i, c("X", "Y")])
  }), crs = 4326)
)
earthquakes <- earthquakes[order(earthquakes$date), ]
rownames(earthquakes) <- NULL

usethis::use_data(earthquakes, overwrite = TRUE, compress = "xz")
