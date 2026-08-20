import cowGroupMembershipRepository from '../repositories/cowGroupMembershipRepository';

// cowId, groupIds validated in cowService
const cowGroupMembershipService = {

  async sync(cowId, groupIds, tx) {
    const now = new Date();

    const currentMemberships = await cowGroupMembershipRepository.findByCowIdAtDate(cowId, now, tx);

    const currentGroupIds = new Set(currentMemberships.map(
      (membership) => membership.groupId,
    ));

    const desiredGroupIds = new Set(groupIds);

    const membershipsToRemove = currentMemberships.filter(
      (membership) => !desiredGroupIds.has(membership.groupId),
    );

    const groupsToAdd = [...desiredGroupIds].filter(
      (groupId) => !currentGroupIds.has(groupId),
    );

    // Groups to remove
    // eslint-disable-next-line no-restricted-syntax
    for (const membership of membershipsToRemove) {
      // eslint-disable-next-line no-await-in-loop
      await cowGroupMembershipRepository.close(
        membership.id,
        now,
        tx,
      );
    }

    // Groups to add
    // eslint-disable-next-line no-restricted-syntax
    for (const groupId of groupsToAdd) {
      // eslint-disable-next-line no-await-in-loop
      await cowGroupMembershipRepository.create(
        {
          cowId,
          groupId,
          dateFrom: now,
        },
        tx,
      );
    }

    return cowGroupMembershipRepository.findByCowIdAtDate(cowId, now, tx);
  },

  async closeAll(cowId, date, tx) {
    const memberships = await cowGroupMembershipRepository.findByCowIdAtDate(
      cowId,
      date,
      tx,
    );

    await Promise.all(
      memberships.map((membership) => (
        cowGroupMembershipRepository.close(
          membership.id,
          date,
          tx,
        )
      )),
    );
  },

};

export default cowGroupMembershipService;
