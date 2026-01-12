"use strict";
/**
 * Unit tests for document checklist tool
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const program_repository_1 = require("../../src/db/repositories/program.repository");
const migrate_1 = require("../../src/db/migrate");
const build_document_checklist_1 = require("../../src/tools/build-document-checklist");
describe('buildDocumentChecklist', () => {
    let db;
    let repository;
    beforeAll(() => {
        db = new better_sqlite3_1.default(':memory:');
        db.pragma('foreign_keys = ON');
        (0, migrate_1.runMigrationsOnTestDb)(db);
        repository = new program_repository_1.ProgramRepository(db);
        seedTestData(db);
    });
    afterAll(() => {
        db.close();
    });
    it('should return error for non-existent program', () => {
        const input = {
            profile: {
                nationality: 'Egyptian',
                current_education_level: 'high_school',
                desired_degree_level: 'bachelor',
            },
            program_id: 'non-existent',
        };
        const result = (0, build_document_checklist_1.buildDocumentChecklist)(input, repository);
        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('PROGRAM_NOT_FOUND');
    });
    it('should return document checklist for bachelor program', () => {
        const input = {
            profile: {
                nationality: 'Egyptian',
                current_education_level: 'high_school',
                desired_degree_level: 'bachelor',
            },
            program_id: 'prog-bachelor',
        };
        const result = (0, build_document_checklist_1.buildDocumentChecklist)(input, repository);
        expect(result.success).toBe(true);
        expect(result.data?.items.length).toBeGreaterThan(0);
    });
    it('should include Arabic and English labels', () => {
        const input = {
            profile: {
                nationality: 'Egyptian',
                current_education_level: 'high_school',
                desired_degree_level: 'bachelor',
            },
            program_id: 'prog-bachelor',
        };
        const result = (0, build_document_checklist_1.buildDocumentChecklist)(input, repository);
        expect(result.success).toBe(true);
        expect(result.data?.items.every(item => item.label_ar && item.label_en)).toBe(true);
    });
    it('should include why_needed explanations', () => {
        const input = {
            profile: {
                nationality: 'Egyptian',
                current_education_level: 'high_school',
                desired_degree_level: 'bachelor',
            },
            program_id: 'prog-bachelor',
        };
        const result = (0, build_document_checklist_1.buildDocumentChecklist)(input, repository);
        expect(result.success).toBe(true);
        expect(result.data?.items.every(item => item.why_needed_ar && item.why_needed_en)).toBe(true);
    });
    it('should indicate translation and notarization requirements', () => {
        const input = {
            profile: {
                nationality: 'Egyptian',
                current_education_level: 'high_school',
                desired_degree_level: 'bachelor',
            },
            program_id: 'prog-bachelor',
        };
        const result = (0, build_document_checklist_1.buildDocumentChecklist)(input, repository);
        expect(result.success).toBe(true);
        expect(result.data?.items.every(item => typeof item.translation_required === 'boolean' &&
            typeof item.notarization_required === 'boolean')).toBe(true);
    });
    it('should sort required documents first', () => {
        const input = {
            profile: {
                nationality: 'Egyptian',
                current_education_level: 'high_school',
                desired_degree_level: 'bachelor',
            },
            program_id: 'prog-bachelor',
        };
        const result = (0, build_document_checklist_1.buildDocumentChecklist)(input, repository);
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
        const input = {
            profile: {
                nationality: 'Egyptian',
                current_education_level: 'high_school',
                desired_degree_level: 'bachelor',
            },
            program_id: 'prog-bachelor',
        };
        const result = (0, build_document_checklist_1.buildDocumentChecklist)(input, repository);
        expect(result.success).toBe(true);
        expect(result.data?.items.some(item => item.estimated_days !== null)).toBe(true);
    });
    it('should include apostille/attestation notes', () => {
        const input = {
            profile: {
                nationality: 'Egyptian',
                current_education_level: 'high_school',
                desired_degree_level: 'bachelor',
            },
            program_id: 'prog-bachelor',
        };
        const result = (0, build_document_checklist_1.buildDocumentChecklist)(input, repository);
        expect(result.success).toBe(true);
        expect(result.data?.items.some(item => item.apostille_notes !== null)).toBe(true);
    });
});
function seedTestData(db) {
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
//# sourceMappingURL=document-checklist.test.js.map