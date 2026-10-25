import { describe, it, expect } from 'vitest';

import { subscriptionBody } from './notification.validator';

const subscription = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
  keys: { p256dh: 'BOr-_x9Q', auth: 'k8JV_6w' },
};

describe('subscriptionBody', () => {
  it('accepts the subscription of a browser', () => {
    expect(subscriptionBody.safeParse(subscription).success).toBe(true);
  });

  it('rejects an endpoint that is not https or keys that are not base64url', () => {
    expect(subscriptionBody.safeParse({ ...subscription, endpoint: 'http://push.example/x' }).success)
      .toBe(false);
    expect(subscriptionBody.safeParse({ ...subscription, keys: { p256dh: 'a b', auth: 'x' } }).success)
      .toBe(false);
  });
});
