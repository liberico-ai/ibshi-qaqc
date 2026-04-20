-- Migration 003: Add is_active to sys_users

ALTER TABLE sys_users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
