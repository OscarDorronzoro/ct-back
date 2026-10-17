// Properties our middlewares add to the Express request
export {};

declare global {
  namespace Express {
    interface Request {
      // validate middleware: parsed params, query and body
      validated: {
        params?: Record<string, unknown>;
        query?: Record<string, unknown>;
        body?: Record<string, unknown>;
      };
      // authenticateUser: access token payload (sid: session id)
      user?: { sub: number; role: number; sid?: string };
      // gatewayAuth: the gateway that sent the request
      gateway?: { id: number };
    }
  }
}
