"use strict";
/**
 * Unit tests for search_programs tool
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const program_repository_1 = require("../../src/db/repositories/program.repository");
const migrate_1 = require("../../src/db/migrate");
const search_programs_1 = require("../../src/tools/search-programs");
describe('searchPrograms', () => {
    let db;
    let repository;
    beforeAll(() => {
        // Create in-memory database
        db = new better_sqlite3_1.default(':memory:');
        db.pragma('foreign_keys = ON');
        (0, migrate_1.runMigrationsOnTestDb)(db);
        repository = new program_repository_1.ProgramRepository(db);
        // Seed test data
        seedTestData(db);
    });
    afterAll(() => {
        db.close();
    });
    it('should return all programs when no filters applied', () => {
        const input = {
            profile: {},
        };
        const result = (0, search_programs_1.searchPrograms)(input, repository);
        expect(result.success).toBe(true);
        expect(result.data?.programs.length).toBeGreaterThan(0);
    });
    it('should filter by degree level', () => {
        const input = {
            profile: {
                desired_degree_level: 'bachelor',
            },
        };
        const result = (0, search_programs_1.searchPrograms)(input, repository);
        expect(result.success).toBe(true);
        expect(result.data?.programs.every(p => p.degree_level === 'bachelor')).toBe(true);
    });
    it('should filter by language', () => {
        const input = {
            profile: {
                preferred_language: 'en',
            },
        };
        const result = (0, search_programs_1.searchPrograms)(input, repository);
        expect(result.success).toBe(true);
        expect(result.data?.programs.every(p => p.language === 'en' || p.language === 'mixed')).toBe(true);
    });
    it('should filter by budget', () => {
        const input = {
            profile: {
                budget_max: 6000,
            },
        };
        const result = (0, search_programs_1.searchPrograms)(input, repository);
        expect(result.success).toBe(true);
        expect(result.data?.programs.every(p => p.tuition_min <= 6000)).toBe(true);
    });
    it('should filter by city', () => {
        const input = {
            profile: {
                city_preference: 'Istanbul',
            },
        };
        const result = (0, search_programs_1.searchPrograms)(input, repository);
        expect(result.success).toBe(true);
        expect(result.data?.programs.every(p => p.city.toLowerCase() === 'istanbul')).toBe(true);
    });
    it('should search by keywords', () => {
        const input = {
            profile: {
                major_keywords: ['computer'],
            },
        };
        const result = (0, search_programs_1.searchPrograms)(input, repository);
        expect(result.success).toBe(true);
        expect(result.data?.programs.every(p => p.program_name_en.toLowerCase().includes('computer') ||
            p.program_name_ar.includes('حاسوب'))).toBe(true);
    });
    it('should return suggestions when no results', () => {
        const input = {
            profile: {
                budget_max: 100, // Very low budget
                city_preference: 'NonExistentCity',
            },
        };
        const result = (0, search_programs_1.searchPrograms)(input, repository);
        expect(result.success).toBe(true);
        expect(result.data?.programs.length).toBe(0);
        expect(result.data?.suggestions.length).toBeGreaterThan(0);
    });
    it('should include verification status', () => {
        const input = {
            profile: {},
        };
        const result = (0, search_programs_1.searchPrograms)(input, repository);
        expect(result.success).toBe(true);
        expect(result.data?.programs[0]).toHaveProperty('verification_status');
    });
});
function seedTestData(db) {
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
      ('prog-4', 'test-uni-1', 'القانون', 'Law', 'bachelor', 'tr', 'Istanbul', 3000, 4000, 'USD', '["September"]')
  `).run();
    // Insert verification
    db.prepare(`
    INSERT INTO verifications (id, entity_type, entity_id, last_verified_at, verified_by)
    VALUES ('ver-1', 'program', 'prog-1', datetime('now'), 'test')
  `).run();
}
//# sourceMappingURL=search-programs.test.js.map