import webpush from 'web-push';

import logger from '../../shared/utils/logger';
import pushSubscriptionRepository from './pushSubscription.repository';
import { permissionsOf } from '../identity/permission.util';

// The push services answer this for a device that unsubscribed or no longer exists
const GONE_STATUSES = [404, 410];

// Keys of the server (VAPID), from the .env; null without them (nothing is sent)
function vapidDetails() {
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT) {
    return null;
  }

  return { subject: VAPID_SUBJECT, publicKey: VAPID_PUBLIC_KEY, privateKey: VAPID_PRIVATE_KEY };
}

const pushService = {
  // For the browsers to subscribe; null if push is not configured
  publicKey() {
    return vapidDetails()?.publicKey ?? null;
  },

  // Sends a notification ({ title, body, url, tag }) to the devices whose user has `permission`.
  // userId: only the devices of that user. Returns how many devices accepted it.
  async send(payload, { permission = 'map:read', userId } = {}) {
    const vapid = vapidDetails();

    if (!vapid) {
      logger.warn('Push notifications not configured (VAPID_* in the .env): not sent');
      return { sent: 0 };
    }

    const subscriptions = (await pushSubscriptionRepository.findActive({ userId }))
      .filter((s) => permissionsOf(s.roles).includes(permission));

    const body = JSON.stringify(payload);

    const results = await Promise.allSettled(subscriptions.map((s) => webpush.sendNotification(
      { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
      body,
      // Not worth delivering after an hour (the device was off); high: wake the phone
      { vapidDetails: vapid, TTL: 60 * 60, urgency: 'high' },
    )));

    const sent = [];
    const gone = [];

    results.forEach((result, i) => {
      const { id } = subscriptions[i];

      if (result.status === 'fulfilled') {
        sent.push(id);
      } else if (GONE_STATUSES.includes(result.reason?.statusCode)) {
        gone.push(id);
      } else {
        logger.warn({
          message: 'Push notification not delivered',
          subscriptionId: id,
          status: result.reason?.statusCode,
          error: result.reason?.message,
        });
      }
    });

    await pushSubscriptionRepository.markSent(sent, new Date());
    await pushSubscriptionRepository.deleteByIds(gone);

    return { sent: sent.length };
  },
};

export default pushService;
