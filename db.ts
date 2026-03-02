import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, products, orders, cartItems, invoices, payments, accountLedger, shipments } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Products queries
export async function getAllProducts() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(products);
}

export async function getProductById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return result[0];
}

export async function getProductsByCategory(category: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(products).where(eq(products.category, category));
}

// Orders queries
export async function getUserOrders(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orders).where(eq(orders.userId, userId));
}

export async function getOrderById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  return result[0];
}

// Cart queries
export async function getUserCart(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(cartItems).where(eq(cartItems.userId, userId));
}

// Invoices queries
export async function getUserInvoices(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(invoices).where(eq(invoices.userId, userId));
}

// Account ledger queries
export async function getUserAccountBalance(userId: number) {
  const db = await getDb();
  if (!db) return { debit: 0, credit: 0, balance: 0 };
  
  const entries = await db.select().from(accountLedger).where(eq(accountLedger.userId, userId));
  
  let debit = 0;
  let credit = 0;
  
  entries.forEach(entry => {
    if (entry.type === 'debit') {
      debit += parseFloat(entry.amount.toString());
    } else {
      credit += parseFloat(entry.amount.toString());
    }
  });
  
  return {
    debit,
    credit,
    balance: credit - debit
  };
}

// Shipments queries
export async function getOrderShipment(orderId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(shipments).where(eq(shipments.orderId, orderId)).limit(1);
  return result[0];
}
