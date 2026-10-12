import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Marker,
  Popup,
  CircleMarker,
  Tooltip,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import {
  Search,
  MapPin,
  TrainFront,
  Trophy,
  Info,
  RotateCcw,
  SlidersHorizontal,
  Navigation,
} from "lucide-react";

import {
  TORONTO_NEIGHBOURHOODS_GEOJSON,
  TRANSIT_HUBS,
  VENUES,
} from "./data";

/* -------------------------------------------------------
   MAP CONSTANTS
------------------------------------------------------- */

const TORONTO_CENTER = [43.69, -79.39];

const venueIcon = L.divIcon({
  className: "venue-icon-wrapper",
  html: `
    <div class="venue-pin">
      <div class="venue-pin-core"></div>
    </div>
  `,
  iconSize: [34, 42],
  iconAnchor: [17, 38],
});

/* -------------------------------------------------------
   GEO HELPERS
------------------------------------------------------- */

function haversineKm(a, b) {
  const R = 6371;

  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLon = ((b[1] - a[1]) * Math.PI) / 180;

  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;

  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(x));
}

function getNeighbourhoodCenter(feature) {
  const layer = L.geoJSON(feature);
  const center = layer.getBounds().getCenter();

  return [center.lat, center.lng];
}

/* -------------------------------------------------------
   ACCESSIBILITY MODEL
------------------------------------------------------- */

function scoreFeature(feature, venueCoords) {
  const center = getNeighbourhoodCenter(feature);

  const venueDistance = haversineKm(
    center,
    venueCoords
  );

  const nearestHub = TRANSIT_HUBS.reduce(
    (best, hub) => {
      const distance = haversineKm(
        center,
        hub.coords
      );

      if (!best || distance < best.distance) {
        return {
          ...hub,
          distance,
        };
      }

      return best;
    },
    null
  );

  /*
    Prototype accessibility model

    55% venue proximity
    45% major transit-hub proximity
  */

  const venueComponent =
    100 * Math.exp(-venueDistance / 8);

  const transitComponent =
    100 * Math.exp(-nearestHub.distance / 3.2);

  const score = Math.round(
    Math.max(
      0,
      Math.min(
        100,
        venueComponent * 0.55 +
          transitComponent * 0.45
      )
    )
  );

  return {
    ...feature,

    properties: {
      ...feature.properties,

      center,
      score,
      venueDistance,
      nearestHub,

      venueComponent: Math.round(
        venueComponent
      ),

      transitComponent: Math.round(
        transitComponent
      ),
    },
  };
}

/* -------------------------------------------------------
   SCORE COLOURS
------------------------------------------------------- */

function scoreFill(score) {
  if (score >= 80) return "#c8102e";
  if (score >= 65) return "#dc4c64";
  if (score >= 50) return "#e98b9b";
  if (score >= 35) return "#f2bdc6";

  return "#f8e4e8";
}

/* -------------------------------------------------------
   MAP CONTROLS
------------------------------------------------------- */

function MapFocus({ selectedNeighbourhood }) {
  const map = useMap();

  useEffect(() => {
    if (!selectedNeighbourhood) return;

    map.flyTo(
      selectedNeighbourhood.properties.center,
      13,
      {
        duration: 0.7,
      }
    );
  }, [selectedNeighbourhood, map]);

  return null;
}

function FitTorontoBounds({ geojson }) {
  const map = useMap();

  useEffect(() => {
    if (!geojson) return;

    const bounds =
      L.geoJSON(geojson).getBounds();

    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [35, 35],
      });
    }
  }, [geojson, map]);

  return null;
}

function ResetMapButton({ geojson }) {
  const map = useMap();

  function resetMap() {
    if (!geojson) {
      map.flyTo(
        TORONTO_CENTER,
        11,
        {
          duration: 0.7,
        }
      );

      return;
    }

    const bounds =
      L.geoJSON(geojson).getBounds();

    if (bounds.isValid()) {
      map.flyToBounds(bounds, {
        padding: [35, 35],
        duration: 0.7,
      });
    }
  }

  return (
    <button
      className="reset-map-button"
      onClick={resetMap}
      title="Reset Toronto view"
      aria-label="Reset Toronto view"
    >
      <RotateCcw size={16} />
    </button>
  );
}

/* -------------------------------------------------------
   APP
------------------------------------------------------- */

