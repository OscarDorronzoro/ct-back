// Days of the dw are days of the farm, whatever the time zone of the server
export const FARM_TIMEZONE = 'America/Argentina/Buenos_Aires';

const dayFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: FARM_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit',
});

// Date -> 'YYYY-MM-DD' of the farm
export const farmDateKey = (date) => dayFormat.format(date);
