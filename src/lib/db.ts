import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
    const url = process.env.DATABASE_URL || "file:./data/cow_detection.db";

    // 根据连接串协议自动选择适配器
    if (url.startsWith("postgresql://") || url.startsWith("postgres://")) {
        // PostgreSQL（Vercel / Neon 线上部署）
        const {
            PrismaPg,
        } = require("@prisma/adapter-pg") as typeof import("@prisma/adapter-pg");
        const adapter = new PrismaPg({ connectionString: url });
        return new PrismaClient({ adapter });
    }

    // SQLite（本地 / Electron 离线版）
    const {
        PrismaBetterSqlite3,
    } = require("@prisma/adapter-better-sqlite3") as typeof import("@prisma/adapter-better-sqlite3");
    const adapter = new PrismaBetterSqlite3({ url });
    return new PrismaClient({ adapter });
}

function getPrisma(): PrismaClient {
    if (globalForPrisma.prisma) {
        return globalForPrisma.prisma;
    }
    const client = createPrismaClient();
    globalForPrisma.prisma = client;
    return client;
}

export const db = new Proxy({} as PrismaClient, {
    get(_target, prop: keyof PrismaClient) {
        const client = getPrisma();
        const value = client[prop];
        if (typeof value === "function") {
            return (...args: unknown[]) =>
                (value as (...a: unknown[]) => unknown).apply(client, args);
        }
        return value;
    },
});
