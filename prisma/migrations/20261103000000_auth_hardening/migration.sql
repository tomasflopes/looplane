-- Emails are compared case-insensitively by normalising them on write.
UPDATE "User" SET "email" = lower("email");

-- Failed-login counter used for rate limiting password sign-ins.
CREATE TABLE "LoginThrottle" (
    "key" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginThrottle_pkey" PRIMARY KEY ("key")
);
