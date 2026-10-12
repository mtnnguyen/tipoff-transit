export const VENUES = {
  "Scotiabank Arena": {
    coords: [43.643466, -79.379099],
    label: "Scotiabank Arena",
    team: "Raptors / Maple Leafs",
  },
  "Rogers Centre": {
    coords: [43.641438, -79.389353],
    label: "Rogers Centre",
    team: "Blue Jays",
  },
  "BMO Field": {
    coords: [43.633224, -79.418588],
    label: "BMO Field",
    team: "Toronto FC / Argonauts",
  },
  "Coca-Cola Coliseum": {
    coords: [43.635602, -79.415195],
    label: "Coca-Cola Coliseum",
    team: "Marlies",
  },
};

// Deliberately small set of major rapid-transit hubs for the prototype.
// This is a heuristic, not a routing engine.
export const TRANSIT_HUBS = [
  { name: "Union", coords: [43.645195, -79.380600] },
  { name: "Exhibition", coords: [43.635633, -79.420154] },
  { name: "Bloor-Yonge", coords: [43.670973, -79.385468] },
  { name: "St George", coords: [43.668294, -79.399930] },
  { name: "Spadina", coords: [43.667310, -79.403650] },
  { name: "Eglinton", coords: [43.706518, -79.398752] },
  { name: "Davisville", coords: [43.697906, -79.397229] },
  { name: "St Clair", coords: [43.688096, -79.393714] },
  { name: "Queen", coords: [43.652403, -79.379138] },
  { name: "King", coords: [43.649169, -79.377907] },
  { name: "Dundas", coords: [43.656078, -79.380303] },
  { name: "College", coords: [43.661209, -79.383042] },
  { name: "Kipling", coords: [43.637125, -79.535241] },
  { name: "Kennedy", coords: [43.732257, -79.263741] },
  { name: "Finch", coords: [43.780687, -79.415645] },
  { name: "Sheppard-Yonge", coords: [43.761505, -79.410923] },
  { name: "Yorkdale", coords: [43.724797, -79.447468] },
  { name: "Downsview Park", coords: [43.753713, -79.478515] },
  { name: "Danforth GO", coords: [43.686442, -79.300340] },
  { name: "Bloor GO", coords: [43.658877, -79.450209] },
];

export const TORONTO_NEIGHBOURHOODS_GEOJSON =
  "https://gis.toronto.ca/arcgis/rest/services/cot_geospatial26/FeatureServer/9/query?where=1%3D1&outFields=AREA_NAME%2CAREA_SHORT_CODE&outSR=4326&f=geojson";
