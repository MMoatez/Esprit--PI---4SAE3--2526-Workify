Priority & Worker Design
========================

Overview
--------
This document describes the conversation priority management worker, reminders and auto-archive behavior.

Data Model (example SQL)
------------------------
CREATE TABLE conversation (
  id UUID PRIMARY KEY,
  tenant_id UUID,
  assigned_user_id UUID,
  priority SMALLINT NOT NULL DEFAULT 2, -- 1:Low, 2:Medium, 3:High
  archived BOOLEAN NOT NULL DEFAULT false,
  last_message_at TIMESTAMP WITH TIME ZONE,
  last_user_response_at TIMESTAMP WITH TIME ZONE,
  unread_count INTEGER DEFAULT 0,
  reminder_sent_at TIMESTAMP WITH TIME ZONE,
  sort_key BIGINT,
  version INTEGER DEFAULT 0
);

Indexes:
CREATE INDEX ON conversation (tenant_id, archived, priority DESC, last_message_at DESC);
CREATE INDEX ON conversation (last_message_at);

Scheduled jobs table (for delayed checks)
CREATE TABLE scheduled_job (
  id BIGSERIAL PRIMARY KEY,
  conversation_id UUID NOT NULL,
  job_type TEXT NOT NULL, -- 'unanswered_check' | 'archive_check'
  due_at TIMESTAMP WITH TIME ZONE NOT NULL,
  payload JSONB,
  locked BOOLEAN DEFAULT false
);

Worker behaviour
----------------
- On MessageSent:
  - update conversation.last_message_at
  - if from user: set last_user_response_at, unread_count=0, priority=2, archived=false
  - insert or upsert scheduled_job for unanswered_check at now()+1min
  - insert or upsert scheduled_job for archive_check at now()+5min

- UnansweredCheck worker:
  - fetch conversation, re-evaluate conditions
  - if archived or last_user_response_at >= last_message_at -> skip
  - update priority=3, reminder_sent_at=now(), bump sort_key
  - send notification via NotificationService

- ArchiveCheck worker:
  - fetch conversation, if archived skip
  - if now() - last_message_at >= 5min -> set priority=1, archived=true, send archive notice

Idempotency & concurrency
-------------------------
- Workers must re-read conversation and use conditional UPDATE with WHERE to ensure state transitions are safe.
- Use optimistic locking via `version` or DB conditional clauses.

Configuration
-------------
- REMINDER_DELAY_MS = 60_000
- ARCHIVE_DELAY_MS = 300_000
- REMINDER_DEBOUNCE_MS = 60_000

Observability
-------------
- Emit metrics: reminders_sent, archives_per_minute, reminders_skipped_due_to_reply.
