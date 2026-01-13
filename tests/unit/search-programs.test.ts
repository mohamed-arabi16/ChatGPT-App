/**
 * Unit tests for search_programs tool
 */

import Database from 'better-sqlite3';
import { ProgramRepository } from '../../src/db/repositories/program.repository';
import { runMigrationsOnTestDb } from '../../src/db/migrate';
import { searchPrograms, SearchProgramsInput } from '../../src/tools/search-programs';

describe('searchPrograms', () => {
  let db: Database.Database;
  let repository: ProgramRepository;

  beforeAll(() => {
    // Create in-memory database
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    runMigrationsOnTestDb(db);
    repository = new ProgramRepository(db);

    // Seed test data
    seedTestData(db);
  });

  afterAll(() => {
    db.close();
  });

  it('should return all programs when no filters applied', () => {
    const input: SearchProgramsInput = {
      profile: {},
    };

    const result = searchPrograms(input, repository);

    expect(result.success).toBe(true);
    expect(result.data?.programs.length).toBeGreaterThan(0);
  });

  it('should filter by degree level', () => {
    const input: SearchProgramsInput = {
      profile: {
        desired_degree_level: 'bachelor',
      },
    };

    const result = searchPrograms(input, repository);

    expect(result.success).toBe(true);
    expect(result.data?.programs.every(p => p.degree_level === 'bachelor')).toBe(true);
  });

  it('should filter by language', () => {
    const input: SearchProgramsInput = {
      profile: {
        preferred_language: 'en',
      },
    };

    const result = searchPrograms(input, repository);

    expect(result.success).toBe(true);
    expect(result.data?.programs.every(p => p.language === 'en' || p.language === 'mixed')).toBe(true);
  });

  it('should filter by budget', () => {
    const input: SearchProgramsInput = {
      profile: {
        budget_max: 6000,
      },
    };

    const result = searchPrograms(input, repository);

    expect(result.success).toBe(true);
    expect(result.data?.programs.every(p => p.tuition_min <= 6000)).toBe(true);
  });

  it('should filter by city', () => {
    const input: SearchProgramsInput = {
      profile: {
        city_preference: 'Istanbul',
      },
    };

    const result = searchPrograms(input, repository);

    expect(result.success).toBe(true);
    expect(result.data?.programs.every(p => p.city.toLowerCase() === 'istanbul')).toBe(true);
  });

  it('should search by keywords', () => {
    const input: SearchProgramsInput = {
      profile: {
        major_keywords: ['computer'],
      },
    };

    const result = searchPrograms(input, repository);

    expect(result.success).toBe(true);
    expect(result.data?.programs.every(p => 
      p.program_name_en.toLowerCase().includes('computer') ||
      p.program_name_ar.includes('حاسوب')
    )).toBe(true);
  });

  it('should return suggestions when no results', () => {
    const input: SearchProgramsInput = {
      profile: {
        budget_max: 100, // Very low budget
        city_preference: 'NonExistentCity',
      },
    };

    const result = searchPrograms(input, repository);

    expect(result.success).toBe(true);
    expect(result.data?.programs.length).toBe(0);
    expect(result.data?.suggestions.length).toBeGreaterThan(0);
  });

  it('should include verification status', () => {
    const input: SearchProgramsInput = {
      profile: {},
    };

    const result = searchPrograms(input, repository);

    expect(result.success).toBe(true);
    expect(result.data?.programs[0]).toHaveProperty('verification_status');
  });

  // New tests for keyword expansion and synonyms
  it('should include query_info with original and expanded keywords', () => {
    const input: SearchProgramsInput = {
      profile: {
        major_keywords: ['cs'],
      },
    };

    const result = searchPrograms(input, repository);

    expect(result.success).toBe(true);
    expect(result.data?.query_info).toBeDefined();
    expect(result.data?.query_info.original_keywords).toContain('cs');
    expect(result.data?.query_info.expanded_keywords.length).toBeGreaterThan(1);
  });

  it('should expand CS keyword to include computer science', () => {
    const input: SearchProgramsInput = {
      profile: {
        major_keywords: ['cs'],
      },
    };

    const result = searchPrograms(input, repository);

    expect(result.success).toBe(true);
    expect(result.data?.query_info.expanded_keywords).toContain('computer science');
  });

  it('should provide near_equivalents when exact match fails', () => {
    const input: SearchProgramsInput = {
      profile: {
        major_keywords: ['computer engineering'],
        budget_max: 100, // impossibly low to get no exact matches
      },
    };

    const result = searchPrograms(input, repository);

    expect(result.success).toBe(true);
    expect(result.data?.near_equivalents).toBeDefined();
  });

  it('should show synonyms applied in query_info', () => {
    const input: SearchProgramsInput = {
      profile: {
        major_keywords: ['ce'],
      },
    };

    const result = searchPrograms(input, repository);

    expect(result.success).toBe(true);
    expect(result.data?.query_info.synonyms_applied.length).toBeGreaterThan(0);
  });
});

function seedTestData(db: Database.Database) {
  // Insert test university
  db.prepare(`
    INSERT INTO universities (id, name_ar, name_en, city, website)
    VALUES ('test-uni-1', 'جامعة اختبارية', 'Test University', 'Istanbul', 'https://test.edu')
  `).run();

  // Insert test programs
  db.prepare(`
    INSERT INTO programs (id, university_id, program_name_ar, program_name_en, degree_level, language, city, tuition_min, tuition_max, currency, intakes)
    VALUES 
      ('prog-1', 'test-uni-1', 'علوم الحاسوب', 'Computer Science', 'bachelor', 'en', 'Istanbul', 5000, 6000, 'USD', '["September", "February"]'),
      ('prog-2', 'test-uni-1', 'إدارة الأعمال', 'Business Administration', 'bachelor', 'en', 'Istanbul', 4000, 5000, 'USD', '["September"]'),
      ('prog-3', 'test-uni-1', 'ماجستير إدارة الأعمال', 'MBA', 'master', 'en', 'Istanbul', 10000, 15000, 'USD', '["September"]'),
      ('prog-4', 'test-uni-1', 'القانون', 'Law', 'bachelor', 'tr', 'Istanbul', 3000, 4000, 'USD', '["September"]'),
      ('prog-5', 'test-uni-1', 'هندسة الحاسوب', 'Computer Engineering', 'bachelor', 'en', 'Istanbul', 5000, 6000, 'USD', '["September"]')
  `).run();

  // Insert verification
  db.prepare(`
    INSERT INTO verifications (id, entity_type, entity_id, last_verified_at, verified_by)
    VALUES ('ver-1', 'program', 'prog-1', datetime('now'), 'test')
  `).run();
}
