import net from 'node:net';

const USER_AGENT_MAX_LENGTH = 512;

// Client IP and user agent, for session auditing.
// req.ip is the last X-Forwarded-For entry (trust proxy = 1): the one Nginx sets, not the client.
// Both are validated anyway: they are stored, and later shown in the admin UI.
export default function requestInfo(req) {
  let ip = typeof req.ip === 'string' ? req.ip : '';

  // IPv4 clients on a dual-stack socket show up as ::ffff:1.2.3.4
  if (ip.startsWith('::ffff:') && net.isIPv4(ip.slice(7))) {
    ip = ip.slice(7);
  }

  const userAgent = (req.get('user-agent') ?? '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .slice(0, USER_AGENT_MAX_LENGTH);

  return {
    ip: net.isIP(ip) ? ip : null,
    userAgent: userAgent || null,
  };
}
