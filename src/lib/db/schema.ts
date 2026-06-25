import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

/*
 * Drizzle schema — the typed surface over Postgres. RLS policies, the
 * SECURITY DEFINER functions (attribution + ledger), generated tsvector
 * columns, and the auth.users foreign keys live in supabase/migrations
 * because an ORM models them badly. This file is the source of truth for
 * shapes; the SQL is the source of truth for policy.
 *
 * Identity firewall: endorsements.endorser_id exists here but RLS forbids the
 * client from ever selecting it. Reads go through RPCs that emit only counts.
 */

export const availabilityEnum = pgEnum("availability", [
  "actively_looking",
  "open_to_opportunities",
]);

export const intentEnum = pgEnum("intent", [
  "networking",
  "synergy",
  "mentorship",
  "disruption",
  "one_on_one_sync",
]);

export const seniorityEnum = pgEnum("seniority", [
  "intern",
  "associate",
  "mid",
  "senior",
  "staff",
  "principal",
  "director",
  "vp",
  "c_suite",
]);

export const tagCategoryEnum = pgEnum("tag_category", [
  "corporate",
  "physical",
  "behavioral",
]);

export const tagTierEnum = pgEnum("tag_tier", ["self", "peer"]);
export const tagKindEnum = pgEnum("tag_kind", ["canon", "freeform"]);

export const endorsementStatusEnum = pgEnum("endorsement_status", [
  "pending",
  "active",
  "hidden",
  "declined",
]);

export const integrityEventTypeEnum = pgEnum("integrity_event_type", [
  "hidden",
  "declined",
  "approved",
  "peer_received",
  "peer_lost",
]);

export const swipeDirectionEnum = pgEnum("swipe_direction", ["right", "left"]);

export const reportTargetKindEnum = pgEnum("report_target_kind", [
  "profile",
  "endorsement",
  "message",
]);

export const reportStatusEnum = pgEnum("report_status", [
  "open",
  "actioned",
  "dismissed",
]);

export const companies = pgTable("companies", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
});

export const roles = pgTable("roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
});

export const profiles = pgTable("profiles", {
  // 1:1 with auth.users; FK added in SQL migration.
  id: uuid("id").primaryKey(),
  displayName: text("display_name").notNull(),
  roleId: uuid("role_id").references(() => roles.id),
  companyId: uuid("company_id").references(() => companies.id),
  // Self-reported, best-effort, unverified — a filter facet, not a trust signal.
  campus: text("campus"),
  location: text("location"),
  seniority: seniorityEnum("seniority").notNull().default("mid"),
  headline: text("headline").notNull().default(""),
  availability: availabilityEnum("availability").notNull().default("open_to_opportunities"),
  // Deniability theater: stored for vanity, routes to nothing.
  intent: intentEnum("intent").notNull().default("synergy"),
  intentLine: text("intent_line").notNull().default(""),
  avatarHue: integer("avatar_hue").notNull().default(210),
  isAgeVerified: boolean("is_age_verified").notNull().default(false),
  consentsToListing: boolean("consents_to_listing").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const canonTags = pgTable(
  "canon_tags",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    label: text("label").notNull().unique(),
    category: tagCategoryEnum("category").notNull(),
  },
  (t) => [index("canon_tags_category_idx").on(t.category)],
);

export const endorsements = pgTable(
  "endorsements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    subjectId: uuid("subject_id").notNull(),
    // RLS-hidden from clients. Reads only via SECURITY DEFINER RPCs.
    endorserId: uuid("endorser_id").notNull(),
    tier: tagTierEnum("tier").notNull(),
    kind: tagKindEnum("kind").notNull(),
    canonTagId: uuid("canon_tag_id").references(() => canonTags.id),
    freeformLabel: text("freeform_label"),
    status: endorsementStatusEnum("status").notNull().default("active"),
    // Denormalized from canon (or 'freeform') to drive rendering & policy.
    category: text("category").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
  },
  (t) => [
    index("endorsements_subject_idx").on(t.subjectId),
    // One endorser cannot stack the same canon tag on the same subject twice.
    unique("endorsements_unique_canon").on(t.subjectId, t.endorserId, t.canonTagId),
  ],
);

export const integrityEvents = pgTable(
  "integrity_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    subjectId: uuid("subject_id").notNull(),
    endorsementId: uuid("endorsement_id").references(() => endorsements.id),
    type: integrityEventTypeEnum("type").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("integrity_events_subject_idx").on(t.subjectId, t.occurredAt)],
);

export const swipes = pgTable(
  "swipes",
  {
    swiperId: uuid("swiper_id").notNull(),
    targetId: uuid("target_id").notNull(),
    direction: swipeDirectionEnum("direction").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.swiperId, t.targetId] })],
);

export const matches = pgTable(
  "matches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // Sorted pair (userA < userB) enforced by a CHECK in SQL.
    userA: uuid("user_a").notNull(),
    userB: uuid("user_b").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("matches_unique_pair").on(t.userA, t.userB)],
);

export const conversations = pgTable("conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  matchId: uuid("match_id")
    .notNull()
    .references(() => matches.id)
    .unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id),
    senderId: uuid("sender_id").notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("messages_conversation_idx").on(t.conversationId, t.createdAt)],
);

export const blocks = pgTable(
  "blocks",
  {
    blockerId: uuid("blocker_id").notNull(),
    blockedId: uuid("blocked_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.blockerId, t.blockedId] })],
);

export const reports = pgTable("reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  reporterId: uuid("reporter_id").notNull(),
  subjectId: uuid("subject_id").notNull(),
  reason: text("reason").notNull(),
  targetKind: reportTargetKindEnum("target_kind").notNull(),
  targetId: uuid("target_id"),
  status: reportStatusEnum("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
