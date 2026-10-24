import { z } from 'zod';

import { NDVI_EVALSCRIPT } from './ndvi.util';

// Copernicus Data Space Ecosystem: Sentinel Hub Statistical API, with an OAuth client of the
// account (COPERNICUS_CLIENT_ID / COPERNICUS_CLIENT_SECRET in the environment)
const TOKEN_URL = 'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token';
const STATISTICS_URL = 'https://sh.dataspace.copernicus.eu/api/v1/statistics';
const REQUEST_TIMEOUT_MS = 60 * 1000;
// Renew the token this long before it expires
const TOKEN_MARGIN_MS = 60 * 1000;

let token = null;

export function isConfigured() {
  const { COPERNICUS_CLIENT_ID, COPERNICUS_CLIENT_SECRET } = process.env;
  return Boolean(COPERNICUS_CLIENT_ID && COPERNICUS_CLIENT_SECRET);
}

// Tokens are reused until they are about to expire (asking for one per request is rate limited)
async function accessToken() {
  if (token && token.expiresAt - TOKEN_MARGIN_MS > Date.now()) {
    return token.value;
  }

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.COPERNICUS_CLIENT_ID,
      client_secret: process.env.COPERNICUS_CLIENT_SECRET,
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Copernicus token request failed: ${response.status}`);
  }

  const data = z.object({ access_token: z.string(), expires_in: z.number() })
    .parse(await response.json());
  token = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return token.value;
}

const stats = z.object({
  min: z.union([z.number(), z.string()]).optional(),
  max: z.union([z.number(), z.string()]).optional(),
  mean: z.union([z.number(), z.string()]).optional(),
  stDev: z.union([z.number(), z.string()]).optional(),
  sampleCount: z.number(),
  noDataCount: z.number().optional(),
});

const responseSchema = z.object({
  data: z.array(z.object({
    interval: z.object({ from: z.string(), to: z.string() }),
    outputs: z.object({
      ndvi: z.object({ bands: z.object({ B0: z.object({ stats }) }) }).optional(),
    }).optional(),
  })),
});

// Daily NDVI statistics of a polygon (GeoJSON in the projected CRS `epsg`, for 10 m pixels)
// between from and to: the Statistical API intervals
async function fetchNdviStatistics({
  geometry, epsg, from, to,
}) {
  const body = {
    input: {
      bounds: {
        geometry,
        properties: { crs: `http://www.opengis.net/def/crs/EPSG/0/${epsg}` },
      },
      data: [{ type: 'sentinel-2-l2a', dataFilter: { mosaickingOrder: 'leastCC' } }],
    },
    aggregation: {
      timeRange: { from: from.toISOString(), to: to.toISOString() },
      aggregationInterval: { of: 'P1D' },
      lastIntervalBehavior: 'SHORTEN',
      evalscript: NDVI_EVALSCRIPT,
      resx: 10,
      resy: 10,
    },
  };

  const response = await fetch(STATISTICS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${await accessToken()}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Copernicus statistics failed: ${response.status} ${await response.text()}`);
  }

  return responseSchema.parse(await response.json()).data;
}

export default { fetchNdviStatistics };
