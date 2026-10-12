# Tipoff Transit

**A Toronto sports accessibility explorer.**

Tipoff Transit is a small geospatial web app that ranks Toronto neighbourhoods by how convenient they may be for attending games at major sports venues.

The current prototype supports:

- Scotiabank Arena
- Rogers Centre
- BMO Field
- Coca-Cola Coliseum
- all 158 City of Toronto neighbourhoods
- interactive choropleth scoring
- top-five neighbourhood rankings
- venue distance and nearest major rapid-transit hub
- score filtering

## Why I built it

Toronto has multiple major sports venues concentrated around the downtown core, but fans live across the city. I wanted to explore a simple question:

> If getting to games mattered to you, which Toronto neighbourhoods would be the most convenient places to live?

The project combines my interests in sports, geospatial analysis, and interactive data visualization.

## How the score works

The current accessibility score is an exploratory heuristic:

- **65% venue proximity** — distance from a neighbourhood centroid to the selected venue.
- **35% rapid-transit proximity** — distance from the centroid to the nearest major transit hub included in the prototype.

Both components use a distance-decay function so closer neighbourhoods receive higher scores.

This is **not** a route planner and should not be interpreted as a formal transportation accessibility model. The current version does not account for:

- actual TTC travel times
- transfers
- service frequency
- congestion
- walking network distance
- GO/TTC schedules
- housing cost

Those are natural directions for a more advanced version.

## Data

Neighbourhood geometry is loaded from the **City of Toronto Neighbourhood feature service**.

Basemap tiles are provided by **OpenStreetMap**.

The transit-hub list is a deliberately small prototype dataset stored locally in `src/data.js`.

## Tech stack

- React
- Vite
- React Leaflet
- Leaflet
- City of Toronto Open Data / ArcGIS Feature Service
- OpenStreetMap

## Run locally

```bash
npm install
npm run dev
```

Then open the local Vite URL shown in your terminal.

## Build

```bash
npm run build
```

## Next steps

Ideas for a stronger V2:

1. Replace heuristic hub proximity with TTC/GO GTFS routing.
2. Calculate realistic public-transit travel times.
3. Add neighbourhood rent or home-price data.
4. Compare game-day accessibility across venues.
5. Add a "best neighbourhood for your teams" weighted score.
6. Add time-of-day and weekend service scenarios.

## Project status

Prototype / exploratory project.
