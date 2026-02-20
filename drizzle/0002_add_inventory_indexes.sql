CREATE INDEX IF NOT EXISTS "ah_store_id_idx" ON "alert_history" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ah_ingredient_id_idx" ON "alert_history" USING btree ("ingredient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ah_created_at_idx" ON "alert_history" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inv_store_id_idx" ON "inventory" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inv_ingredient_id_idx" ON "inventory" USING btree ("ingredient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inv_store_ingredient_idx" ON "inventory" USING btree ("store_id","ingredient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "iar_store_id_idx" ON "inventory_alert_rules" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "iar_ingredient_id_idx" ON "inventory_alert_rules" USING btree ("ingredient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "iar_deleted_at_idx" ON "inventory_alert_rules" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ie_store_id_idx" ON "inventory_events" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ie_ingredient_id_idx" ON "inventory_events" USING btree ("ingredient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ie_event_date_idx" ON "inventory_events" USING btree ("event_date" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ie_store_date_idx" ON "inventory_events" USING btree ("store_id","event_date" DESC NULLS LAST);