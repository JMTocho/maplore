# Argentine departments with projected population growth

The 529 departments (*departamentos* and *partidos*) of Argentina with
their estimated population for 2022 and 2035 and the projected growth
between both years. Department and province names are in Spanish, as in
the official sources.

## Usage

``` r
ar_departments
```

## Format

An `sf` object with 529 rows and 7 columns:

- id:

  Five-digit INDEC department code.

- department:

  Department name.

- province:

  Province name.

- pop_2022:

  Estimated population, 2022.

- pop_2035:

  Projected population, 2035.

- growth:

  Projected population growth 2022-2035, in percent.

- geometry:

  Department boundaries (WGS 84).

## Source

- Geometries: Instituto Geográfico Nacional, via the Georef service of
  datos.gob.ar (CC BY 4.0),
  <https://infra.datos.gob.ar/georef/departamentos.geojson>.

- Population: INDEC, *Estimaciones de población por sexo, departamento y
  año calendario 2022-2035*,
  <https://www.indec.gob.ar/ftp/cuadros/poblacion/base_estimaciones_pob_deptos_2022_2035.csv>.

The "Islas del Atlántico Sur" department (Islas Malvinas, Georgias del
Sur, Sandwich del Sur and the surrounding islands), part of the province
of Tierra del Fuego, has no population estimates: its `pop_2022`,
`pop_2035` and `growth` are `NA`. maplore's components leave it out of
their figures. When coloring the map by one of these columns, give
`mapgl::interpolate()` or
[`mapgl::step_expr()`](https://walker-data.com/mapgl/reference/step_expr.html)
an `na_color`, such as `na_color = "#d9d9d9"`; otherwise the map draws
it in black.
