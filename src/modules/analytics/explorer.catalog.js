import { sql } from 'drizzle-orm';

import { FARM_TIMEZONE } from './analytics.constants';

// Catalog of the explorer: what can be asked to the dw. A query only combines pieces of this file
// (the values the user picks go as parameters), so it can't read anything else nor change data.
// The facts are always aliased `f`; each dimension says which joins it needs.

const TZ = FARM_TIMEZONE;

// Joins by name. `date` is the local date of the row (the SQL of each dataset).
const JOINS = {
  cow: () => sql`LEFT JOIN dw.dim_cow c ON c.cow_id = f.cow_id`,
  category: () => sql`LEFT JOIN dw.dim_category k ON k.category_id = f.category_id`,
  zone: () => sql`LEFT JOIN dw.dim_zone z ON z.zone_id = f.zone_id`,
  collar: () => sql`LEFT JOIN dw.dim_collar col ON col.collar_id = f.collar_id`,
  weather: (date) => sql`LEFT JOIN dw.fact_daily_weather w ON w.date_key = ${date}`,
  // Groups the cow belonged to that day (a cow can be in several: the row counts in each)
  group: (date) => sql`
    LEFT JOIN cow_group_memberships gm ON gm.cow_id = f.cow_id
      AND gm.date_from <= ((${date} + time '12:00') AT TIME ZONE ${TZ})
      AND (gm.date_to IS NULL OR gm.date_to > ((${date} + time '12:00') AT TIME ZONE ${TZ}))
    LEFT JOIN groups g ON g.id = gm.group_id`,
};

const SEX = sql`CASE c.sex WHEN 'female' THEN 'Hembra' WHEN 'male' THEN 'Macho' ELSE 'Sin sexo' END`;
const WEEKDAYS = sql`(ARRAY['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'])`;

// Dimensions: value (grouping and filters) and label (what is shown); date is the dataset's date.
// A value is never null, so every group can be used as a filter (0 or a text for "none").
const DIMENSIONS = {
  day: {
    label: 'Día', kind: 'date', value: (d) => sql`to_char(${d}, 'YYYY-MM-DD')`,
  },
  week: {
    label: 'Semana',
    kind: 'date',
    value: (d) => sql`to_char(date_trunc('week', ${d}), 'YYYY-MM-DD')`,
  },
  month: {
    label: 'Mes', kind: 'date', value: (d) => sql`to_char(${d}, 'YYYY-MM')`,
  },
  weekday: {
    label: 'Día de la semana',
    value: (d) => sql`extract(isodow FROM ${d})::int`,
    text: (d) => sql`${WEEKDAYS}[extract(isodow FROM ${d})::int]`,
  },
  cow: {
    label: 'Vaca',
    joins: ['cow'],
    value: () => sql`coalesce(f.cow_id, 0)`,
    text: () => sql`coalesce(c.alias, c.ear_tag, 'Vaca ' || f.cow_id, 'Sin vaca')`,
  },
  sex: { label: 'Sexo', joins: ['cow'], value: () => SEX },
  breed: { label: 'Raza', joins: ['cow'], value: () => sql`coalesce(c.breed_name, 'Sin raza')` },
  category: {
    label: 'Categoría', joins: ['category'], value: () => sql`coalesce(k.name, 'Sin categoría')`,
  },
  group: { label: 'Rodeo', joins: ['group'], value: () => sql`coalesce(g.name, 'Sin rodeo')` },
  zone: {
    label: 'Zona',
    joins: ['zone'],
    value: () => sql`coalesce(f.zone_id, 0)`,
    text: () => sql`coalesce(z.name, 'Fuera de zonas')`,
  },
  zoneType: {
    label: 'Tipo de zona', joins: ['zone'], value: () => sql`coalesce(z.zone_type, 'Fuera de zonas')`,
  },
  collar: {
    label: 'Collar',
    joins: ['collar'],
    value: () => sql`f.collar_id`,
    text: () => sql`'Collar ' || coalesce(col.code, f.collar_id)`,
  },
  rain: {
    label: 'Lluvia del día',
    joins: ['weather'],
    value: () => sql`CASE WHEN w.precipitation_mm >= 1 THEN 'Con lluvia'
      WHEN w.precipitation_mm IS NULL THEN 'Sin dato' ELSE 'Sin lluvia' END`,
  },
  temperature: {
    label: 'Temperatura máxima',
    joins: ['weather'],
    value: () => sql`CASE WHEN w.temperature_max IS NULL THEN 'Sin dato'
      WHEN w.temperature_max < 15 THEN 'Menos de 15 °C' WHEN w.temperature_max < 25 THEN '15 a 25 °C'
      WHEN w.temperature_max < 30 THEN '25 a 30 °C' ELSE '30 °C o más' END`,
  },
  eventType: {
    label: 'Tipo de evento',
    value: () => sql`f.type`,
    text: () => sql`CASE f.type WHEN 'vaccination' THEN 'Vacunación' WHEN 'treatment' THEN 'Tratamiento'
      WHEN 'examination' THEN 'Revisación' WHEN 'weighing' THEN 'Pesaje'
      WHEN 'castration' THEN 'Castración' ELSE f.type END`,
  },
  product: {
    label: 'Producto',
    value: () => sql`coalesce(f.product_id, 0)`,
    text: () => sql`coalesce(f.product_name, 'Sin producto')`,
  },
};

