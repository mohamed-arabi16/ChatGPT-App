/**
 * Unit tests for document checklist tool
 */

import Database from 'better-sqlite3';
import { ProgramRepository } from '../../src/db/repositories/program.repository';
import { runMigrationsOnTestDb } from '../../src/db/migrate';
import { 
  buildDocumentChecklist, 
  BuildDocumentChecklistInput 
} from '../../src/tools/build-document-checklist';

describe('buildDocumentChecklist', () => {
  let db: Database.Database;
  let repository: ProgramRepository;

  beforeAll(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    runMigrationsOnTestDb(db);
    repository = new ProgramRepository(db);
    seedTestData(db);
  });

  afterAll(() => {
    db.close();
  });

  it('should return error for non-existent program', () => {
    const input: BuildDocumentChecklistInput = {
      profile: {
        nationality: 'Egyptian',
        current_education_level: 'high_school',
        desired_degree_level: 'bachelor',
      },
      program_id: 'non-existent',
    };

    const result = buildDocumentChecklist(input, repository);

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('PROGRAM_NOT_FOUND');
  });

  it('should return document checklist for bachelor program', () => {
    const input: BuildDocumentChecklistInput = {
      profile: {
        nationality: 'Egyptian',
        current_education_level: 'high_school',
        desired_degree_level: 'bachelor',
      },
      program_id: 'prog-bachelor',
    };

    const result = buildDocumentChecklist(input, repository);

    expect(result.success).toBe(true);
    expect(result.data?.items.length).toBeGreaterThan(0);
  });

  it('should include Arabic and English labels', () => {
    const input: BuildDocumentChecklistInput = {
      profile: {
        nationality: 'Egyptian',
        current_education_level: 'high_school',
        desired_degree_level: 'bachelor',
      },
      program_id: 'prog-bachelor',
    };

    const result = buildDocumentChecklist(input, repository);

    expect(result.success).toBe(true);
    expect(result.data?.items.every(item => item.label_ar && item.label_en)).toBe(true);
  });

  it('should include why_needed explanations', () => {
    const input: BuildDocumentChecklistInput = {
      profile: {
        nationality: 'Egyptian',
        current_education_level: 'high_school',
        desired_degree_level: 'bachelor',
      },
      program_id: 'prog-bachelor',
    };

    const result = buildDocumentChecklist(input, repository);

    expect(result.success).toBe(true);
    expect(result.data?.items.every(item => item.why_needed_ar && item.why_needed_en)).toBe(true);
  });

  it('should indicate translation and notarization requirements', () => {
    const input: BuildDocumentChecklistInput = {
      profile: {
        nationality: 'Egyptian',
        current_education_level: 'high_school',
        desired_degree_level: 'bachelor',
      },
      program_id: 'prog-bachelor',
    };

    const result = buildDocumentChecklist(input, repository);

    expect(result.success).toBe(true);
    expect(result.data?.items.every(item => 
      typeof item.translation_required === 'boolean' &&
      typeof item.notarization_required === 'boolean'
    )).toBe(true);
  });

  it('should sort required documents first', () => {
    const input: BuildDocumentChecklistInput = {
      profile: {
        nationality: 'Egyptian',
        current_education_level: 'high_school',
        desired_degree_level: 'bachelor',
      },
      program_id: 'prog-bachelor',
    };

    const result = buildDocumentChecklist(input, repository);

    expect(result.success).toBe(true);
    
    // Check that required items come before recommended
    const requiredIndex = result.data?.items.findIndex(i => i.priority === 'required');
    const recommendedIndex = result.data?.items.findIndex(i => i.priority === 'recommended');
    
    if (requiredIndex !== undefined && recommendedIndex !== undefined && 
        requiredIndex !== -1 && recommendedIndex !== -1) {
      expect(requiredIndex).toBeLessThan(recommendedIndex);
    }
  });

  it('should include estimated days to obtain', () => {
    const input: BuildDocumentChecklistInput = {
      profile: {
        nationality: 'Egyptian',
        current_education_level: 'high_school',
        desired_degree_level: 'bachelor',
      },
      program_id: 'prog-bachelor',
    };

    const result = buildDocumentChecklist(input, repository);

    expect(result.success).toBe(true);
    expect(result.data?.items.some(item => item.estimated_days !== null)).toBe(true);
  });

  it('should include apostille/attestation notes', () => {
    const input: BuildDocumentChecklistInput = {
      profile: {
        nationality: 'Egyptian',
        current_education_level: 'high_school',
        desired_degree_level: 'bachelor',
      },
      program_id: 'prog-bachelor',
    };

    const result = buildDocumentChecklist(input, repository);

    expect(result.success).toBe(true);
    expect(result.data?.items.some(item => item.apostille_notes !== null)).toBe(true);
  });
});

function seedTestData(db: Database.Database) {
  // Insert test university
  db.prepare(`
    INSERT INTO universities (id, name_ar, name_en, city, website)
    VALUES ('test-uni', 'جامعة اختبارية', 'Test University', 'Istanbul', 'https://test.edu')
  `).run();

  // Insert bachelor program
  db.prepare(`
    INSERT INTO programs (id, university_id, program_name_ar, program_name_en, degree_level, language, city, tuition_min, tuition_max, currency, intakes)
    VALUES ('prog-bachelor', 'test-uni', 'علوم الحاسوب', 'Computer Science', 'bachelor', 'en', 'Istanbul', 5000, 6000, 'USD', '["September"]')
  `).run();

  // Insert document templates
  db.prepare(`
    INSERT INTO document_templates (id, doc_key, label_ar, label_en, translation_required_default, notarization_required_default, estimated_days_to_obtain)
    VALUES 
      ('doc-1', 'high_school_diploma', 'شهادة الثانوية العامة', 'High School Diploma', 1, 1, 7),
      ('doc-2', 'passport_copy', 'صورة جواز السفر', 'Passport Copy', 0, 0, 1),
      ('doc-3', 'personal_photo', 'صورة شخصية', 'Personal Photo', 0, 0, 1)
  `).run();

  // Link documents to program
  db.prepare(`
    INSERT INTO program_document_rules (id, program_id, doc_key, required_flag)
    VALUES 
      ('pdr-1', 'prog-bachelor', 'high_school_diploma', 1),
      ('pdr-2', 'prog-bachelor', 'passport_copy', 1),
      ('pdr-3', 'prog-bachelor', 'personal_photo', 0)
  `).run();
}
