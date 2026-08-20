import {
  eq,
  and,
  gte,
  lt,
  or,
  isNull,
} from 'drizzle-orm';

import db from '../db/drizzle';
import cowGroupMemberships from '../schema/cowGroupMemberships';
import cows from '../schema/cows';
import groups from '../schema/groups';
import breeds from '../schema/breeds';

const cowGroupMembershipRepository = {

  async findById(id, tx = db) {
    const [membership] = await tx
      .select()
      .from(cowGroupMemberships)
      .where(eq(cowGroupMemberships.id, id));

    return membership ?? null;
  },

  async findByCowIdAtDate(cowId, date = new Date(), tx = db) {
    const memberships = await tx
      .select()
      .from(cowGroupMemberships)
      .where(
        and(
          eq(cowGroupMemberships.cowId, cowId),
          gte(date, cowGroupMemberships.dateFrom),
          or(
            isNull(cowGroupMemberships.dateTo),
            lt(date, cowGroupMemberships.dateTo),
          ),
        ),
      );

    return memberships;
  },

  async findByGroupIdAtDate(groupId, date = new Date(), tx = db) {
    const memberships = await tx
      .select()
      .from(cowGroupMemberships)
      .where(
        and(
          eq(cowGroupMemberships.groupId, groupId),
          gte(date, cowGroupMemberships.dateFrom),
          or(
            isNull(cowGroupMemberships.dateTo),
            lt(date, cowGroupMemberships.dateTo),
          ),
        ),
      );

    return memberships;
  },

  async verifyMembershipAtDate(cowId, groupId, date = new Date(), tx = db) {
    const [membership] = await tx
      .select()
      .from(cowGroupMemberships)
      .where(
        and(
          eq(cowGroupMemberships.cowId, cowId),
          eq(cowGroupMemberships.groupId, groupId),
          gte(date, cowGroupMemberships.dateFrom),
          or(
            isNull(cowGroupMemberships.dateTo),
            lt(date, cowGroupMemberships.dateTo),
          ),
        ),
      );

    return membership ?? null;
  },

  async create(membership, tx = db) {
    const [created] = await tx
      .insert(cowGroupMemberships)
      .values(membership)
      .returning();

    return created;
  },

  async close(id, dateTo, tx = db) {
    const [closed] = await tx
      .update(cowGroupMemberships)
      .set({ dateTo })
      .where(eq(cowGroupMemberships.id, id))
      .returning();

    return closed ?? null;
  },

  async getAllCowsWithGroupsAtDate(date = new Date(), tx = db) {
    const cowsReturned = await tx
      .select({
        cow: {
          ...cows,
          breed: breeds,
        },
        group: groups,
      })
      .from(cows)
      .leftJoin(
        breeds,
        eq(cows.breedId, breeds.id),
      )
      .leftJoin(
        cowGroupMemberships,
        and(
          eq(cows.id, cowGroupMemberships.cowId),
          gte(date, cowGroupMemberships.dateFrom),
          or(
            isNull(cowGroupMemberships.dateTo),
            lt(date, cowGroupMemberships.dateTo),
          ),
        ),
      )
      .leftJoin(
        groups,
        eq(cowGroupMemberships.groupId, groups.id),
      )
      .where(isNull(cows.deletedAt));

    return cowsReturned;
  },

};

export default cowGroupMembershipRepository;
