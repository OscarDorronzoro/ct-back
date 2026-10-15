import authService from '../services/authService';
import requestInfo from '../utils/requestInfo';
import { refreshTokenCookie } from '../validators/authValidator';

const ACCESS_TOKEN_COOKIE = 'auth_token';
const REFRESH_TOKEN_COOKIE = 'refresh_token';

function cookieOptions(maxAge) {
  return {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge,
  };
}

function authController() {
  async function login(req, res, next) {
    try {
      const { username, password } = req.validated.body;
      const user = { username, password };

      const loggedUser = await authService.login(user, requestInfo(req));

      if (!loggedUser) {
        return res.status(401)
          .json({ error: 'Invalid username or password' });
      }

      res.cookie(
        ACCESS_TOKEN_COOKIE,
        loggedUser.accessToken,
        cookieOptions(15 * 60 * 1000),
      );

      res.cookie(
        REFRESH_TOKEN_COOKIE,
        loggedUser.refreshToken,
        cookieOptions(30 * 24 * 60 * 60 * 1000),
      );

      return res.status(200)
        .json({
          user: loggedUser.user,
        });
    } catch (err) {
      return next(err);
    }
  }

  async function refresh(req, res, next) {
    try {
      const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE];

      if (!refreshTokenCookie.safeParse(refreshToken).success) {
        return res.status(401)
          .json({ error: 'Invalid refresh token' });
      }

      const tokens = await authService.refresh(refreshToken, requestInfo(req));

      // Another request (other tab) rotated it a moment ago and got the new cookies: nothing to do,
      // and clearing the cookies here would log that one out
      if (tokens?.status === 'concurrent') {
        return res.status(200).json({
          message: 'Token already refreshed',
        });
      }

      if (!tokens) {
        res.clearCookie(ACCESS_TOKEN_COOKIE);
        res.clearCookie(REFRESH_TOKEN_COOKIE);

        return res.status(401)
          .json({ error: 'Invalid refresh token' });
      }

      res.cookie(
        ACCESS_TOKEN_COOKIE,
        tokens.accessToken,
        cookieOptions(15 * 60 * 1000),
      );

      res.cookie(
        REFRESH_TOKEN_COOKIE,
        tokens.refreshToken,
        cookieOptions(30 * 24 * 60 * 60 * 1000),
      );

      return res.status(200).json({
        message: 'Token refreshed',
      });
    } catch (err) {
      return next(err);
    }
  }

  async function logout(req, res, next) {
    try {
      const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE];

      if (refreshTokenCookie.safeParse(refreshToken).success) {
        await authService.logout(refreshToken);
      }

      res.clearCookie(ACCESS_TOKEN_COOKIE);
      res.clearCookie(REFRESH_TOKEN_COOKIE);

      return res.status(204).send();
    } catch (err) {
      return next(err);
    }
  }

  async function me(req, res, next) {
    try {
      const user = await authService.getCurrentUser(req.user.sub);

      return res.status(200)
        .json({ user });
    } catch (err) {
      return next(err);
    }
  }

  return {
    login,
    refresh,
    logout,
    me,
  };
}

export default authController;
