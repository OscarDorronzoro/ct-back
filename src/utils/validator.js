import ROLES from './roles';

function isPositiveInteger(value) {
  const number = Number(value);

  return Number.isInteger(number) && number > 0;
}

function parsePositiveInteger(value) {
  const number = Number(value);

  if (!Number.isInteger(number) || number <= 0) {
    return null;
  }

  return number;
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isInteger(value) {
  return Number.isInteger(Number(value));
}

function isPositiveIntegerArray(value) {
  return Array.isArray(value)
    && value.every((item) => isPositiveInteger(item));
}

function parseRole(value) {
  const role = Number(value);

  if (!Number.isInteger(role)) {
    return null;
  }

  if (!Object.values(ROLES).includes(role)) {
    return null;
  }

  return role;
}

function escapeLike(value) {
  return value.replace(/[\\%_]/g, '\\$&');
}

const validator = {
  isPositiveInteger,
  parsePositiveInteger,
  isNonEmptyString,
  isInteger,
  isPositiveIntegerArray,
  parseRole,
  escapeLike,
};

export default validator;
