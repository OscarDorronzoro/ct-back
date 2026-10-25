import eventNotificationRepository from './eventNotification.repository';
import pushService from './push.service';
import runInOrder from '../../shared/utils/runInOrder';
import { eventMessage, NOTIFIED_EVENTS, NOTIFY_MAX_AGE_MS } from './eventMessage.util';

// At most per run: the rest go in the next one
const BATCH = 100;

const notificationService = {
  // Delivers the events recorded since the last run (telemetry records them while processing the
  // messages). The cursor moves after each one: a failure retries from that event, not before.
  async deliverNewEvents(now = new Date()) {
    const cursor = await eventNotificationRepository.getCursor();
    const found = await eventNotificationRepository.findAfter(cursor, NOTIFIED_EVENTS, BATCH);

    await runInOrder(found, async (event) => {
      if (now - new Date(event.occurredAt) <= NOTIFY_MAX_AGE_MS) {
        await pushService.send(eventMessage(event));
      }

      await eventNotificationRepository.setCursor(event.id);
    });

    return found.length;
  },
};

export default notificationService;
