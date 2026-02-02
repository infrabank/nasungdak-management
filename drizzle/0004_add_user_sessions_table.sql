-- Refresh Token 저장을 위한 사용자 세션 테이블
CREATE TABLE IF NOT EXISTS "user_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "refresh_token" varchar(500) NOT NULL,
  "device_info" varchar(255),
  "ip_address" varchar(45),
  "expires_at" timestamp NOT NULL,
  "last_used_at" timestamp,
  "revoked_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS "user_sessions_user_id_idx" ON "user_sessions" ("user_id");
CREATE INDEX IF NOT EXISTS "user_sessions_refresh_token_idx" ON "user_sessions" ("refresh_token");
CREATE INDEX IF NOT EXISTS "user_sessions_expires_at_idx" ON "user_sessions" ("expires_at");
