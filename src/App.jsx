import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Marker,
  Popup,
  CircleMarker,
} from "react-leaflet";
import L from "leaflet";
import {
  Activity,
  MapPinned,
  Trophy,
  TrainFront,
  LocateFixed,
  Info,
} from "lucide-react";
import {
  TORONTO_NEIGHBOURHOODS_GEOJSON,
  TRANSIT_HUBS,
  VENUES,
} from "./data";

const venueIcon = L.divIcon({
  className: "venue-marker",
  html: '<div class="venue-marker-dot">🏟️</div>',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

function haversineKm(a, b) {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLon = ((b[1] - a[1]) * Math.PI) / 180;
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;

  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(x));
}

function polygonCentroid(feature) {
  const layer = L.geoJSON(feature);
  const center = layer.getBounds().getCenter();
  return [center.lat, center.lng];
}

function scoreFeature(feature, venueCoords) {
  const centroid = polygonCentroid(feature);
  const venueDistance = haversineKm(centroid, venueCoords);

  const nearestHub = TRANSIT_HUBS.reduce((best, hub) => {
    const distance = haversineKm(centroid, hub.coords);
    return !best || distance < best.distance ? { ...hub, distance } : best;
  }, null);

  // Prototype scoring:
  // 55% venue proximity, 45% rapid-transit hub proximity.
  // Soft exponential decay avoids every outer neighbourhood collapsing to zero.
  const venueComponent = 100 * Math.exp(-venueDistance / 8);
  const transitComponent = 100 * Math.exp(-nearestHub.distance / 3.2);

  const score = Math.round(
    Math.max(0, Math.min(100, venueComponent * 0.55 + transitComponent * 0.45))
  );

  return {
    ...feature,
    properties: {
      ...feature.properties,
      score,
      venueDistance,
      nearestHub,
      centroid,
    },
  };
}

function scoreClass(score) {
  if (score >= 80) return "elite";
  if (score >= 65) return "great";
  if (score >= 50) return "good";
  if (score >= 35) return "fair";
  return "low";
}

function scoreFill(score) {
  if (score >= 80) return "#ce1141";
  if (score >= 65) return "#d94b68";
  if (score >= 50) return "#e8899b";
  if (score >= 35) return "#f1bcc6";
  return "#f8e5ea";
}

export default function App() {
  const [rawGeojson, setRawGeojson] = useState(null);
  const [venueName, setVenueName] = useState("Scotiabank Arena");
  const [selected, setSelected] = useState(null);
  const [minimumScore, setMinimumScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    fetch(TORONTO_NEIGHBOURHOODS_GEOJSON)
      .then((r) => {
        if (!r.ok) throw new Error("Neighbourhood data could not be loaded.");
        return r.json();
      })
      .then((data) => {
        setRawGeojson(data);
        setLoading(false);
      })
      .catch((error) => {
        setLoadError(error.message);
        setLoading(false);
      });
  }, []);

  const venue = VENUES[venueName];

  const scored = useMemo(() => {
    if (!rawGeojson) return null;
    return {
      ...rawGeojson,
      features: rawGeojson.features
        .map((feature) => scoreFeature(feature, venue.coords))
        .filter((feature) => feature.properties.score >= minimumScore),
    };
  }, [rawGeojson, venueName, minimumScore]);

  const rankings = useMemo(() => {
    if (!rawGeojson) return [];
    return rawGeojson.features
      .map((feature) => scoreFeature(feature, venue.coords))
      .sort((a, b) => b.properties.score - a.properties.score);
  }, [rawGeojson, venueName]);

  const topFive = rankings.slice(0, 5);
  const cityAverage = rankings.length
    ? Math.round(
        rankings.reduce((sum, n) => sum + n.properties.score, 0) /
          rankings.length
      )
    : 0;

  function featureStyle(feature) {
    const score = feature.properties.score;
    return {
      fillColor: scoreFill(score),
      fillOpacity: 0.8,
      weight: selected?.properties?.AREA_NAME === feature.properties.AREA_NAME ? 3 : 1,
      color:
        selected?.properties?.AREA_NAME === feature.properties.AREA_NAME
          ? "#111111"
          : "rgba(255,255,255,0.8)",
    };
  }

  function onEachFeature(feature, layer) {
    layer.on({
      click: () => setSelected(feature),
      mouseover: (e) => {
        e.target.setStyle({ weight: 2.5, color: "#111111" });
      },
      mouseout: (e) => {
        e.target.setStyle(featureStyle(feature));
      },
    });

    layer.bindTooltip(
      `<strong>${feature.properties.AREA_NAME}</strong><br/>Score: ${feature.properties.score}/100`,
      { sticky: true }
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#">
          <span className="brand-mark">TT</span>
          <span>Tipoff Transit</span>
        </a>
        <div className="prototype-badge">Toronto prototype</div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <MapPinned size={15} />
              TORONTO / SPORTS ACCESS
            </div>
            <h1>
              Find your
              <span> game-day neighbourhood.</span>
            </h1>
            <p>
              Explore Toronto neighbourhoods based on venue proximity and
              rapid-transit access.
            </p>
          </div>

          <div className="hero-stat-card">
            <div className="mini-label">Top neighbourhood</div>
            <div className="hero-stat">
              {topFive[0]?.properties?.AREA_NAME || "Loading…"}
            </div>
            <div className="hero-stat-sub">
              {topFive[0]
                ? `${topFive[0].properties.score}/100 for ${venueName}`
                : "Calculating accessibility"}
            </div>
          </div>
        </section>

        <section className="controls">
          <label>
            <span>Venue</span>
            <select
              value={venueName}
              onChange={(e) => {
                setVenueName(e.target.value);
                setSelected(null);
              }}
            >
              {Object.keys(VENUES).map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </label>

          <label>
            <span>Minimum score</span>
            <select
              value={minimumScore}
              onChange={(e) => setMinimumScore(Number(e.target.value))}
            >
              <option value="0">Show all</option>
              <option value="50">50+</option>
              <option value="65">65+</option>
              <option value="80">80+</option>
            </select>
          </label>

          <div className="control-summary">
            <LocateFixed size={18} />
            <span>{venue.team}</span>
          </div>
        </section>

        <section className="dashboard-grid">
          <div className="map-card">
            {loading && <div className="status-screen">Loading Toronto neighbourhoods…</div>}
            {loadError && (
              <div className="status-screen error">
                {loadError}
                <small>Try refreshing the page.</small>
              </div>
            )}

            {!loading && !loadError && scored && (
              <MapContainer
                center={[43.69, -79.39]}
                zoom={11}
                className="map"
                scrollWheelZoom
              >
                <TileLayer
                  attribution='&copy; OpenStreetMap contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <GeoJSON
                  key={`${venueName}-${minimumScore}-${selected?.properties?.AREA_NAME || "none"}`}
                  data={scored}
                  style={featureStyle}
                  onEachFeature={onEachFeature}
                />

                {TRANSIT_HUBS.map((hub) => (
                  <CircleMarker
                    key={hub.name}
                    center={hub.coords}
                    radius={3}
                    pathOptions={{
                      color: "#111827",
                      fillColor: "#ffffff",
                      fillOpacity: 1,
                      weight: 1.5,
                    }}
                  >
                    <Popup>{hub.name}</Popup>
                  </CircleMarker>
                ))}

                <Marker position={venue.coords} icon={venueIcon}>
                  <Popup>
                    <strong>{venue.label}</strong>
                    <br />
                    {venue.team}
                  </Popup>
                </Marker>
              </MapContainer>
            )}

            <div className="map-legend">
              <span>Lower</span>
              <div className="legend-ramp">
                <i></i><i></i><i></i><i></i><i></i>
              </div>
              <span>Higher</span>
            </div>
          </div>

          <aside className="side-panel">
            <div className="metric-row">
              <div className="metric">
                <Activity size={18} />
                <div>
                  <span>City average</span>
                  <strong>{cityAverage}</strong>
                </div>
              </div>
              <div className="metric">
                <Trophy size={18} />
                <div>
                  <span>Best score</span>
                  <strong>{topFive[0]?.properties?.score ?? "—"}</strong>
                </div>
              </div>
            </div>

            <div className="panel-section">
              <div className="section-heading">
                <div>
                  <span className="mini-label">Ranking</span>
                  <h2>Top neighbourhoods</h2>
                </div>
                <span className="rank-count">Top 5</span>
              </div>

              <div className="ranking-list">
                {topFive.map((feature, index) => (
                  <button
                    key={feature.properties.AREA_NAME}
                    onClick={() => setSelected(feature)}
                    className={
                      selected?.properties?.AREA_NAME === feature.properties.AREA_NAME
                        ? "ranking-row active"
                        : "ranking-row"
                    }
                  >
                    <span className="rank-number">{index + 1}</span>
                    <span className="rank-name">{feature.properties.AREA_NAME}</span>
                    <span className={`score-pill ${scoreClass(feature.properties.score)}`}>
                      {feature.properties.score}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="panel-section detail-card">
              {selected ? (
                <>
                  <span className="mini-label">Selected neighbourhood</span>
                  <h2>{selected.properties.AREA_NAME}</h2>
                  <div className="big-score">{selected.properties.score}</div>
                  <div className="score-caption">Accessibility score / 100</div>

                  <div className="detail-grid">
                    <div>
                      <span>Venue distance</span>
                      <strong>{selected.properties.venueDistance.toFixed(1)} km</strong>
                    </div>
                    <div>
                      <span>Nearest hub</span>
                      <strong>{selected.properties.nearestHub.name}</strong>
                    </div>
                    <div>
                      <span>Hub distance</span>
                      <strong>
                        {selected.properties.nearestHub.distance.toFixed(1)} km
                      </strong>
                    </div>
                  </div>
                </>
              ) : (
                <div className="empty-state">
                  <MapPinned size={28} />
                  <h2>Pick a neighbourhood</h2>
                  <p>Click the map or a ranked neighbourhood to inspect its score.</p>
                </div>
              )}
            </div>
          </aside>
        </section>

        <section className="methodology">
          <div>
            <span className="mini-label">Methodology</span>
            <h2>A transparent prototype score.</h2>
          </div>
          <div className="method-cards">
            <article>
              <div className="method-icon"><MapPinned size={18} /></div>
              <h3>55% venue proximity</h3>
              <p>
                Distance from each neighbourhood's map centroid to the selected
                sports venue.
              </p>
            </article>
            <article>
              <div className="method-icon"><TrainFront size={18} /></div>
              <h3>45% transit proximity</h3>
              <p>
                Distance from the neighbourhood centroid to the nearest major
                rapid-transit hub in the prototype dataset.
              </p>
            </article>
            <article>
              <div className="method-icon"><Info size={18} /></div>
              <h3>Exploratory, not routing</h3>
              <p>
                The score is designed for exploration. It does not model live
                travel times, transfers, service frequency, or affordability.
              </p>
            </article>
          </div>
        </section>
      </main>

      <footer>
        <span>Tipoff Transit — Toronto sports accessibility explorer</span>
        <span>Built with React, Leaflet & City of Toronto Open Data</span>
      </footer>
    </div>
  );
}
