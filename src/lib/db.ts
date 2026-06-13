import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
    const url = process.env.DATABASE_URL;
    if (!url) {
        throw new Error(
            "DATABASE_URL 环境变量未设置，请参考 .env 文件配置 PostgreSQL 连接地址"
        );
    }
    const adapter = new PrismaPg({ connectionString: url });
    return new PrismaClient({ adapter });
}

/** 懒加载 PrismaClient：仅在首次 API 请求时才连接数据库，避免构建时因无 DATABASE_URL 报错 */
function getPrisma(): PrismaClient {
    if (globalForPrisma.prisma) {
        return globalForPrisma.prisma;
    }
    const client = createPrismaClient();
    globalForPrisma.prisma = client;
    return client;
}

/** 代理对象，所有属性访问都会经过 getPrisma() 懒初始化 */
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
