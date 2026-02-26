-- Add optional phone to users (for WhatsApp OTP - cleaners; owners use Business.phone)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" TEXT;

-- Table for password reset OTP (WhatsApp-based)
CREATE TABLE IF NOT EXISTS "password_reset_otps" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "otp_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "password_reset_otps_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "password_reset_otps_phone_idx" ON "password_reset_otps"("phone");
CREATE INDEX IF NOT EXISTS "password_reset_otps_expires_at_idx" ON "password_reset_otps"("expires_at");
