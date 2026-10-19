import { dateRangeQuery, startOfToday } from '../../shared/validation/common';

// Default: today so far
const weatherListQuery = dateRangeQuery(startOfToday);

export default weatherListQuery;
