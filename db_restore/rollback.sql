-- Rollback of the database when the system goes back to a previous version.
-- Only what would break the previous version: new tables, nullable columns and data it doesn't read
-- stay (they don't bother it, and a later deploy finds them in place).
-- Run it BEFORE deploying the previous version. One section per version to go back to, newest first.



-- Back to v1.0.0 -------------------------------------------------------------------------------------------

-- Users: v1.0.0 reads and writes users.role (0 admin, 1 operator, 2 viewer), dropped by the deploy.
-- Rebuilt from user_roles (kept, for the next deploy): admin -> 0; manager, veterinarian or
-- technician -> 1 (operator: the closest to what they did); viewer or no roles -> 2.
-- Works also if the deploy stopped after step 1 (the column is still there).
ALTER TABLE users ADD COLUMN IF NOT EXISTS role integer;

UPDATE users u SET role = CASE
    WHEN EXISTS (SELECT 1 FROM user_roles r WHERE r.user_id = u.id AND r.role = 'admin') THEN 0
    WHEN EXISTS (SELECT 1 FROM user_roles r WHERE r.user_id = u.id
                 AND r.role IN ('manager', 'veterinarian', 'technician')) THEN 1
    ELSE 2
  END;

ALTER TABLE users ALTER COLUMN role SET NOT NULL;

-- Sessions: the tokens of the new version carry `roles` and no `role`. v1.0.0 compares
-- `role > required` and, with role undefined, lets everyone in as admin. Deleting the refresh tokens
-- makes everyone log in again (new tokens with role). The access tokens already issued live up to
-- 15 more minutes: ALSO change JWT_SECRET in the .env of the server when deploying v1.0.0, so they
-- stop being valid at once.
DELETE FROM refresh_tokens;
