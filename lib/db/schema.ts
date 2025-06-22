import {
  pgTable,
  text,
  uuid,
  integer,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const files = pgTable("files", {
  id: uuid("id").defaultRandom().primaryKey(),

  name: text("name").notNull(),
  path: text("path").notNull(), // Directory path ex. /document/folder/resume.pdf
  size: integer("size").notNull(),
  type: text("type").notNull(),

  fileUrl: text("file_url").notNull(), // URL to access the file
  thumbnailUrl: text("thumbnail_url"),

  userId: text("user_id").notNull(),
  parentId: uuid("parent_id"), //null for root folders

  isFolder: boolean("is_folder").default(false).notNull(),
  isStarred: boolean("is_starred").default(false).notNull(),
  isTrash: boolean("is_trash").default(false).notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/*
parent: Each file/folder can have a parent file/folder, allowing for a hierarchical structure.
children: Each file/folder can have multiple children files/folders, enabling nested structures.
*/

export const filesRelations = relations(files, ({ one, many }) => ({
  parent: one(files, {
    fields: [files.parentId],
    references: [files.id],
  }),

  children: many(files),
}));

//Type definations

export const File = typeof files.$inferSelect;
export const NewFile = typeof files.$inferInsert;
