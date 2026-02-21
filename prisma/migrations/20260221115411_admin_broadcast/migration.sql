-- Add hidden flag to tests
ALTER TABLE "Test" ADD COLUMN IF NOT EXISTS "hidden" BOOLEAN NOT NULL DEFAULT false;

-- Broadcast messages
CREATE TABLE IF NOT EXISTS "BroadcastMessage" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdById" TEXT,

  CONSTRAINT "BroadcastMessage_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "BroadcastMessage"
  ADD CONSTRAINT "BroadcastMessage_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
