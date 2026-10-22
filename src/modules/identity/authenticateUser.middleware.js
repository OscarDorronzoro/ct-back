import jwt from 'jsonwebtoken';

import { permissionsOf } from './permission.util';

export default function authenticateUser(req, res, next) {
  const token = req.cookies.auth_token;

  if (!token) {
    return res.sendStatus(401);
  }

  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET,
    );

    // Token from before the roles (it had a numeric role): 401 makes the client refresh it
    if (!Array.isArray(payload.roles)) {
      return res.sendStatus(401);
    }

    req.user = { ...payload, permissions: permissionsOf(payload.roles) };

    return next();
  } catch {
    return res.sendStatus(401);
  }
}
