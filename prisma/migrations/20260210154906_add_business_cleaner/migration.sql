-- CreateEnum
CREATE TYPE "CleanerStatus" AS ENUM ('PENDING', 'ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "business_cleaners" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "cleaner_id" TEXT NOT NULL,
    "status" "CleanerStatus" NOT NULL DEFAULT 'ACTIVE',
    "invited_by" TEXT NOT NULL,
    "invited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_cleaners_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "business_cleaners_business_id_cleaner_id_key" ON "business_cleaners"("business_id", "cleaner_id");

-- AddForeignKey
ALTER TABLE "business_cleaners" ADD CONSTRAINT "business_cleaners_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_cleaners" ADD CONSTRAINT "business_cleaners_cleaner_id_fkey" FOREIGN KEY ("cleaner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
