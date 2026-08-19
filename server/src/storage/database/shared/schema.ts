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
