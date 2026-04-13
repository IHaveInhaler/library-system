-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT,
    "order" INTEGER NOT NULL DEFAULT 999,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- Seed built-in categories
INSERT INTO "Category" ("id", "name", "label", "order", "createdAt", "updatedAt") VALUES
  ('cat-fiction',     'FICTION',     'Fiction',       1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat-nonfiction',  'NON_FICTION', 'Non-Fiction',   2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat-science',     'SCIENCE',     'Science',       3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat-history',     'HISTORY',     'History',       4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat-biography',   'BIOGRAPHY',   'Biography',     5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat-technology',  'TECHNOLOGY',  'Technology',     6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat-arts',        'ARTS',        'Arts',          7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat-children',    'CHILDREN',    'Children',      8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat-reference',   'REFERENCE',   'Reference',     9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat-other',       'OTHER',       'Other',        10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
