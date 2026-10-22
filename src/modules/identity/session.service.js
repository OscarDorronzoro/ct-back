import userRepository from './user.repository';
import userSessionRepository from './session.repository';
import AppError from '../../shared/errors/AppError';

async function checkTargetUser(userId) {
  const user = await userRepository.findById(userId);

  if (!user) {
    throw new AppError('USER_NOT_FOUND', 404);
  }
}

function toResponse(session, currentSessionId) {
  return {
    id: session.id,
    createdAt: session.createdAt,
    lastUsedAt: session.lastUsedAt,
    createdIp: session.createdIp,
    lastIp: session.lastIp,
    userAgent: session.userAgent,
    current: session.id === currentSessionId,
  };
}

// Admin: a user's active sessions (devices) and revoking them
const sessionService = {
  async getActive(userId, authenticatedUser) {
    await checkTargetUser(userId);

    const sessions = await userSessionRepository.findActiveByUser(userId);

    return sessions.map((session) => toResponse(session, authenticatedUser.sid));
  },

  async revoke(userId, sessionId) {
    await checkTargetUser(userId);

    const session = await userSessionRepository.findById(sessionId);

    if (!session || session.userId !== userId) {
      throw new AppError('SESSION_NOT_FOUND', 404);
    }

    await userSessionRepository.revoke(sessionId, 'admin');
  },

  // All but the caller's own session (an admin closing their other devices stays logged in)
  async revokeAll(userId, authenticatedUser) {
    await checkTargetUser(userId);

    return userSessionRepository.revokeAllForUser(
      userId,
      'admin',
      { exceptId: authenticatedUser.sid ?? null },
    );
  },
};

export default sessionService;
