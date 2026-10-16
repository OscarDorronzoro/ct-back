import jwt from 'jsonwebtoken';

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

    req.user = payload;

    return next();
  } catch {
    return res.sendStatus(401);
  }
}
