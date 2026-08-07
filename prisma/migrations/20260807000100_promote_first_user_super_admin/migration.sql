-- The platform's original first user (the account owner who bootstrapped
-- Falcon Unlocker, per User.isFirstUser) becomes the Super Admin — every
-- other existing ADMIN/MODERATOR stays exactly as they were, scoped to the
-- Falcon Unlocker tenant. requireAdmin/requireStaff both accept SUPER_ADMIN
-- too, so this never removes access this account already had.
UPDATE "User" SET "role" = 'SUPER_ADMIN' WHERE "isFirstUser" = true;
