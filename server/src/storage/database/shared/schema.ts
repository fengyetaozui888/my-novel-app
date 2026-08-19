import { pgTable, serial, timestamp, varchar, text, integer, index } from "drizzle-orm/pg-core"
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
    persona: text("persona"),
    background: text("background"),
    biography: text("biography"),
    principles: text("principles"),
    examples: text("examples"),
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
