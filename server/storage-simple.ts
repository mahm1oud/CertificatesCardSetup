import { users, User, InsertUser, certificates, Certificate, InsertCertificate } from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql } from "drizzle-orm";
import { hashPassword } from "./auth";

export class DatabaseStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getUserCount(): Promise<number> {
    const [result] = await db.select({ count: sql<number>`count(*)` }).from(users);
    return result.count;
  }

  async getCertificateCount(): Promise<number> {
    const [result] = await db.select({ count: sql<number>`count(*)` }).from(certificates);
    return result.count;
  }

  async getCertificates(): Promise<Certificate[]> {
    return await db.select().from(certificates);
  }

  async getCertificate(id: number): Promise<Certificate | undefined> {
    const [certificate] = await db.select().from(certificates).where(eq(certificates.id, id));
    return certificate || undefined;
  }

  async getCertificatesByUser(userId: number): Promise<Certificate[]> {
    return await db.select().from(certificates).where(eq(certificates.userId, userId));
  }

  // Initialize admin user
  async initializeDefaultAdmin() {
    const existingAdmin = await this.getUserByUsername('admin');
    if (!existingAdmin) {
      const hashedPassword = await hashPassword('700700');
      await this.createUser({
        username: 'admin',
        password: hashedPassword,
        fullName: 'System Administrator',
        email: 'admin@certificates.com',
        isAdmin: true,
        role: 'admin'
      });
      console.log('✅ Default admin user created: admin/700700');
    }
  }
}

export const storage = new DatabaseStorage();