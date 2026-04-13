-- Only ADMIN group and STAFF membership type should be built-in
-- Everything else is editable/deletable

-- Fix groups: only ADMIN is built-in
UPDATE "Group" SET "isBuiltIn" = 0 WHERE "name" != 'ADMIN';

-- Fix membership types: only STAFF is built-in
UPDATE "MembershipType" SET "isBuiltIn" = 0 WHERE "name" != 'STAFF';
