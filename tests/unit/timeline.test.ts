/**
 * Unit tests for timeline tool
 */

import Database from 'better-sqlite3';
import { ProgramRepository } from '../../src/db/repositories/program.repository';
import { runMigrationsOnTestDb } from '../../src/db/migrate';
import { 
  buildTimeline, 
  BuildTimelineInput 
} from '../../src/tools/build-timeline';

describe('buildTimeline', () => {
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
    const input: BuildTimelineInput = {
      profile: {
        nationality: 'Egyptian',
        current_education_level: 'high_school',
        desired_degree_level: 'bachelor',
      },
      program_id: 'non-existent',
    };

    const result = buildTimeline(input, repository);

    expect(result.success).toBe(false);
  });

  it('should generate weekly schedule', () => {
    const input: BuildTimelineInput = {
      profile: {
        nationality: 'Egyptian',
        current_education_level: 'high_school',
        desired_degree_level: 'bachelor',
      },
      program_id: 'prog-bachelor',
    };

    const result = buildTimeline(input, repository);

    expect(result.success).toBe(true);
    expect(result.data?.weeks.length).toBeGreaterThan(0);
  });

  it('should include week numbers and dates', () => {
    const input: BuildTimelineInput = {
      profile: {
        nationality: 'Egyptian',
        current_education_level: 'high_school',
        desired_degree_level: 'bachelor',
      },
      program_id: 'prog-bachelor',
    };

    const result = buildTimeline(input, repository);

    expect(result.success).toBe(true);
    expect(result.data?.weeks.every(week => 
      typeof week.week_number === 'number' &&
      week.start_date &&
      week.end_date
    )).toBe(true);
  });

  it('should include tasks for each week', () => {
    const input: BuildTimelineInput = {
      profile: {
        nationality: 'Egyptian',
        current_education_level: 'high_school',
        desired_degree_level: 'bachelor',
      },
      program_id: 'prog-bachelor',
    };

    const result = buildTimeline(input, repository);

    expect(result.success).toBe(true);
    expect(result.data?.weeks.every(week => Array.isArray(week.tasks))).toBe(true);
  });

  it('should identify critical path items', () => {
    const input: BuildTimelineInput = {
      profile: {
        nationality: 'Egyptian',
        current_education_level: 'high_school',
        desired_degree_level: 'bachelor',
      },
      program_id: 'prog-bachelor',
    };

    const result = buildTimeline(input, repository);

    expect(result.success).toBe(true);
    expect(Array.isArray(result.data?.critical_path_items)).toBe(true);
  });

  it('should include target intake', () => {
    const input: BuildTimelineInput = {
      profile: {
        nationality: 'Egyptian',
        current_education_level: 'high_school',
        desired_degree_level: 'bachelor',
      },
      program_id: 'prog-bachelor',
      intake_target: 'September',
    };

    const result = buildTimeline(input, repository);

    expect(result.success).toBe(true);
    expect(result.data?.target_intake).toBeTruthy();
  });

  it('should list assumptions when data is incomplete', () => {
    const input: BuildTimelineInput = {
      profile: {
        nationality: 'Egyptian',
        current_education_level: 'high_school',
        desired_degree_level: 'bachelor',
      },
      program_id: 'prog-bachelor',
    };

    const result = buildTimeline(input, repository);

    expect(result.success).toBe(true);
    expect(Array.isArray(result.data?.assumptions)).toBe(true);
  });

  it('should include bilingual task descriptions', () => {
    const input: BuildTimelineInput = {
      profile: {
        nationality: 'Egyptian',
        current_education_level: 'high_school',
        desired_degree_level: 'bachelor',
      },
      program_id: 'prog-bachelor',
    };

    const result = buildTimeline(input, repository);

    expect(result.success).toBe(true);
    
    const hasTasksWithBilingualContent = result.data?.weeks.some(week => 
      week.tasks.some(task => task.task_ar && task.task_en)
    );
    expect(hasTasksWithBilingualContent).toBe(true);
  });

  it('should mark critical path tasks', () => {
    const input: BuildTimelineInput = {
      profile: {
        nationality: 'Egyptian',
        current_education_level: 'high_school',
        desired_degree_level: 'bachelor',
      },
      program_id: 'prog-bachelor',
    };

    const result = buildTimeline(input, repository);

    expect(result.success).toBe(true);
    
    const hasCriticalPathTasks = result.data?.weeks.some(week => 
      week.tasks.some(task => task.is_critical_path === true)
    );
    expect(hasCriticalPathTasks).toBe(true);
  });
});

function seedTestData(db: Database.Database) {
  // Insert test university
  db.prepare(`
    INSERT INTO universities (id, name_ar, name_en, city, website)
    VALUES ('test-uni', 'جامعة اختبارية', 'Test University', 'Istanbul', 'https://test.edu')
  `).run();

  // Insert bachelor program with intakes
  db.prepare(`
    INSERT INTO programs (id, university_id, program_name_ar, program_name_en, degree_level, language, city, tuition_min, tuition_max, currency, intakes)
    VALUES ('prog-bachelor', 'test-uni', 'علوم الحاسوب', 'Computer Science', 'bachelor', 'en', 'Istanbul', 5000, 6000, 'USD', '["September", "February"]')
  `).run();

  // Insert document templates
  db.prepare(`
    INSERT INTO document_templates (id, doc_key, label_ar, label_en, translation_required_default, notarization_required_default, estimated_days_to_obtain)
    VALUES 
      ('doc-1', 'high_school_diploma', 'شهادة الثانوية العامة', 'High School Diploma', 1, 1, 7),
      ('doc-2', 'high_school_transcript', 'كشف درجات الثانوية', 'High School Transcript', 1, 1, 5),
      ('doc-3', 'passport_copy', 'صورة جواز السفر', 'Passport Copy', 0, 0, 1),
      ('doc-4', 'english_proficiency', 'شهادة إتقان اللغة الإنجليزية', 'English Proficiency Certificate', 0, 0, 14)
  `).run();

  // Link documents to program
  db.prepare(`
    INSERT INTO program_document_rules (id, program_id, doc_key, required_flag)
    VALUES 
      ('pdr-1', 'prog-bachelor', 'high_school_diploma', 1),
      ('pdr-2', 'prog-bachelor', 'high_school_transcript', 1),
      ('pdr-3', 'prog-bachelor', 'passport_copy', 1),
      ('pdr-4', 'prog-bachelor', 'english_proficiency', 1)
  `).run();
}
