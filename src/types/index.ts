/**
 * Core type definitions for UniTR Admissions Assistant
 * Based on PRD Section 6: Data Model
 */

// =============================================================================
// Database Entities
// =============================================================================

export interface University {
  id: string;
  name_ar: string;
  name_en: string;
  city: string;
  website: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Program {
  id: string;
  university_id: string;
  program_name_ar: string;
  program_name_en: string;
  degree_level: DegreeLevel;
  language: ProgramLanguage;
  city: string;
  tuition_min: number;
  tuition_max: number;
  currency: string;
  intakes: string; // JSON array of months, e.g., '["September", "February"]'
  active_flag: boolean;
  created_at: string;
  updated_at: string;
}

export interface Requirement {
  id: string;
  program_id: string | null; // null for university-level requirements
  university_id: string;
  applicant_category: ApplicantCategory;
  rule_type: RuleType;
  rule_value: string; // JSON or plain text value
  human_text_ar: string;
  human_text_en: string;
  required_flag: boolean;
  created_at: string;
  updated_at: string;
}

export interface DocumentTemplate {
  id: string;
  doc_key: string;
  label_ar: string;
  label_en: string;
  translation_required_default: boolean;
  notarization_required_default: boolean;
  notes_ar: string | null;
  notes_en: string | null;
  estimated_days_to_obtain: number | null;
  created_at: string;
  updated_at: string;
}

export interface ProgramDocumentRule {
  id: string;
  program_id: string;
  doc_key: string;
  required_flag: boolean;
  translation_required: boolean | null; // null = use default
  notarization_required: boolean | null; // null = use default
  notes_ar: string | null;
  notes_en: string | null;
  created_at: string;
  updated_at: string;
}

export interface SourceReference {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  title: string;
  url: string | null;
  captured_at: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Verification {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  last_verified_at: string;
  verified_by: string;
  verification_notes: string | null;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// User Entities (Optional in MVP)
// =============================================================================

export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface StudentProfile {
  id: string;
  user_id: string | null; // null for anonymous
  nationality: string;
  current_education_level: EducationLevel;
  desired_degree_level: DegreeLevel;
  major_keywords: string; // JSON array
  preferred_language: ProgramLanguage;
  budget_min: number | null;
  budget_max: number | null;
  city_preference: string | null;
  intake_preference: IntakePreference;
  created_at: string;
  updated_at: string;
}

export interface SavedShortlist {
  id: string;
  user_id: string;
  program_ids: string; // JSON array
  created_at: string;
  updated_at: string;
}

export interface SavedPlan {
  id: string;
  user_id: string;
  program_id: string;
  checklist_snapshot: string; // JSON
  timeline_snapshot: string; // JSON
  created_at: string;
  updated_at: string;
}

// =============================================================================
// Enums and Types
// =============================================================================

export type DegreeLevel = 'bachelor' | 'master' | 'phd' | 'associate';

export type ProgramLanguage = 'en' | 'tr' | 'ar' | 'mixed';

export type ApplicantCategory = 'international' | 'turkish' | 'all';

export type RuleType = 
  | 'gpa_minimum'
  | 'exam_score' 
  | 'language_proficiency'
  | 'portfolio_required'
  | 'interview_required'
  | 'work_experience'
  | 'other';

export type EntityType = 
  | 'university' 
  | 'program' 
  | 'requirement' 
  | 'document_template'
  | 'program_document_rule';

export type EducationLevel = 'high_school' | 'bachelor' | 'master' | 'phd';

export type IntakePreference = 'fall' | 'spring' | 'any';

export type EligibilityStatus = 'likely_eligible' | 'needs_review' | 'unlikely';

// =============================================================================
// Tool Input/Output Types (shared types used by tools)
// =============================================================================

export interface StudentProfileInput {
  nationality: string;
  current_education_level: EducationLevel;
  desired_degree_level: DegreeLevel;
  major_keywords: string[];
  preferred_language: ProgramLanguage;
  budget_min?: number;
  budget_max?: number;
  city_preference?: string;
  intake_preference: IntakePreference;
}

export interface ProgramFilters {
  degree_level?: DegreeLevel;
  language?: ProgramLanguage;
  city?: string;
  budget_min?: number;
  budget_max?: number;
  university_id?: string;
}

export interface ProgramSearchResult {
  id: string;
  university_name_ar: string;
  university_name_en: string;
  program_name_ar: string;
  program_name_en: string;
  degree_level: DegreeLevel;
  language: ProgramLanguage;
  city: string;
  tuition_min: number;
  tuition_max: number;
  currency: string;
  intakes: string[];
  scholarship_notes: string | null;
  last_verified_at: string | null;
  source_references: SourceReferenceOutput[];
  verification_status: 'verified' | 'needs_verification' | 'outdated';
}

export interface SourceReferenceOutput {
  title: string;
  url: string | null;
  captured_at: string;
}

export interface ProgramDetailOutput {
  id: string;
  university: {
    id: string;
    name_ar: string;
    name_en: string;
    city: string;
    website: string | null;
  };
  program_name_ar: string;
  program_name_en: string;
  degree_level: DegreeLevel;
  language: ProgramLanguage;
  city: string;
  tuition_min: number;
  tuition_max: number;
  currency: string;
  intakes: string[];
  requirements: RequirementOutput[];
  documents: DocumentOutput[];
  sources: SourceReferenceOutput[];
  last_verified_at: string | null;
  verification_status: 'verified' | 'needs_verification' | 'outdated';
}

export interface RequirementOutput {
  id: string;
  rule_type: RuleType;
  rule_value: string;
  text_ar: string;
  text_en: string;
  required: boolean;
  applicant_category: ApplicantCategory;
}

export interface DocumentOutput {
  doc_key: string;
  label_ar: string;
  label_en: string;
  required: boolean;
  translation_required: boolean;
  notarization_required: boolean;
  notes_ar: string | null;
  notes_en: string | null;
  estimated_days: number | null;
}

export interface EligibilitySnapshotOutput {
  status: EligibilityStatus;
  reasons: EligibilityReason[];
  missing_info: string[];
  assumptions: string[];
  disclaimer: string;
}

export interface EligibilityReason {
  rule_type: RuleType;
  passed: boolean;
  reason_ar: string;
  reason_en: string;
  data_driven: boolean;
}

export interface ChecklistItemOutput {
  doc_key: string;
  label_ar: string;
  label_en: string;
  applies_to: string;
  required: boolean;
  translation_required: boolean;
  notarization_required: boolean;
  apostille_notes: string | null;
  why_needed_ar: string;
  why_needed_en: string;
  priority: 'required' | 'recommended';
  estimated_days: number | null;
}

export interface DocumentChecklistOutput {
  items: ChecklistItemOutput[];
  unknowns: string[];
  assumptions: string[];
}

export interface TimelineWeek {
  week_number: number;
  start_date: string;
  end_date: string;
  tasks: TimelineTask[];
}

export interface TimelineTask {
  doc_key: string;
  task_ar: string;
  task_en: string;
  is_critical_path: boolean;
  estimated_days: number;
}

export interface TimelineOutput {
  weeks: TimelineWeek[];
  critical_path_items: string[];
  target_intake: string;
  assumptions: string[];
}

// =============================================================================
// API Response Types
// =============================================================================

export interface ToolResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message_ar: string;
    message_en: string;
  };
  metadata?: {
    timestamp: string;
    assumptions?: string[];
  };
}
