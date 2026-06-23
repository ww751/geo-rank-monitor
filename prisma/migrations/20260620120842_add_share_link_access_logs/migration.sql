-- CreateTable
CREATE TABLE "share_link_access_logs" (
    "id" TEXT NOT NULL,
    "shareLinkId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "share_link_access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "share_link_access_logs_shareLinkId_createdAt_idx" ON "share_link_access_logs"("shareLinkId", "createdAt");

-- AddForeignKey
ALTER TABLE "share_link_access_logs" ADD CONSTRAINT "share_link_access_logs_shareLinkId_fkey" FOREIGN KEY ("shareLinkId") REFERENCES "client_share_links"("id") ON DELETE CASCADE ON UPDATE CASCADE;
