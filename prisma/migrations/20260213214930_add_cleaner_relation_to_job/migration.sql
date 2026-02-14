-- First, clean up any invalid cleaner IDs (set to NULL if they don't exist in users table)
UPDATE "jobs" 
SET "cleaner_id" = NULL 
WHERE "cleaner_id" IS NOT NULL 
AND "cleaner_id" NOT IN (SELECT "id" FROM "users");

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_cleaner_id_fkey" FOREIGN KEY ("cleaner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
