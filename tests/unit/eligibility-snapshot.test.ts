/**
 * Unit tests for eligibility snapshot tool
 */

import Database from 'better-sqlite3';
import { ProgramRepository } from '../../src/db/repositories/program.repository';
import { runMigrationsOnTestDb } from '../../src/db/migrate';
import { 
  buildEligibilitySnapshot, 
  BuildEligibilitySnapshotInput 
} from '../../src/tools/build-eligibility-snapshot';

describe('buildEligibilitySnapshot', () => {
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
    const input: BuildEligibilitySnapshotInput = {
      profile: {
        nationality: 'Egyptian',
        current_education_level: 'high_school',
        desired_degree_level: 'bachelor',
      },
      program_id: 'non-existent',
    };

    const result = buildEligibilitySnapshot(input, repository);

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('PROGRAM_NOT_FOUND');
  });

  it('should evaluate education level requirement correctly', () => {
    const input: BuildEligibilitySnapshotInput = {
      profile: {
        nationality: 'Egyptian',
        current_education_level: 'high_school',
        desired_degree_level: 'bachelor',
      },
      program_id: 'prog-bachelor',
    };

    const result = buildEligibilitySnapshot(input, repository);

    expect(result.success).toBe(true);
    expect(result.data?.reasons.some(r => 
      r.reason_en.includes('Education level') || r.reason_en.includes('education level')
    )).toBe(true);
  });

  it('should mark as unlikely when education level is insufficient for master', () => {
    const input: BuildEligibilitySnapshotInput = {
      profile: {
        nationality: 'Egyptian',
        current_education_level: 'high_school',
        desired_degree_level: 'master',
      },
      program_id: 'prog-master',
    };

    const result = buildEligibilitySnapshot(input, repository);

    expect(result.success).toBe(true);
    expect(result.data?.status).toBe('unlikely');
  });

  it('should evaluate GPA requirement when provided', () => {
    const input: BuildEligibilitySnapshotInput = {
      profile: {
        nationality: 'Egyptian',
        current_education_level: 'high_school',
        desired_degree_level: 'bachelor',
        gpa: 75,
      },
      program_id: 'prog-bachelor',
    };

    const result = buildEligibilitySnapshot(input, repository);

    expect(result.success).toBe(true);
    expect(result.data?.reasons.some(r => r.rule_type === 'gpa_minimum')).toBe(true);
  });

  it('should flag missing GPA as info needed', () => {
    const input: BuildEligibilitySnapshotInput = {
      profile: {
        nationality: 'Egyptian',
        current_education_level: 'high_school',
        desired_degree_level: 'bachelor',
      },
      program_id: 'prog-bachelor',
    };

    const result = buildEligibilitySnapshot(input, repository);

    expect(result.success).toBe(true);
    expect(result.data?.missing_info.some(m => m.includes('GPA'))).toBe(true);
  });

  it('should always include disclaimer', () => {
    const input: BuildEligibilitySnapshotInput = {
      profile: {
        nationality: 'Egyptian',
        current_education_level: 'high_school',
        desired_degree_level: 'bachelor',
      },
      program_id: 'prog-bachelor',
    };

    const result = buildEligibilitySnapshot(input, repository);

    expect(result.success).toBe(true);
    expect(result.data?.disclaimer).toBeTruthy();
    expect(result.data?.disclaimer).toContain('not a final');
  });

  it('should be data-driven and never fabricate requirements', () => {
    const input: BuildEligibilitySnapshotInput = {
      profile: {
        nationality: 'Egyptian',
        current_education_level: 'high_school',
        desired_degree_level: 'bachelor',
        gpa: 80,
      },
      program_id: 'prog-bachelor',
    };

    const result = buildEligibilitySnapshot(input, repository);

    expect(result.success).toBe(true);
    // All reasons should be marked as data-driven
    expect(result.data?.reasons.every(r => r.data_driven === true)).toBe(true);
  });

  // New tests for missing_fields machine-readable list
  it('should include machine-readable missing_fields list', () => {
    const input: BuildEligibilitySnapshotInput = {
      profile: {
        nationality: 'Egyptian',
        current_education_level: 'high_school',
        desired_degree_level: 'bachelor',
      },
      program_id: 'prog-bachelor',
    };

    const result = buildEligibilitySnapshot(input, repository);

    expect(result.success).toBe(true);
    expect(result.data?.missing_fields).toBeDefined();
    expect(Array.isArray(result.data?.missing_fields)).toBe(true);
  });

  it('should include gpa in missing_fields when GPA not provided', () => {
    const input: BuildEligibilitySnapshotInput = {
      profile: {
        nationality: 'Egyptian',
        current_education_level: 'high_school',
        desired_degree_level: 'bachelor',
      },
      program_id: 'prog-bachelor',
    };

    const result = buildEligibilitySnapshot(input, repository);

    expect(result.success).toBe(true);
    expect(result.data?.missing_fields).toContain('gpa');
  });

  it('should include english_score in missing_fields when English score not provided', () => {
    const input: BuildEligibilitySnapshotInput = {
      profile: {
        nationality: 'Egyptian',
        current_education_level: 'high_school',
        desired_degree_level: 'bachelor',
        gpa: 80, // GPA provided
      },
      program_id: 'prog-bachelor',
    };

    const result = buildEligibilitySnapshot(input, repository);

    expect(result.success).toBe(true);
    expect(result.data?.missing_fields).toContain('english_score');
  });

  it('should return needs_review (not unlikely) when only data is missing', () => {
    const input: BuildEligibilitySnapshotInput = {
      profile: {
        nationality: 'Egyptian',
        current_education_level: 'high_school',
        desired_degree_level: 'bachelor',
        // No GPA or English score provided
      },
      program_id: 'prog-bachelor',
    };

    const result = buildEligibilitySnapshot(input, repository);

    expect(result.success).toBe(true);
    // Missing data should NOT result in "unlikely"
    expect(result.data?.status).toBe('needs_review');
    expect(result.data?.missing_fields.length).toBeGreaterThan(0);
  });

  it('should return unlikely only for explicit disqualifiers like GPA below min', () => {
    const input: BuildEligibilitySnapshotInput = {
      profile: {
        nationality: 'Egyptian',
        current_education_level: 'high_school',
        desired_degree_level: 'bachelor',
        gpa: 30, // Well below minimum of 60
        english_score: { type: 'ielts', score: 6.0 },
      },
      program_id: 'prog-bachelor',
    };

    const result = buildEligibilitySnapshot(input, repository);

    expect(result.success).toBe(true);
    expect(result.data?.status).toBe('unlikely');
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

  // Insert master program
  db.prepare(`
    INSERT INTO programs (id, university_id, program_name_ar, program_name_en, degree_level, language, city, tuition_min, tuition_max, currency, intakes)
    VALUES ('prog-master', 'test-uni', 'ماجستير علوم الحاسوب', 'Computer Science MS', 'master', 'en', 'Istanbul', 10000, 15000, 'USD', '["September"]')
  `).run();

  // Insert GPA requirement for bachelor
  db.prepare(`
    INSERT INTO requirements (id, program_id, university_id, applicant_category, rule_type, rule_value, human_text_ar, human_text_en, required_flag)
    VALUES ('req-1', 'prog-bachelor', 'test-uni', 'international', 'gpa_minimum', '60', 'الحد الأدنى للمعدل 60%', 'Minimum GPA of 60%', 1)
  `).run();

  // Insert language requirement
  db.prepare(`
    INSERT INTO requirements (id, program_id, university_id, applicant_category, rule_type, rule_value, human_text_ar, human_text_en, required_flag)
    VALUES ('req-2', 'prog-bachelor', 'test-uni', 'international', 'language_proficiency', '{"type":"english","ielts":5.5,"toefl":70}', 'إتقان اللغة الإنجليزية', 'English proficiency required', 1)
  `).run();

  // Insert GPA requirement for master
  db.prepare(`
    INSERT INTO requirements (id, program_id, university_id, applicant_category, rule_type, rule_value, human_text_ar, human_text_en, required_flag)
    VALUES ('req-3', 'prog-master', 'test-uni', 'international', 'gpa_minimum', '2.5', 'الحد الأدنى للمعدل 2.5', 'Minimum GPA of 2.5/4.0', 1)
  `).run();
}
