-- AlterTable
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "invoice_due_date_days" INTEGER NOT NULL DEFAULT 30;
