## R CMD check results

0 errors | 0 warnings | 1 note

* This is a new release.

## Test environments

* local macOS (aarch64), R 4.5
* win-builder (devel and release)

## Notes for the reviewer

* 'mapgl' is in Suggests: every function adds a component to a map created
  with 'mapgl', so the examples run only when it is installed
  (`@examplesIf requireNamespace("mapgl")`).
* The JavaScript in `inst/htmlwidgets/context/` is the package's own code;
  it has no bundled third-party libraries.
* The datasets are small (under 1 MB in total) and their sources and
  licenses are documented in their help pages.
