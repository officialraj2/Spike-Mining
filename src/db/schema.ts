import { relations } from 'drizzle-orm';
import { doublePrecision, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// Define the 'users' table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  address: text('address'),
  email: text('email'),
  balanceUsdt: doublePrecision('balance_usdt').default(0),
  balanceBnb: doublePrecision('balance_bnb').default(0),
  balanceSpk: doublePrecision('balance_spk').default(0),
  role: text('role').default('user'),
  referralCode: text('referral_code'),
  referredBy: text('referred_by'),
  customHashrate: doublePrecision('custom_hashrate'),
  status: text('status').default('active'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Define the 'mining_nodes' table
export const miningNodes = pgTable('mining_nodes', {
  id: serial('id').primaryKey(),
  nodeId: text('node_id').notNull().unique(),
  userUid: text('user_uid').references(() => users.uid),
  userAddress: text('user_address'),
  name: text('name').notNull(),
  region: text('region'),
  status: text('status').default('mining'),
  hashrate: doublePrecision('hashrate').default(100),
  temperature: integer('temperature').default(62),
  powerUsage: integer('power_usage').default(2200),
  costUsdt: doublePrecision('cost_usdt').default(10),
  algorithm: text('algorithm').default('SHA-256 (BSC Sublayer)'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Define the 'transactions' table
export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  txHash: text('tx_hash').notNull(),
  userUid: text('user_uid').references(() => users.uid),
  userAddress: text('user_address'),
  type: text('type').notNull(),
  amount: doublePrecision('amount').default(0),
  currency: text('currency').default('USDT'),
  status: text('status').default('Confirmed'),
  details: text('details'),
  blockNumber: integer('block_number'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Relationships
export const usersRelations = relations(users, ({ many }) => ({
  nodes: many(miningNodes),
  transactions: many(transactions),
}));

export const miningNodesRelations = relations(miningNodes, ({ one }) => ({
  user: one(users, {
    fields: [miningNodes.userUid],
    references: [users.uid],
  }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userUid],
    references: [users.uid],
  }),
}));
