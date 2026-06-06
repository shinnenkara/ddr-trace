import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// Example table for your app
export const traces = sqliteTable('traces', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    status: text('status').notNull().default('active'),
    timestamp: integer('timestamp', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// Export inferred types for your Next.js frontend/backend
export type Trace = typeof traces.$inferSelect;
export type InsertTrace = typeof traces.$inferInsert;
