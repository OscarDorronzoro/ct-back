import { z } from 'zod';

// URL of the push service of the browser (https in every browser)
const endpoint = z.url({ protocol: /^https$/ }).max(2048);

// Keys of the browser to encrypt the notifications (base64url)
const key = z.string().regex(/^[A-Za-z0-9_-]+=*$/, 'must be base64url').max(256);

// PushSubscription.toJSON() of the browser
export const subscriptionBody = z.object({
  endpoint,
  keys: z.object({ p256dh: key, auth: key }),
});

export const endpointBody = z.object({ endpoint });

export const endpointQuery = z.object({ endpoint });