const hourOf = (column) => ({
  label: 'Hora del día',
  value: () => sql`extract(hour FROM ${column} AT TIME ZONE ${TZ})::int`,
});

const dateDims = ['day', 'week', 'month', 'weekday'];
const cowDims = ['cow', 'sex', 'breed', 'group'];

// measure: { label, unit, expr }. Averages "per cow and day" are over the rows of the fact.
export const DATASETS = {
  activity: {
    label: 'Actividad diaria',
    description: 'Distancia recorrida y tiempo en movimiento o en descanso de cada vaca por día, sin el ruido del GPS.',
    permission: 'map:read',
    from: sql`dw.fact_daily_activity f`,
    date: sql`f.date_key`,
    measures: {
      // First: the default of the explorer. A total depends on how many days and cows fall in each
      // group (a half week looks like a drop); the average per cow and day doesn't.
      distancePerCowKm: { label: 'Distancia por vaca y día', unit: 'km', expr: sql`avg(f.distance_m) / 1000` },
      distanceKm: { label: 'Distancia total', unit: 'km', expr: sql`sum(f.distance_m) / 1000` },
      restingHours: { label: 'Descanso por vaca y día', unit: 'h', expr: sql`avg(f.resting_min) / 60` },
      movingHours: { label: 'Movimiento por vaca y día', unit: 'h', expr: sql`avg(f.moving_min) / 60` },
      cows: { label: 'Vacas', unit: null, expr: sql`count(DISTINCT f.cow_id)` },
      rawDistancePerCowKm: {
        label: 'Distancia sin filtrar por vaca y día', unit: 'km', expr: sql`avg(f.raw_distance_m) / 1000`,
      },
    },
    dimensions: [...dateDims, ...cowDims, 'category', 'rain', 'temperature'],
  },

  zoneVisits: {
    label: 'Uso de zonas',
    description: 'Tiempo que pasan las vacas en cada potrero, aguada o corral, y cuántas veces entran.',
    permission: 'map:read',
    from: sql`dw.fact_zone_visit f`,
    date: sql`(f.entered_at AT TIME ZONE ${TZ})::date`,
    measures: {
      hours: { label: 'Tiempo en la zona', unit: 'h', expr: sql`sum(f.duration_min) / 60` },
      visits: { label: 'Visitas', unit: null, expr: sql`count(*)` },
      visitMinutes: { label: 'Duración media de una visita', unit: 'min', expr: sql`avg(f.duration_min)` },
      cows: { label: 'Vacas', unit: null, expr: sql`count(DISTINCT f.cow_id)` },
    },
    dimensions: [...dateDims, 'zone', 'zoneType', ...cowDims, 'hourEntered', 'rain', 'temperature'],
    extraDimensions: { hourEntered: hourOf(sql`f.entered_at`) },
  },

  stops: {
    label: 'Descansos',
    description: 'Paradas de las vacas: dónde y cuánto descansan.',
    permission: 'map:read',
    from: sql`dw.fact_stop f`,
    date: sql`(f.started_at AT TIME ZONE ${TZ})::date`,
    measures: {
      hours: { label: 'Tiempo de descanso', unit: 'h', expr: sql`sum(f.duration_min) / 60` },
      stops: { label: 'Paradas', unit: null, expr: sql`count(*)` },
      stopMinutes: { label: 'Duración media de una parada', unit: 'min', expr: sql`avg(f.duration_min)` },
    },
    dimensions: [...dateDims, 'zone', 'zoneType', ...cowDims, 'hourStarted', 'rain', 'temperature'],
    extraDimensions: { hourStarted: hourOf(sql`f.started_at`) },
  },

  weather: {
    label: 'Clima',
    description: 'Temperatura, lluvia y viento de cada día en el campo.',
    permission: 'map:read',
    from: sql`dw.fact_daily_weather f`,
    date: sql`f.date_key`,
    measures: {
      temperatureMax: { label: 'Temperatura máxima media', unit: '°C', expr: sql`avg(f.temperature_max)` },
      temperatureMin: { label: 'Temperatura mínima media', unit: '°C', expr: sql`avg(f.temperature_min)` },
      precipitationMm: { label: 'Lluvia', unit: 'mm', expr: sql`sum(f.precipitation_mm)` },
      rainyDays: { label: 'Días con lluvia', unit: null, expr: sql`count(*) FILTER (WHERE f.precipitation_mm >= 1)` },
      windMaxKmh: { label: 'Viento máximo', unit: 'km/h', expr: sql`max(f.wind_max_kmh)` },
    },
    dimensions: dateDims,
  },

  health: {
    label: 'Sanidad',
    description: 'Vacunaciones, tratamientos, revisaciones, pesajes y castraciones (sin los anulados).',
    permission: 'health:read',
    from: sql`dw.fact_health_event f`,
    date: sql`f.date_key`,
    measures: {
      events: { label: 'Eventos', unit: null, expr: sql`count(*)` },
      cows: { label: 'Vacas', unit: null, expr: sql`count(DISTINCT f.cow_id)` },
      weightKg: { label: 'Peso medio', unit: 'kg', expr: sql`avg(f.weight_kg)` },
      bodyCondition: { label: 'Condición corporal media', unit: null, expr: sql`avg(f.body_condition)` },
      temperature: { label: 'Temperatura corporal media', unit: '°C', expr: sql`avg(f.temperature)` },
    },
    dimensions: [...dateDims, 'eventType', 'product', ...cowDims],
  },

  battery: {
    label: 'Batería de los collares',
    description: 'Voltaje de madrugada (en reposo y sin sol), carga estimada y balance diario del panel solar.',
    permission: 'collars:read',
    from: sql`dw.fact_battery_daily f`,
    date: sql`f.date_key`,
    measures: {
      percent: { label: 'Carga estimada media', unit: '%', expr: sql`avg(f.percent)` },
      percentMin: { label: 'Carga estimada mínima', unit: '%', expr: sql`min(f.percent)` },
      voltageDawn: { label: 'Voltaje de madrugada', unit: 'V', expr: sql`avg(f.voltage_dawn)` },
      balance: {
        label: 'Balance diario (madrugada contra la anterior)', unit: 'V', expr: sql`avg(f.voltage_dawn_change)`,
      },
      collars: { label: 'Collares', unit: null, expr: sql`count(DISTINCT f.collar_id)` },
    },
    dimensions: [...dateDims, 'collar', ...cowDims],
  },
};

// Dimension `id` of a dataset ({ label, kind, joins, value(date), text(date) }), or undefined
export function dimensionOf(dataset, id) {
  if (!dataset.dimensions.includes(id)) {
    return undefined;
  }

  return dataset.extraDimensions?.[id] ?? DIMENSIONS[id];
}

export const joinSql = (name, date) => JOINS[name](date);

// What a user can see of the catalog (for the explorer screen): datasets they have permission for
export function catalogFor(permissions) {
  return Object.entries(DATASETS)
    .filter(([, dataset]) => permissions.includes(dataset.permission))
    .map(([id, dataset]) => ({
      id,
      label: dataset.label,
      description: dataset.description,
      measures: Object.entries(dataset.measures)
        .map(([measureId, m]) => ({ id: measureId, label: m.label, unit: m.unit })),
      dimensions: dataset.dimensions.map((dimensionId) => {
        const d = dimensionOf(dataset, dimensionId);
        return { id: dimensionId, label: d.label, kind: d.kind ?? 'category' };
      }),
    }));
}
