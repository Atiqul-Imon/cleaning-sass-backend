-- AlterTable
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "invoice_template" TEXT NOT NULL DEFAULT 'classic';


