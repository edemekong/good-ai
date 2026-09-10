import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const experiences = sqliteTable("experiences", {
  id: text("id").primaryKey(),
  schemaVersion: integer("schema_version").notNull(),
  payload: text("payload").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const schema = {
  experiences,
};
