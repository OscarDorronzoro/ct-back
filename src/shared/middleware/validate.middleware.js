import logger from '../utils/logger';

// Optional fields left empty are parsed as undefined: drop them, as if they weren't sent
function withoutUndefined(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return data;
  }

  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
}

// Validates req.params, req.query and req.body with zod schemas.
// The parsed values (coerced, with defaults) go to req.validated: { params, query, body }.
// On failure: 400 { error: 'VALIDATION_ERROR', message, issues: [{ path, message }] }.
export default function validate(schemas) {
  return (req, res, next) => {
    const validated = {};
    const issues = [];

    Object.entries(schemas).forEach(([part, schema]) => {
      const result = schema.safeParse(req[part] ?? {});

      if (result.success) {
        validated[part] = withoutUndefined(result.data);
        return;
      }

      result.error.issues.forEach((issue) => {
        issues.push({
          path: [part, ...issue.path].join('.'),
          message: issue.message,
        });
      });
    });

    if (issues.length > 0) {
      // Helps debugging clients (gateway firmware, frontend) that send malformed requests
      logger.debug({
        message: 'Invalid request',
        method: req.method,
        url: req.originalUrl,
        issues,
      });

      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: issues.map((issue) => `${issue.path}: ${issue.message}`).join('; '),
        issues,
      });
    }

    req.validated = validated;
    return next();
  };
}
