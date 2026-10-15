const VERSION_REGEX = /^\d+\.\d+\.\d+$/;

function isValid(version) {
  return typeof version === 'string' && VERSION_REGEX.test(version);
}

// 'v1.0' -> '1.0.0', '2' -> '2.0.0'. Returns null if it can't be normalized.
function normalize(version) {
  if (typeof version !== 'string') {
    return null;
  }

  const parts = version.trim().replace(/^v/i, '').split('.');

  if (parts.length > 3 || parts.some((part) => !/^\d+$/.test(part))) {
    return null;
  }

  while (parts.length < 3) {
    parts.push('0');
  }

  return parts.map(Number).join('.');
}

const firmwareVersion = { isValid, normalize };

export default firmwareVersion;
