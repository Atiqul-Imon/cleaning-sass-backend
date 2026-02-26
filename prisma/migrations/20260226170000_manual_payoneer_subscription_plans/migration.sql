-- Add PAYONEER to PaymentMethod
ALTER TYPE "PaymentMethod" ADD VALUE 'PAYONEER';

-- Add TRIALING to SubscriptionStatus
ALTER TYPE "SubscriptionStatus" ADD VALUE 'TRIALING';

-- Add new columns to subscriptions
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "trial_started_at" TIMESTAMP(3);
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "trial_ends_at" TIMESTAMP(3);
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "payment_method" "PaymentMethod";
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "payoneer_email" TEXT;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "admin_notes" TEXT;

-- Migrate SubscriptionPlan: FREE/SOLO/SMALL_TEAM -> SOLO/TEAM/BUSINESS
CREATE TYPE "SubscriptionPlan_new" AS ENUM ('SOLO', 'TEAM', 'BUSINESS');

ALTER TABLE "subscriptions" ADD COLUMN "plan_type_new" "SubscriptionPlan_new";

UPDATE "subscriptions" SET "plan_type_new" = CASE
  WHEN "plan_type"::text = 'FREE' THEN 'SOLO'::"SubscriptionPlan_new"
  WHEN "plan_type"::text = 'SOLO' THEN 'SOLO'::"SubscriptionPlan_new"
  WHEN "plan_type"::text = 'SMALL_TEAM' THEN 'TEAM'::"SubscriptionPlan_new"
  ELSE 'SOLO'::"SubscriptionPlan_new"
END;

ALTER TABLE "subscriptions" ALTER COLUMN "plan_type_new" SET NOT NULL;
ALTER TABLE "subscriptions" DROP COLUMN "plan_type";
ALTER TABLE "subscriptions" RENAME COLUMN "plan_type_new" TO "plan_type";

DROP TYPE "SubscriptionPlan";
ALTER TYPE "SubscriptionPlan_new" RENAME TO "SubscriptionPlan";
