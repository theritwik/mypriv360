-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "data_categories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "consent_policies" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "scopes" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "consent_policies_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "consent_policies_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "data_categories" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "consent_tokens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "jwt" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "categories" TEXT NOT NULL,
    "scopes" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "consent_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "api_clients" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "apiKey" TEXT NOT NULL,
    "lastUsedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "access_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "apiClientId" TEXT,
    "endpoint" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT,
    "outcome" TEXT,
    "categoryKeys" TEXT NOT NULL,
    "purpose" TEXT,
    "tokenId" TEXT,
    "ip" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "access_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "access_logs_apiClientId_fkey" FOREIGN KEY ("apiClientId") REFERENCES "api_clients" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "access_logs_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "consent_tokens" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "sample_data" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "categoryKey" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sample_data_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "rate_limit_buckets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "apiKey" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "windowStart" DATETIME NOT NULL,
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "rate_limit_buckets_apiKey_fkey" FOREIGN KEY ("apiKey") REFERENCES "api_clients" ("apiKey") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "data_categories_key_key" ON "data_categories"("key");

-- CreateIndex
CREATE INDEX "consent_policies_userId_idx" ON "consent_policies"("userId");

-- CreateIndex
CREATE INDEX "consent_policies_createdAt_idx" ON "consent_policies"("createdAt");

-- CreateIndex
CREATE INDEX "consent_tokens_userId_idx" ON "consent_tokens"("userId");

-- CreateIndex
CREATE INDEX "consent_tokens_createdAt_idx" ON "consent_tokens"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "api_clients_apiKey_key" ON "api_clients"("apiKey");

-- CreateIndex
CREATE INDEX "api_clients_apiKey_idx" ON "api_clients"("apiKey");

-- CreateIndex
CREATE INDEX "api_clients_createdAt_idx" ON "api_clients"("createdAt");

-- CreateIndex
CREATE INDEX "access_logs_userId_idx" ON "access_logs"("userId");

-- CreateIndex
CREATE INDEX "access_logs_createdAt_idx" ON "access_logs"("createdAt");

-- CreateIndex
CREATE INDEX "sample_data_userId_idx" ON "sample_data"("userId");

-- CreateIndex
CREATE INDEX "sample_data_createdAt_idx" ON "sample_data"("createdAt");

-- CreateIndex
CREATE INDEX "rate_limit_buckets_apiKey_endpoint_idx" ON "rate_limit_buckets"("apiKey", "endpoint");

-- CreateIndex
CREATE INDEX "rate_limit_buckets_windowStart_idx" ON "rate_limit_buckets"("windowStart");

-- CreateIndex
CREATE UNIQUE INDEX "rate_limit_buckets_apiKey_endpoint_windowStart_key" ON "rate_limit_buckets"("apiKey", "endpoint", "windowStart");
