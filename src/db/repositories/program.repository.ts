/**
 * Repository for program-related database operations
 */

import Database from 'better-sqlite3';
import { getDatabase } from '../connection';
import {
  Program,
  ProgramSearchResult,
  ProgramDetailOutput,
  ProgramFilters,
  StudentProfileInput,
  RequirementOutput,
  DocumentOutput,
  SourceReferenceOutput,
} from '../../types';

export class ProgramRepository {
  private db: Database.Database;

  constructor(db?: Database.Database) {
    this.db = db || getDatabase();
  }

  /**
   * Search programs with filters
   */
  searchPrograms(
    profile: Partial<StudentProfileInput>,
    filters?: ProgramFilters
  ): ProgramSearchResult[] {
    let query = `
      SELECT 
        p.id,
        p.program_name_ar,
        p.program_name_en,
        p.degree_level,
        p.language,
        p.city,
        p.tuition_min,
        p.tuition_max,
        p.currency,
        p.intakes,
        u.id as university_id,
        u.name_ar as university_name_ar,
        u.name_en as university_name_en,
        v.last_verified_at
      FROM programs p
      JOIN universities u ON p.university_id = u.id
      LEFT JOIN verifications v ON v.entity_type = 'program' AND v.entity_id = p.id
      WHERE p.active_flag = 1
    `;

    const params: any[] = [];

    // Apply profile filters
    if (profile.desired_degree_level) {
      query += ` AND p.degree_level = ?`;
      params.push(profile.desired_degree_level);
    }

    if (profile.preferred_language && profile.preferred_language !== 'mixed') {
      query += ` AND (p.language = ? OR p.language = 'mixed')`;
      params.push(profile.preferred_language);
    }

    if (profile.city_preference) {
      query += ` AND LOWER(p.city) = LOWER(?)`;
      params.push(profile.city_preference);
    }

    if (profile.budget_max) {
      query += ` AND p.tuition_min <= ?`;
      params.push(profile.budget_max);
    }

    if (profile.budget_min) {
      query += ` AND p.tuition_max >= ?`;
      params.push(profile.budget_min);
    }

    // Apply additional filters
    if (filters?.degree_level) {
      query += ` AND p.degree_level = ?`;
      params.push(filters.degree_level);
    }

    if (filters?.language) {
      query += ` AND p.language = ?`;
      params.push(filters.language);
    }

    if (filters?.city) {
      query += ` AND LOWER(p.city) = LOWER(?)`;
      params.push(filters.city);
    }

    if (filters?.university_id) {
      query += ` AND p.university_id = ?`;
      params.push(filters.university_id);
    }

    // Search by keywords in program name
    if (profile.major_keywords && profile.major_keywords.length > 0) {
      const keywordConditions = profile.major_keywords.map(() => 
        `(LOWER(p.program_name_en) LIKE ? OR LOWER(p.program_name_ar) LIKE ?)`
      ).join(' OR ');
      query += ` AND (${keywordConditions})`;
      
      for (const keyword of profile.major_keywords) {
        const searchTerm = `%${keyword.toLowerCase()}%`;
        params.push(searchTerm, searchTerm);
      }
    }

    query += ` ORDER BY p.tuition_min ASC`;

    const rows = this.db.prepare(query).all(...params) as any[];

    return rows.map(row => this.mapToSearchResult(row));
  }

  /**
   * Get detailed program information
   */
  getProgramDetail(programId: string): ProgramDetailOutput | null {
    const programQuery = `
      SELECT 
        p.*,
        u.id as university_id,
        u.name_ar as university_name_ar,
        u.name_en as university_name_en,
        u.city as university_city,
        u.website as university_website,
        v.last_verified_at
      FROM programs p
      JOIN universities u ON p.university_id = u.id
      LEFT JOIN verifications v ON v.entity_type = 'program' AND v.entity_id = p.id
      WHERE p.id = ?
    `;

    const row = this.db.prepare(programQuery).get(programId) as any;
    if (!row) return null;

    // Get requirements
    const requirements = this.getRequirements(programId);

    // Get documents
    const documents = this.getDocuments(programId);

    // Get sources
    const sources = this.getSources('program', programId);

    return {
      id: row.id,
      university: {
        id: row.university_id,
        name_ar: row.university_name_ar,
        name_en: row.university_name_en,
        city: row.university_city,
        website: row.university_website,
      },
      program_name_ar: row.program_name_ar,
      program_name_en: row.program_name_en,
      degree_level: row.degree_level,
      language: row.language,
      city: row.city,
      tuition_min: row.tuition_min,
      tuition_max: row.tuition_max,
      currency: row.currency,
      intakes: JSON.parse(row.intakes || '[]'),
      requirements,
      documents,
      sources,
      last_verified_at: row.last_verified_at,
      verification_status: this.getVerificationStatus(row.last_verified_at),
    };
  }

