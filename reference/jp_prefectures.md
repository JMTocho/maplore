# Five prefectures of Japan: a shrinking, ageing population

Five prefectures of Japan, from north to south (Hokkaido, Akita, Tokyo,
Kyoto and Okinawa), with their population in 2020 (census) and 2024
(official estimate), the change between both years and the share of
people aged 65 and over in 2024. Tokyo is the only one that grew; in
Akita almost 40% of people are 65 or older.

## Usage

``` r
jp_prefectures
```

## Format

An `sf` object with 5 rows and 7 columns:

- code:

  Official prefecture code (JIS X 0401).

- prefecture:

  Prefecture name.

- pop_2020:

  Population, 2020 census.

- pop_2024:

  Population, 2024 estimate, rounded to thousands.

- change:

  Population change 2020-2024, in percent.

- aged_65:

  Share of the population aged 65 and over in 2024, in percent.

- geometry:

  Prefecture boundaries (WGS 84).

## Source

- Population: Statistics Bureau of Japan, *Japan Statistical Yearbook
  2026*, tables 2-3 and 2-7,
  <https://www.stat.go.jp/english/data/nenkan/>. Created by editing
  those tables. Terms of use compatible with CC BY 4.0:
  <https://www.e-stat.go.jp/en/terms-of-use>.

- Boundaries: Natural Earth 1:10m Admin 1 states and provinces, public
  domain, <https://www.naturalearthdata.com/>.
