import pushService from './push.service';
import pushSubscriptionRepository from './pushSubscription.repository';

function notificationController() {
  // Key of the server for the browsers to subscribe (null: push not configured)
  function getPushKey(req, res) {
    return res.json({ publicKey: pushService.publicKey() });
  }

  // Whether this device receives them in this session (logging out stops them)
  async function getSubscription(req, res, next) {
    try {
      const { endpoint } = req.validated.query;
      const subscription = await pushSubscriptionRepository.findByEndpoint(endpoint);
      const active = Boolean(subscription)
        && subscription.userId === req.user.sub
        && subscription.sessionId === req.user.sid;

      return res.json({ active });
    } catch (err) {
      return next(err);
    }
  }

  async function subscribe(req, res, next) {
    try {
      const { endpoint, keys } = req.validated.body;

      await pushSubscriptionRepository.upsert({
        userId: req.user.sub,
        sessionId: req.user.sid,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: req.get('user-agent')?.slice(0, 512) ?? null,
      });

      return res.status(204).send();
    } catch (err) {
      return next(err);
    }
  }

  async function unsubscribe(req, res, next) {
    try {
      await pushSubscriptionRepository.deleteByEndpoint(req.user.sub, req.validated.body.endpoint);

      return res.status(204).send();
    } catch (err) {
      return next(err);
    }
  }

  // To the devices of the user: to check that they arrive
  async function sendTest(req, res, next) {
    try {
      const result = await pushService.send({
        title: 'Notificación de prueba',
        body: 'Las notificaciones de las vacas llegarán así a este dispositivo.',
        url: '/settings/notifications',
        tag: 'test',
      }, { userId: req.user.sub });

      return res.json(result);
    } catch (err) {
      return next(err);
    }
  }

  return {
    getPushKey, getSubscription, subscribe, unsubscribe, sendTest,
  };
}

export default notificationController;