  /**
   * Get requirements for a program
   */
  getRequirements(programId: string): RequirementOutput[] {
    const query = `
      SELECT *
      FROM requirements
      WHERE program_id = ? OR (program_id IS NULL AND university_id = (
        SELECT university_id FROM programs WHERE id = ?
      ))
      ORDER BY required_flag DESC, rule_type
    `;

    const rows = this.db.prepare(query).all(programId, programId) as any[];

    return rows.map(row => ({
      id: row.id,
      rule_type: row.rule_type,
      rule_value: row.rule_value,
      text_ar: row.human_text_ar,
      text_en: row.human_text_en,
      required: row.required_flag === 1,
      applicant_category: row.applicant_category,
    }));
  }

  /**
   * Get documents for a program
   */
  getDocuments(programId: string): DocumentOutput[] {
    const query = `
      SELECT 
        dt.doc_key,
        dt.label_ar,
        dt.label_en,
        COALESCE(pdr.required_flag, 1) as required,
        COALESCE(pdr.translation_required, dt.translation_required_default) as translation_required,
        COALESCE(pdr.notarization_required, dt.notarization_required_default) as notarization_required,
        COALESCE(pdr.notes_ar, dt.notes_ar) as notes_ar,
        COALESCE(pdr.notes_en, dt.notes_en) as notes_en,
        dt.estimated_days_to_obtain
      FROM program_document_rules pdr
      JOIN document_templates dt ON pdr.doc_key = dt.doc_key
      WHERE pdr.program_id = ?
      ORDER BY pdr.required_flag DESC, dt.label_en
    `;

    const rows = this.db.prepare(query).all(programId) as any[];

    return rows.map(row => ({
      doc_key: row.doc_key,
      label_ar: row.label_ar,
      label_en: row.label_en,
      required: row.required === 1,
      translation_required: row.translation_required === 1,
      notarization_required: row.notarization_required === 1,
      notes_ar: row.notes_ar,
      notes_en: row.notes_en,
      estimated_days: row.estimated_days_to_obtain,
    }));
  }

  /**
   * Get source references for an entity
   */
  getSources(entityType: string, entityId: string): SourceReferenceOutput[] {
    const query = `
      SELECT title, url, captured_at
      FROM source_references
      WHERE entity_type = ? AND entity_id = ?
      ORDER BY captured_at DESC
    `;

    const rows = this.db.prepare(query).all(entityType, entityId) as any[];

    return rows.map(row => ({
      title: row.title,
      url: row.url,
      captured_at: row.captured_at,
    }));
  }

  /**
   * Get all cities with programs
   */
  getCities(): string[] {
    const query = `
      SELECT DISTINCT city FROM programs WHERE active_flag = 1 ORDER BY city
    `;
    const rows = this.db.prepare(query).all() as any[];
    return rows.map(row => row.city);
  }

  /**
   * Get all universities
   */
  getUniversities(): Array<{ id: string; name_ar: string; name_en: string; city: string }> {
    const query = `
      SELECT id, name_ar, name_en, city FROM universities ORDER BY name_en
    `;
    return this.db.prepare(query).all() as any[];
  }

  /**
   * Get program by ID (basic info)
   */
  getById(programId: string): Program | null {
    const query = `SELECT * FROM programs WHERE id = ?`;
    return this.db.prepare(query).get(programId) as Program | null;
  }

  private mapToSearchResult(row: any): ProgramSearchResult {
    const sources = this.getSources('program', row.id);
    
    return {
      id: row.id,
      university_name_ar: row.university_name_ar,
      university_name_en: row.university_name_en,
      program_name_ar: row.program_name_ar,
      program_name_en: row.program_name_en,
      degree_level: row.degree_level,
      language: row.language,
      city: row.city,
      tuition_min: row.tuition_min,
      tuition_max: row.tuition_max,
      currency: row.currency,
      intakes: JSON.parse(row.intakes || '[]'),
      scholarship_notes: null, // TODO: Add scholarship info
      last_verified_at: row.last_verified_at,
      source_references: sources,
      verification_status: this.getVerificationStatus(row.last_verified_at),
    };
  }

  private getVerificationStatus(lastVerifiedAt: string | null): 'verified' | 'needs_verification' | 'outdated' {
    if (!lastVerifiedAt) return 'needs_verification';
    
    const verifiedDate = new Date(lastVerifiedAt);
    const now = new Date();
    const sixMonthsAgo = new Date(now.setMonth(now.getMonth() - 6));
    
    if (verifiedDate < sixMonthsAgo) {
      return 'outdated';
    }
    return 'verified';
  }
}
