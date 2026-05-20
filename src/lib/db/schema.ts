import { pgTable, uuid, varchar, text, timestamp, integer, uniqueIndex } from 'drizzle-orm/pg-core';

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(),
  displayName: varchar('display_name', { length: 50 }),
  avatarUrl: text('avatar_url'),
  favoriteCharacterId: varchar('favorite_character_id', { length: 50 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  characterId: varchar('character_id', { length: 50 }).notNull(),
  roundNumber: integer('round_number').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 20 }).notNull(),
  content: text('content').notNull(),
  audioUrl: text('audio_url'),
  imageUrl: text('image_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const userMemories = pgTable('user_memories', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  key: varchar('key', { length: 100 }).notNull(),
  value: text('value').notNull(),
}, (table) => [
  uniqueIndex('user_memories_conversation_key_idx').on(table.conversationId, table.key),
]);

export const characterFavorability = pgTable('character_favorability', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  characterId: varchar('character_id', { length: 50 }).notNull(),
  score: integer('score').default(0).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('favorability_user_character_idx').on(table.userId, table.characterId),
]);

export const characterEmotions = pgTable('character_emotions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  characterId: varchar('character_id', { length: 50 }).notNull(),
  emotionType: varchar('emotion_type', { length: 20 }).notNull(),
  intensity: integer('intensity').default(50).notNull(),
  cause: text('cause'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('emotion_user_character_idx').on(table.userId, table.characterId),
]);
