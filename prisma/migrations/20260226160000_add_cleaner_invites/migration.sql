CREATE TABLE IF NOT EXISTS "cleaner_invites" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "business_id" TEXT NOT NULL,
    "invited_by" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cleaner_invites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "cleaner_invites_token_key" ON "cleaner_invites"("token");
CREATE INDEX IF NOT EXISTS "cleaner_invites_token_idx" ON "cleaner_invites"("token");
CREATE INDEX IF NOT EXISTS "cleaner_invites_business_id_idx" ON "cleaner_invites"("business_id");
CREATE INDEX IF NOT EXISTS "cleaner_invites_expires_at_idx" ON "cleaner_invites"("expires_at");
