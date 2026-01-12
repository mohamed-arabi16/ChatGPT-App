/**
 * Database migration script
 * Creates all required tables for UniTR Admissions Assistant
 */

import Database from 'better-sqlite3';
import { getDatabase, createTestDatabase } from './connection';

const SCHEMA_SQL = `
-- Universities table
CREATE TABLE IF NOT EXISTS universities (
  id TEXT PRIMARY KEY,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  city TEXT NOT NULL,
  website TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Programs table
CREATE TABLE IF NOT EXISTS programs (
  id TEXT PRIMARY KEY,
  university_id TEXT NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  program_name_ar TEXT NOT NULL,
  program_name_en TEXT NOT NULL,
  degree_level TEXT NOT NULL CHECK (degree_level IN ('bachelor', 'master', 'phd', 'associate')),
  language TEXT NOT NULL CHECK (language IN ('en', 'tr', 'ar', 'mixed')),
  city TEXT NOT NULL,
  tuition_min INTEGER NOT NULL,
  tuition_max INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  intakes TEXT NOT NULL DEFAULT '[]', -- JSON array of months
  active_flag INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Requirements table
CREATE TABLE IF NOT EXISTS requirements (
  id TEXT PRIMARY KEY,
  program_id TEXT REFERENCES programs(id) ON DELETE CASCADE,
  university_id TEXT NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  applicant_category TEXT NOT NULL CHECK (applicant_category IN ('international', 'turkish', 'all')),
  rule_type TEXT NOT NULL CHECK (rule_type IN ('gpa_minimum', 'exam_score', 'language_proficiency', 'portfolio_required', 'interview_required', 'work_experience', 'other')),
  rule_value TEXT NOT NULL,
  human_text_ar TEXT NOT NULL,
  human_text_en TEXT NOT NULL,
  required_flag INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Document templates table
CREATE TABLE IF NOT EXISTS document_templates (
  id TEXT PRIMARY KEY,
  doc_key TEXT NOT NULL UNIQUE,
  label_ar TEXT NOT NULL,
  label_en TEXT NOT NULL,
  translation_required_default INTEGER NOT NULL DEFAULT 0,
  notarization_required_default INTEGER NOT NULL DEFAULT 0,
  notes_ar TEXT,
  notes_en TEXT,
  estimated_days_to_obtain INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Program document rules table
CREATE TABLE IF NOT EXISTS program_document_rules (
  id TEXT PRIMARY KEY,
  program_id TEXT NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  doc_key TEXT NOT NULL REFERENCES document_templates(doc_key) ON DELETE CASCADE,
  required_flag INTEGER NOT NULL DEFAULT 1,
  translation_required INTEGER, -- NULL means use default
  notarization_required INTEGER, -- NULL means use default
  notes_ar TEXT,
  notes_en TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(program_id, doc_key)
);

-- Source references table
CREATE TABLE IF NOT EXISTS source_references (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('university', 'program', 'requirement', 'document_template', 'program_document_rule')),
  entity_id TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT,
  captured_at TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Verification table
CREATE TABLE IF NOT EXISTS verifications (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('university', 'program', 'requirement', 'document_template', 'program_document_rule')),
  entity_id TEXT NOT NULL,
  last_verified_at TEXT NOT NULL,
  verified_by TEXT NOT NULL,
  verification_notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(entity_type, entity_id)
);

-- Users table (optional in MVP)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Student profiles table
CREATE TABLE IF NOT EXISTS student_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  nationality TEXT NOT NULL,
  current_education_level TEXT NOT NULL CHECK (current_education_level IN ('high_school', 'bachelor', 'master', 'phd')),
  desired_degree_level TEXT NOT NULL CHECK (desired_degree_level IN ('bachelor', 'master', 'phd', 'associate')),
  major_keywords TEXT NOT NULL DEFAULT '[]', -- JSON array
  preferred_language TEXT NOT NULL CHECK (preferred_language IN ('en', 'tr', 'ar', 'mixed')),
  budget_min INTEGER,
  budget_max INTEGER,
  city_preference TEXT,
  intake_preference TEXT NOT NULL CHECK (intake_preference IN ('fall', 'spring', 'any')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Saved shortlists table
CREATE TABLE IF NOT EXISTS saved_shortlists (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  program_ids TEXT NOT NULL DEFAULT '[]', -- JSON array
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Saved plans table
CREATE TABLE IF NOT EXISTS saved_plans (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  program_id TEXT NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  checklist_snapshot TEXT NOT NULL, -- JSON
  timeline_snapshot TEXT NOT NULL, -- JSON
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_programs_university ON programs(university_id);
CREATE INDEX IF NOT EXISTS idx_programs_degree_level ON programs(degree_level);
CREATE INDEX IF NOT EXISTS idx_programs_language ON programs(language);
CREATE INDEX IF NOT EXISTS idx_programs_city ON programs(city);
CREATE INDEX IF NOT EXISTS idx_programs_tuition ON programs(tuition_min, tuition_max);
CREATE INDEX IF NOT EXISTS idx_programs_active ON programs(active_flag);

CREATE INDEX IF NOT EXISTS idx_requirements_program ON requirements(program_id);
CREATE INDEX IF NOT EXISTS idx_requirements_university ON requirements(university_id);

CREATE INDEX IF NOT EXISTS idx_program_document_rules_program ON program_document_rules(program_id);
CREATE INDEX IF NOT EXISTS idx_program_document_rules_doc_key ON program_document_rules(doc_key);

CREATE INDEX IF NOT EXISTS idx_source_references_entity ON source_references(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_verifications_entity ON verifications(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_student_profiles_user ON student_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_shortlists_user ON saved_shortlists(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_plans_user ON saved_plans(user_id);
`;

export function runMigrations(db?: Database.Database): void {
  const database = db || getDatabase();
  database.exec(SCHEMA_SQL);
  console.log('Database migrations completed successfully.');
}

export function runMigrationsOnTestDb(testDb: Database.Database): void {
  testDb.exec(SCHEMA_SQL);
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations();
}