export default function App() {
  const [
    rawGeojson,
    setRawGeojson,
  ] = useState(null);

  const [
    venueName,
    setVenueName,
  ] = useState(
    "Scotiabank Arena"
  );

  const [
    minimumScore,
    setMinimumScore,
  ] = useState(0);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    selectedName,
    setSelectedName,
  ] = useState(null);

  const [
    showTransit,
    setShowTransit,
  ] = useState(true);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    loadError,
    setLoadError,
  ] = useState("");

  /* ---------------------------
     LOAD TORONTO DATA
  --------------------------- */

  useEffect(() => {
    fetch(
      TORONTO_NEIGHBOURHOODS_GEOJSON
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            "Toronto neighbourhood data could not be loaded."
          );
        }

        return response.json();
      })

      .then((data) => {
        setRawGeojson(data);
        setLoading(false);
      })

      .catch((error) => {
        setLoadError(
          error.message
        );

        setLoading(false);
      });
  }, []);

  const venue =
    VENUES[venueName];

  /* ---------------------------
     SCORE NEIGHBOURHOODS
  --------------------------- */

  const rankings = useMemo(() => {
    if (!rawGeojson) {
      return [];
    }

    return rawGeojson.features
      .map((feature) =>
        scoreFeature(
          feature,
          venue.coords
        )
      )

      .sort(
        (a, b) =>
          b.properties.score -
          a.properties.score
      );
  }, [
    rawGeojson,
    venueName,
  ]);

  /* ---------------------------
     MAP FILTER
  --------------------------- */

  const visibleGeojson =
    useMemo(() => {
      if (!rawGeojson) {
        return null;
      }

      return {
        ...rawGeojson,

        features:
          rankings.filter(
            (feature) =>
              feature.properties
                .score >=
              minimumScore
          ),
      };
    }, [
      rawGeojson,
      rankings,
      minimumScore,
    ]);

  /* ---------------------------
     SEARCH / LIST RESULTS
  --------------------------- */

  const filteredRankings =
    useMemo(() => {
      const query = search
        .trim()
        .toLowerCase();

      return rankings.filter(
        (feature) => {
          const passesScore =
            feature.properties
              .score >=
            minimumScore;

          const passesSearch =
            !query ||
            feature.properties.AREA_NAME
              .toLowerCase()
              .includes(query);

          return (
            passesScore &&
            passesSearch
          );
        }
      );
    }, [
      rankings,
      search,
      minimumScore,
    ]);

  const selectedNeighbourhood =
    useMemo(() => {
      return rankings.find(
        (feature) =>
          feature.properties
            .AREA_NAME ===
          selectedName
      );
    }, [
      rankings,
      selectedName,
    ]);

  const selectedRank =
    selectedNeighbourhood
      ? rankings.findIndex(
          (feature) =>
            feature.properties
              .AREA_NAME ===
            selectedNeighbourhood
              .properties.AREA_NAME
        ) + 1
      : null;

  const cityAverage =
    rankings.length
      ? Math.round(
          rankings.reduce(
            (sum, feature) =>
              sum +
              feature.properties
                .score,
            0
          ) /
            rankings.length
        )
      : 0;

  function selectNeighbourhood(feature) {
    setSelectedName(
      feature.properties.AREA_NAME
    );

    setSearch("");
  }

  /* ---------------------------
     MAP STYLE
  --------------------------- */

  function featureStyle(feature) {
    const selected =
      feature.properties
        .AREA_NAME ===
      selectedName;

    return {
      fillColor: scoreFill(
        feature.properties.score
      ),

      fillOpacity: selected
        ? 0.85
        : 0.58,

      weight: selected
        ? 3
        : 1,

      color: selected
        ? "#18181b"
        : "rgba(255,255,255,.92)",
    };
  }

  function onEachFeature(
    feature,
    layer
  ) {
    layer.on({
      click: () => {
        setSelectedName(
          feature.properties
            .AREA_NAME
        );
      },

      mouseover: (event) => {
        event.target.setStyle({
          weight: 2.5,
          color: "#18181b",
        });
      },

      mouseout: (event) => {
        event.target.setStyle(
          featureStyle(feature)
        );
      },
    });

    layer.bindTooltip(
      `
        <div class="map-tooltip">
          <strong>
            ${feature.properties.AREA_NAME}
          </strong>

          <span>
            Accessibility
            ${feature.properties.score}/100
          </span>
        </div>
      `,
      {
        sticky: true,
      }
    );
  }

  /* -------------------------------------------------------
     RENDER
  ------------------------------------------------------- */

  return (
    <div className="map-app">

      {/* ===================================================
          TOP BAR
      =================================================== */}

      <header className="app-header">
        <div className="app-brand">
          <div className="app-logo">
            TT
          </div>

          <div>
            <strong>
              Tipoff Transit
            </strong>

            <span>
              Toronto sports accessibility
            </span>
          </div>
        </div>

        {/* -------------------------------------------------
            SEARCH
        ------------------------------------------------- */}

        <div className="global-search">
          <Search size={17} />

          <input
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            onKeyDown={(event) => {
              if (
                event.key ===
                  "Enter" &&
                filteredRankings[0]
              ) {
                selectNeighbourhood(
                  filteredRankings[0]
                );
              }

              if (
                event.key ===
                "Escape"
              ) {
                setSearch("");
              }
            }}
            placeholder="Search Toronto neighbourhoods"
          />

          {search.trim() &&
            filteredRankings.length >
              0 && (
              <div className="search-results">
                {filteredRankings
                  .slice(0, 5)
                  .map((feature) => (
                    <button
                      key={
                        feature
                          .properties
                          .AREA_NAME
                      }
                      onClick={() =>
                        selectNeighbourhood(
                          feature
                        )
                      }
                    >
                      <Search
                        size={14}
                      />

                      <span>
                        <strong>
                          {
                            feature
                              .properties
                              .AREA_NAME
                          }
                        </strong>

                        <small>
                          Accessibility
                          score{" "}
                          {
                            feature
                              .properties
                              .score
                          }
                          /100
                        </small>
                      </span>
                    </button>
                  ))}
              </div>
            )}

          {search.trim() &&
            filteredRankings.length ===
              0 && (
              <div className="search-results">
                <div className="search-empty">
                  No matching
                  neighbourhoods
                </div>
              </div>
            )}
        </div>

        <div className="header-meta">
          <span className="project-status">
            V1
          </span>

          <span>
            Toronto, ON
          </span>
        </div>
      </header>

      {/* ===================================================
          WORKSPACE
      =================================================== */}

      <div className="workspace">

        {/* =================================================
            SIDEBAR
        ================================================= */}

        <aside className="sidebar">
          <div className="sidebar-scroll">

            {/* ---------------------------------------------
                VENUE
            --------------------------------------------- */}

            <section className="venue-section">
              <span className="section-label">
                Selected venue
              </span>

              <h1>
                {venue.label}
              </h1>

              <p>
                {venue.team}
              </p>

              <label className="field">
                <span>
                  Venue
                </span>

                <select
                  value={venueName}
                  onChange={(event) => {
                    setVenueName(
                      event.target.value
                    );

                    setSelectedName(
                      null
                    );

                    setSearch("");
                  }}
                >
                  {Object.keys(
                    VENUES
                  ).map(
                    (name) => (
                      <option
                        key={name}
                      >
                        {name}
                      </option>
                    )
                  )}
                </select>
              </label>
            </section>

            {/* ---------------------------------------------
                SUMMARY
            --------------------------------------------- */}

            <section className="summary-row">
              <div>
                <span>
                  Neighbourhoods
                </span>

                <strong>
                  {rankings.length}
                </strong>
              </div>

              <div>
                <span>
                  City average
                </span>

                <strong>
                  {cityAverage}
                </strong>
              </div>

              <div>
                <span>
                  Best score
                </span>

                <strong>
                  {rankings[0]
                    ?.properties
                    ?.score ??
                    "—"}
                </strong>
              </div>
            </section>

            {/* ---------------------------------------------
                FILTERS
            --------------------------------------------- */}

            <section className="sidebar-block">
              <div className="block-heading">
                <div>
                  <SlidersHorizontal
                    size={15}
                  />

                  <strong>
                    Map filters
                  </strong>
                </div>
              </div>

              <div className="filter-row">
                <button
                  className={
                    minimumScore ===
                    0
                      ? "filter-chip active"
                      : "filter-chip"
                  }
                  onClick={() =>
                    setMinimumScore(
                      0
                    )
                  }
                >
                  All
                </button>

                <button
                  className={
                    minimumScore ===
                    50
                      ? "filter-chip active"
                      : "filter-chip"
                  }
                  onClick={() =>
                    setMinimumScore(
                      50
                    )
                  }
                >
                  50+
                </button>

                <button
                  className={
                    minimumScore ===
                    65
                      ? "filter-chip active"
                      : "filter-chip"
                  }
                  onClick={() =>
                    setMinimumScore(
                      65
                    )
                  }
                >
                  65+
                </button>

                <button
                  className={
                    minimumScore ===
                    80
                      ? "filter-chip active"
                      : "filter-chip"
                  }
                  onClick={() =>
                    setMinimumScore(
                      80
                    )
                  }
                >
                  80+
                </button>
              </div>

              <label className="toggle-row">
                <span>
                  <TrainFront
                    size={15}
                  />

                  Major transit hubs
                </span>

                <input
                  type="checkbox"
                  checked={
                    showTransit
                  }
                  onChange={() =>
                    setShowTransit(
                      (current) =>
                        !current
                    )
                  }
                />
              </label>
            </section>

            {/* ---------------------------------------------
                RANKINGS
            --------------------------------------------- */}

            <section className="sidebar-block ranking-block">
              <div className="block-heading">
                <div>
                  <Trophy
                    size={15}
                  />

                  <strong>
                    Neighbourhoods
                  </strong>
                </div>

                <span>
                  {
                    filteredRankings.length
                  }{" "}
                  shown
                </span>
              </div>

              <div className="ranking-list">
                {filteredRankings
                  .slice(0, 10)
                  .map(
                    (feature) => {
                      const rank =
                        rankings.findIndex(
                          (item) =>
                            item
                              .properties
                              .AREA_NAME ===
                            feature
                              .properties
                              .AREA_NAME
                        ) + 1;

                      const isSelected =
                        selectedName ===
                        feature
                          .properties
                          .AREA_NAME;

                      return (
                        <button
                          key={
                            feature
                              .properties
                              .AREA_NAME
                          }
                          className={
                            isSelected
                              ? "ranking-item active"
                              : "ranking-item"
                          }
                          onClick={() =>
                            selectNeighbourhood(
                              feature
                            )
                          }
                        >
                          <span className="rank">
                            {String(
                              rank
                            ).padStart(
                              2,
                              "0"
                            )}
                          </span>

                          <span className="ranking-name">
                            {
                              feature
                                .properties
                                .AREA_NAME
                            }
                          </span>

                          <strong>
                            {
                              feature
                                .properties
                                .score
                            }
                          </strong>
                        </button>
                      );
                    }
                  )}
              </div>
            </section>

            {/* ---------------------------------------------
                SELECTED NEIGHBOURHOOD
            --------------------------------------------- */}

            {selectedNeighbourhood && (
              <section className="detail-panel">
                <div className="detail-header">
                  <div>
                    <span className="section-label">
                      Selected
                      neighbourhood
                    </span>

                    <h2>
                      {
                        selectedNeighbourhood
                          .properties
                          .AREA_NAME
                      }
                    </h2>

                    <span className="rank-line">
                      Ranked #
                      {selectedRank} of{" "}
                      {rankings.length}
                    </span>
                  </div>

                  <div className="detail-score">
                    <strong>
                      {
                        selectedNeighbourhood
                          .properties
                          .score
                      }
                    </strong>

                    <span>
                      /100
                    </span>
                  </div>
                </div>

                <div className="detail-stats">
                  <div>
                    <span>
                      <MapPin
                        size={14}
                      />

                      Venue distance
                    </span>

                    <strong>
                      {selectedNeighbourhood.properties.venueDistance.toFixed(
                        1
                      )}{" "}
                      km
                    </strong>
                  </div>

                  <div>
                    <span>
                      <TrainFront
                        size={14}
                      />

                      Nearest major hub
                    </span>

                    <strong>
                      {
                        selectedNeighbourhood
                          .properties
                          .nearestHub
                          .name
                      }
                    </strong>
                  </div>

                  <div>
                    <span>
                      <Navigation
                        size={14}
                      />

                      Hub distance
                    </span>

                    <strong>
                      {selectedNeighbourhood.properties.nearestHub.distance.toFixed(
                        1
                      )}{" "}
                      km
                    </strong>
                  </div>
                </div>

                {/* -----------------------------------------
                    SCORE BREAKDOWN
                ----------------------------------------- */}

                <div className="score-breakdown">
                  <span className="section-label">
                    Score breakdown
                  </span>

                  <div className="score-factor">
                    <div>
                      <span>
                        Venue proximity
                      </span>

                      <strong>
                        {
                          selectedNeighbourhood
                            .properties
                            .venueComponent
                        }
                      </strong>
                    </div>

                    <div className="factor-track">
                      <div
                        style={{
                          width: `${selectedNeighbourhood.properties.venueComponent}%`,
                        }}
                      />
                    </div>

                    <small>
                      55% of
                      accessibility
                      score
                    </small>
                  </div>

                  <div className="score-factor">
                    <div>
                      <span>
                        Transit proximity
                      </span>

                      <strong>
                        {
                          selectedNeighbourhood
                            .properties
                            .transitComponent
                        }
                      </strong>
                    </div>

                    <div className="factor-track">
                      <div
                        style={{
                          width: `${selectedNeighbourhood.properties.transitComponent}%`,
                        }}
                      />
                    </div>

                    <small>
                      45% of
                      accessibility
                      score
                    </small>
                  </div>
                </div>
              </section>
            )}

            {/* ---------------------------------------------
                METHODOLOGY
            --------------------------------------------- */}

            <details className="methodology-drawer">
              <summary>
                <span>
                  <Info
                    size={15}
                  />

                  How scoring works
                </span>
              </summary>

              <div className="methodology-content">
                <p>
                  Tipoff Transit uses a
                  simple exploratory
                  accessibility model
                  rather than live route
                  planning.
                </p>

                <div>
                  <strong>
                    55% venue proximity
                  </strong>

                  <span>
                    Distance from the
                    neighbourhood centre
                    to the selected
                    venue.
                  </span>
                </div>

                <div>
                  <strong>
                    45% transit
                    proximity
                  </strong>

                  <span>
                    Distance to the
                    nearest major
                    rapid-transit hub
                    included in the
                    prototype dataset.
                  </span>
                </div>

                <p className="method-note">
                  It does not yet model
                  TTC schedules,
                  transfers, service
                  frequency, walking
                  networks or live
                  travel time.
                </p>
              </div>
            </details>
          </div>

          <footer className="sidebar-footer">
            City of Toronto
            neighbourhood data ·
            OpenStreetMap
          </footer>
        </aside>

        {/* =================================================
            MAP
        ================================================= */}

        <main className="map-area">
          {loading && (
            <div className="map-status">
              Loading Toronto
              neighbourhoods…
            </div>
          )}

          {loadError && (
            <div className="map-status error">
              {loadError}
            </div>
          )}

          {!loading &&
            !loadError &&
            visibleGeojson && (
              <MapContainer
                center={
                  TORONTO_CENTER
                }
                zoom={11}
                className="map-canvas"
                scrollWheelZoom
              >
                <TileLayer
                  attribution="&copy; OpenStreetMap contributors"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  className="base-map-tiles"
                  opacity={0.78}
                />

                <GeoJSON
                  key={`${venueName}-${minimumScore}-${selectedName}`}
                  data={
                    visibleGeojson
                  }
                  style={
                    featureStyle
                  }
                  onEachFeature={
                    onEachFeature
                  }
                />

                <FitTorontoBounds
                  geojson={
                    rawGeojson
                  }
                />

                {showTransit &&
                  TRANSIT_HUBS.map(
                    (hub) => (
                      <CircleMarker
                        key={
                          hub.name
                        }
                        center={
                          hub.coords
                        }
                        radius={4}
                        pathOptions={{
                          color:
                            "#18181b",

                          fillColor:
                            "#ffffff",

                          fillOpacity:
                            1,

                          weight: 2,
                        }}
                      >
                        <Tooltip>
                          {hub.name}
                        </Tooltip>
                      </CircleMarker>
                    )
                  )}

                <Marker
                  position={
                    venue.coords
                  }
                  icon={
                    venueIcon
                  }
                >
                  <Popup>
                    <strong>
                      {
                        venue.label
                      }
                    </strong>

                    <br />

                    {venue.team}
                  </Popup>
                </Marker>

                <MapFocus
                  selectedNeighbourhood={
                    selectedNeighbourhood
                  }
                />

                <ResetMapButton
                  geojson={
                    rawGeojson
                  }
                />
              </MapContainer>
            )}

          {/* ----------------------------------------------
              LEGEND
          ---------------------------------------------- */}

          <div className="map-legend">
            <div className="legend-title">
              Accessibility score
            </div>

            <div className="legend-scale">
              <span>
                Lower
              </span>

              <div>
                <i />
                <i />
                <i />
                <i />
                <i />
              </div>

              <span>
                Higher
              </span>
            </div>
          </div>

          <div className="map-info-chip">
            <MapPin size={14} />

            <span>
              {venue.label}
            </span>
          </div>
        </main>
      </div>
    </div>
  );
}