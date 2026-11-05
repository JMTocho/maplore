# A group of features to compare the view with

Defines a reference for the `references` argument of
[`add_view_summary()`](https://jmtocho.github.io/maplore/reference/add_view_summary.md):
the features of the layer whose `column` takes one of `values`, such as
all the departments of a province. Its value is computed with the same
statistic and weight as the panel.

## Usage

``` r
reference_group(column, values)
```

## Arguments

- column:

  Name of the column that defines the group.

- values:

  Values of `column` that belong to the group.

## Value

An object of class `maplore_reference_group`.

## Examples

``` r
reference_group("province", "Ciudad Autónoma de Buenos Aires")
#> <reference_group> province in Ciudad Autónoma de Buenos Aires
reference_group("region", c("Kanto", "Kansai"))
#> <reference_group> region in Kanto, Kansai
```
