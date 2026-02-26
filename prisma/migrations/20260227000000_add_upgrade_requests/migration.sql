-- CreateTable
CREATE TABLE "upgrade_requests" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "from_plan" "SubscriptionPlan" NOT NULL,
    "to_plan" "SubscriptionPlan" NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "auto_upgraded" BOOLEAN NOT NULL DEFAULT false,
    "message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "processed_by" TEXT,

    CONSTRAINT "upgrade_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "upgrade_requests_business_id_idx" ON "upgrade_requests"("business_id");

-- CreateIndex
CREATE INDEX "upgrade_requests_status_idx" ON "upgrade_requests"("status");

-- CreateIndex
CREATE INDEX "upgrade_requests_created_at_idx" ON "upgrade_requests"("created_at");

-- AddForeignKey
ALTER TABLE "upgrade_requests" ADD CONSTRAINT "upgrade_requests_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
