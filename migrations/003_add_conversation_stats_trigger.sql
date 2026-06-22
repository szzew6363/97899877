-- ============================================================
-- Migration 003 — Auto-update conversation stats on new messages
-- Created: 2025-01-01T02:00:00Z
-- Rollback: See 003_add_conversation_stats_trigger.down.sql
-- ============================================================

CREATE OR REPLACE FUNCTION update_conversation_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE conversations
    SET
      message_count            = message_count + 1,
      total_tokens             = total_tokens + COALESCE(NEW.total_tokens, 0),
      total_prompt_tokens      = total_prompt_tokens + COALESCE(NEW.prompt_tokens, 0),
      total_completion_tokens  = total_completion_tokens + COALESCE(NEW.completion_tokens, 0),
      last_message_at          = NEW.created_at,
      updated_at               = NOW()
    WHERE id = NEW.conversation_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER messages_update_conv_stats
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_stats();
