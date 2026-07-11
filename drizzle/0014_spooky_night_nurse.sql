DROP INDEX IF EXISTS "inv_store_ingredient_idx";--> statement-breakpoint
ALTER TABLE "inventory" ALTER COLUMN "current_quantity" SET DATA TYPE numeric(12, 4);--> statement-breakpoint
ALTER TABLE "inventory_events" ALTER COLUMN "quantity_change" SET DATA TYPE numeric(12, 4);--> statement-breakpoint
-- 유니크 인덱스 생성 전, 과거 레이스로 생긴 중복 (store_id, ingredient_id) 행을 병합한다.
-- 각 (store, ingredient)에서 가장 오래된 행에 수량을 합산하고 나머지는 삭제.
UPDATE "inventory" inv
SET "current_quantity" = agg.total
FROM (
  SELECT "store_id", "ingredient_id", SUM("current_quantity"::numeric) AS total
  FROM "inventory"
  GROUP BY "store_id", "ingredient_id"
  HAVING COUNT(*) > 1
) agg,
LATERAL (
  SELECT "id"
  FROM "inventory" i2
  WHERE i2."store_id" = agg."store_id" AND i2."ingredient_id" = agg."ingredient_id"
  ORDER BY i2."last_updated" ASC, i2."id" ASC
  LIMIT 1
) keep
WHERE inv."id" = keep."id";--> statement-breakpoint
DELETE FROM "inventory"
WHERE "id" IN (
  SELECT "id" FROM (
    SELECT "id", ROW_NUMBER() OVER (
      PARTITION BY "store_id", "ingredient_id"
      ORDER BY "last_updated" ASC, "id" ASC
    ) AS rn
    FROM "inventory"
  ) t WHERE t.rn > 1
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "inv_store_ingredient_unique" ON "inventory" USING btree ("store_id","ingredient_id");