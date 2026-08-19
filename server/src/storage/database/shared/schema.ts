import { pgTable, serial, timestamp, varchar, text, integer, boolean, index, uniqueIndex } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const novels = pgTable(
  "novels",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    name: varchar("name", { length: 255 }).notNull(),
    cover_key: varchar("cover_key", { length: 500 }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("novels_created_at_idx").on(table.created_at),
  ]
);

export const users = pgTable(
  "users",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    uid: varchar("uid", { length: 50 }).notNull().unique(),
    nickname: varchar("nickname", { length: 100 }).notNull().default("无名氏"),
    avatar_key: varchar("avatar_key", { length: 500 }),
    credits: integer("credits").notNull().default(1000),
    nickname_updated_at: timestamp("nickname_updated_at", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  }
);

export const characters = pgTable(
  "characters",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    novel_id: varchar("novel_id", { length: 36 }).notNull().references(() => novels.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    category: varchar("category", { length: 20 }).notNull().default("protagonist"),
    avatar_key: varchar("avatar_key", { length: 500 }),
    gender: varchar("gender", { length: 10 }).default("unknown"),
    portrait_prompt: text("portrait_prompt"),
    portrait_key: varchar("portrait_key", { length: 500 }),
    portrait_frame_key: varchar("portrait_frame_key", { length: 500 }),
    portrait_crop: varchar("portrait_crop", { length: 10 }).default("face"),
    persona: text("persona"),
    appearance: text("appearance"),
    background: text("background"),
    biography: text("biography"),
    principles: text("principles"),
    examples: text("examples"),
    tagline: varchar("tagline", { length: 500 }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("characters_novel_id_idx").on(table.novel_id),
    index("characters_category_idx").on(table.category),
  ]
);

export const relationships = pgTable(
  "relationships",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    novel_id: varchar("novel_id", { length: 36 }).notNull().references(() => novels.id, { onDelete: "cascade" }),
    from_character_id: varchar("from_character_id", { length: 36 }).notNull().references(() => characters.id, { onDelete: "cascade" }),
    to_character_id: varchar("to_character_id", { length: 36 }).notNull().references(() => characters.id, { onDelete: "cascade" }),
    relation_type: varchar("relation_type", { length: 100 }).notNull().default(" acquaintance"),
    description: text("description"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("relationships_novel_id_idx").on(table.novel_id),
    index("relationships_from_idx").on(table.from_character_id),
    index("relationships_to_idx").on(table.to_character_id),
  ]
);

export const moments = pgTable(
  "moments",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    character_id: varchar("character_id", { length: 36 }).references(() => characters.id, { onDelete: "cascade" }),
    novel_id: varchar("novel_id", { length: 36 }).notNull().references(() => novels.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    image_url: varchar("image_url", { length: 500 }),
    visibility: varchar("visibility", { length: 20 }).default("public"),
    blocked_character_ids: text("blocked_character_ids").default("[]"),
    author_type: varchar("author_type", { length: 20 }).default("character"),
    author_name: varchar("author_name", { length: 100 }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("moments_novel_id_idx").on(table.novel_id),
    index("moments_character_id_idx").on(table.character_id),
  ]
);

export const moment_likes = pgTable(
  "moment_likes",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    moment_id: varchar("moment_id", { length: 36 }).notNull().references(() => moments.id, { onDelete: "cascade" }),
    character_id: varchar("character_id", { length: 36 }).notNull().references(() => characters.id, { onDelete: "cascade" }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("moment_likes_unique_idx").on(table.moment_id, table.character_id),
  ]
);

export const moment_comments = pgTable(
  "moment_comments",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    moment_id: varchar("moment_id", { length: 36 }).notNull().references(() => moments.id, { onDelete: "cascade" }),
    character_id: varchar("character_id", { length: 36 }).references(() => characters.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    author_type: varchar("author_type", { length: 20 }).default("character"),
    author_name: varchar("author_name", { length: 100 }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("moment_comments_moment_id_idx").on(table.moment_id),
  ]
);

export const moment_backgrounds = pgTable(
  "moment_backgrounds",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    novel_id: varchar("novel_id", { length: 36 }).notNull().references(() => novels.id, { onDelete: "cascade" }),
    image_url: varchar("image_url", { length: 500 }).notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("moment_backgrounds_novel_id_idx").on(table.novel_id),
  ]
);

export const affinity = pgTable(
  "affinity",
  {
    id: varchar("id", { length: 64 }).primaryKey().default(sql`gen_random_uuid()`),
    user_id: varchar("user_id", { length: 100 }).notNull(),
    character_id: varchar("character_id", { length: 64 }).notNull().references(() => characters.id, { onDelete: "cascade" }),
    novel_id: varchar("novel_id", { length: 64 }).notNull(),
    value: integer("value").notNull().default(50),
    level: varchar("level", { length: 20 }).default("friend"),
    user_persona: text("user_persona"),
    affinity_edit_available: boolean("affinity_edit_available").default(false),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("affinity_user_character_idx").on(table.user_id, table.character_id),
  ]
);

export const agentFeedback = pgTable(
  "agent_feedback",
  {
    id: varchar("id", { length: 64 }).primaryKey().default(sql`gen_random_uuid()`),
    novel_id: varchar("novel_id", { length: 64 }).notNull(),
    character_id: varchar("character_id", { length: 64 }),
    feedback_text: text("feedback_text").notNull(),
    optimization: text("optimization"),
    status: varchar("status", { length: 20 }).default("applied"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  }
);
