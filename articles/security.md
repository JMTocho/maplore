# MapLibre, Mapbox, security and privacy

## MapLibre and Mapbox

All the examples use
[`maplibre()`](https://walker-data.com/mapgl/reference/maplibre.html)
with free basemaps, so they run without an account or token. Everything
also works with
[`mapboxgl()`](https://walker-data.com/mapgl/reference/mapboxgl.html):
create the map with your own Mapbox token as usual in mapgl. maplore
never reads or stores tokens.

## If you use Mapbox, your token is exposed

Any map made with
[`mapboxgl()`](https://walker-data.com/mapgl/reference/mapboxgl.html)
includes your Mapbox token in the HTML, with or without maplore: the
browser needs it to load the map, so anyone who opens the page can find
it. Mapbox designs public tokens for this, but someone could use yours
and spend your quota. To publish Mapbox maps:

- use a public token (`pk.…`), never a secret one (`sk.…`);
- create a separate token for published maps, because the default public
  token cannot be restricted, and restrict it to your site’s URLs in
  your Mapbox account;
- keep tokens in `.Renviron`, out of version control.

To avoid tokens altogether, use
[`maplibre()`](https://walker-data.com/mapgl/reference/maplibre.html)
with a free basemap. See Mapbox’s [guide on using Mapbox
securely](https://docs.mapbox.com/help/troubleshooting/how-to-use-mapbox-securely/).

## Your data travels inside the HTML

mapgl embeds the whole `sf` object in the page, with every column, even
the ones the map does not show. Anyone with the file can read them. With
sensitive data, keep only the columns you need before mapping, for
example with `dplyr::select(name, value)`.

## What maplore itself does

- It inserts every text (names, labels) as plain text, never as HTML, so
  data cannot inject code into the page.
- It makes no network requests and stores nothing in the browser.
- It has no JavaScript dependencies of its own.
