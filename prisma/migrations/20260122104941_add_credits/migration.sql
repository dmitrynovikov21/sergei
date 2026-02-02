/*
  Warnings:

  - You are about to drop the column `icon` on the `agents` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN "password" TEXT;

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "agent_files" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "agent_files_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "projects_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT NOT NULL,
    "name" TEXT,
    "type" TEXT,
    "messageId" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "attachments_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "datasets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "userId" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "datasets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tracking_sources" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT NOT NULL,
    "username" TEXT,
    "datasetId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "minViewsFilter" INTEGER NOT NULL DEFAULT 0,
    "fetchLimit" INTEGER NOT NULL DEFAULT 20,
    "lastScrapedAt" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "daysLimit" INTEGER NOT NULL DEFAULT 30,
    "contentTypes" TEXT NOT NULL DEFAULT 'Video,Sidecar,Image',
    CONSTRAINT "tracking_sources_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "datasets" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "parse_history" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceId" TEXT NOT NULL,
    "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'running',
    "daysRange" INTEGER NOT NULL DEFAULT 7,
    "posts_found" INTEGER NOT NULL DEFAULT 0,
    "posts_added" INTEGER NOT NULL DEFAULT 0,
    "posts_skipped" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    CONSTRAINT "parse_history_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "tracking_sources" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "content_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "instagramId" TEXT NOT NULL,
    "originalUrl" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "coverUrl" TEXT,
    "videoUrl" TEXT,
    "views" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" DATETIME,
    "headline" TEXT,
    "transcript" TEXT,
    "isProcessed" BOOLEAN NOT NULL DEFAULT false,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "processingError" TEXT,
    "viralityScore" REAL,
    "datasetId" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "content_items_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "datasets" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "token_transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "totalCost" REAL NOT NULL,
    "context" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "token_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_agents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "systemPrompt" TEXT NOT NULL,
    "emoji" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "model" TEXT NOT NULL DEFAULT 'claude-4-5-sonnet',
    "useEmoji" BOOLEAN NOT NULL DEFAULT false,
    "useSubscribe" BOOLEAN NOT NULL DEFAULT false,
    "useLinkInBio" BOOLEAN NOT NULL DEFAULT false,
    "codeWord" TEXT,
    "audienceQuestion" TEXT,
    "subscribeLink" TEXT,
    "userContext" TEXT,
    "datasetId" TEXT,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "agents_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "datasets" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "agents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_agents" ("created_at", "description", "id", "name", "systemPrompt", "updated_at", "userId") SELECT "created_at", "description", "id", "name", "systemPrompt", "updated_at", "userId" FROM "agents";
DROP TABLE "agents";
ALTER TABLE "new_agents" RENAME TO "agents";
CREATE INDEX "agents_userId_idx" ON "agents"("userId");
CREATE INDEX "agents_datasetId_idx" ON "agents"("datasetId");
CREATE TABLE "new_chats" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "datasetId" TEXT,
    "title" TEXT DEFAULT 'New Chat',
    "icon" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chats_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "datasets" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "chats_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "chats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "chats_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_chats" ("agentId", "created_at", "icon", "id", "title", "updated_at", "userId") SELECT "agentId", "created_at", "icon", "id", "title", "updated_at", "userId" FROM "chats";
DROP TABLE "chats";
ALTER TABLE "new_chats" RENAME TO "chats";
CREATE INDEX "chats_userId_idx" ON "chats"("userId");
CREATE INDEX "chats_agentId_idx" ON "chats"("agentId");
CREATE INDEX "chats_projectId_idx" ON "chats"("projectId");
CREATE INDEX "chats_datasetId_idx" ON "chats"("datasetId");
CREATE TABLE "new_messages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chatId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "cost" REAL NOT NULL DEFAULT 0.0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "messages_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "chats" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_messages" ("chatId", "content", "created_at", "id", "role") SELECT "chatId", "content", "created_at", "id", "role" FROM "messages";
DROP TABLE "messages";
ALTER TABLE "new_messages" RENAME TO "messages";
CREATE INDEX "messages_chatId_idx" ON "messages"("chatId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_email_token_key" ON "password_reset_tokens"("email", "token");

-- CreateIndex
CREATE INDEX "agent_files_agentId_idx" ON "agent_files"("agentId");

-- CreateIndex
CREATE INDEX "projects_userId_idx" ON "projects"("userId");

-- CreateIndex
CREATE INDEX "attachments_messageId_idx" ON "attachments"("messageId");

-- CreateIndex
CREATE INDEX "datasets_userId_idx" ON "datasets"("userId");

-- CreateIndex
CREATE INDEX "tracking_sources_datasetId_idx" ON "tracking_sources"("datasetId");

-- CreateIndex
CREATE INDEX "parse_history_sourceId_idx" ON "parse_history"("sourceId");

-- CreateIndex
CREATE INDEX "parse_history_started_at_idx" ON "parse_history"("started_at");

-- CreateIndex
CREATE INDEX "content_items_datasetId_idx" ON "content_items"("datasetId");

-- CreateIndex
CREATE INDEX "content_items_isApproved_idx" ON "content_items"("isApproved");

-- CreateIndex
CREATE UNIQUE INDEX "content_items_instagramId_datasetId_key" ON "content_items"("instagramId", "datasetId");

-- CreateIndex
CREATE INDEX "token_transactions_userId_idx" ON "token_transactions"("userId");
