// Types of animal event (animal_events.type). Each one has its detail table.
// Reproductive events and transfers will be more types of the same base table.
export const EVENT_TYPES = Object.freeze({
  VACCINATION: 'vaccination',
  TREATMENT: 'treatment',
  EXAMINATION: 'examination',
  WEIGHING: 'weighing',
});

export const PRODUCT_TYPES = Object.freeze({
  VACCINE: 'vaccine',
  DRUG: 'drug',
  ANTIPARASITIC: 'antiparasitic',
});

// Products each event type can use
export const PRODUCT_TYPES_BY_EVENT = Object.freeze({
  [EVENT_TYPES.VACCINATION]: [PRODUCT_TYPES.VACCINE],
  [EVENT_TYPES.TREATMENT]: [PRODUCT_TYPES.DRUG, PRODUCT_TYPES.ANTIPARASITIC],
});

// Route of administration
export const ROUTES = Object.freeze([
  'subcutaneous', 'intramuscular', 'intravenous', 'oral', 'topical', 'intramammary', 'intranasal',
]);
