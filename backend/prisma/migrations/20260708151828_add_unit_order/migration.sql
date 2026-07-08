-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Unit" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "address" TEXT NOT NULL,
    "apartmentNo" TEXT NOT NULL,
    "name" TEXT,
    "tenantName" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Unit" ("address", "apartmentNo", "createdAt", "id", "name", "tenantName", "updatedAt") SELECT "address", "apartmentNo", "createdAt", "id", "name", "tenantName", "updatedAt" FROM "Unit";
DROP TABLE "Unit";
ALTER TABLE "new_Unit" RENAME TO "Unit";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
