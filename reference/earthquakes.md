# Earthquakes in southern South America

The 2,569 earthquakes of magnitude 4.5 or more recorded between 2016 and
2025 in southern South America (latitudes 20°S to 56°S, longitudes 76°W
to 52°W). Earthquakes get deeper from west to east, following the Nazca
plate as it sinks under South America.

## Usage

``` r
earthquakes
```

## Format

An `sf` object with 2,569 points and 6 columns:

- id:

  USGS event id.

- date:

  Date (UTC).

- magnitude:

  Magnitude.

- depth:

  Depth in kilometres.

- place:

  Description of the location, as given by the USGS.

- geometry:

  Epicentre (WGS 84).

## Source

U.S. Geological Survey (USGS) Earthquake Catalog, public domain,
<https://earthquake.usgs.gov/earthquakes/search/>.
