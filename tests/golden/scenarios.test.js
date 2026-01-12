"use strict";
/**
 * Golden Test Scenarios for UniTR Admissions Assistant
 * Tests 30+ scenarios covering different nationalities, degree levels, budgets, and languages
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const program_repository_1 = require("../../src/db/repositories/program.repository");
const migrate_1 = require("../../src/db/migrate");
const search_programs_1 = require("../../src/tools/search-programs");
const build_eligibility_snapshot_1 = require("../../src/tools/build-eligibility-snapshot");
const build_document_checklist_1 = require("../../src/tools/build-document-checklist");
const build_timeline_1 = require("../../src/tools/build-timeline");
describe('Golden Test Scenarios', () => {
    let db;
    let repository;
    beforeAll(() => {
        db = new better_sqlite3_1.default(':memory:');
        db.pragma('foreign_keys = ON');
        (0, migrate_1.runMigrationsOnTestDb)(db);
        repository = new program_repository_1.ProgramRepository(db);
        seedComprehensiveTestData(db);
    });
    afterAll(() => {
        db.close();
    });
    // ==========================================================================
    // Nationality-based scenarios
    // ==========================================================================
    describe('Nationality Scenarios', () => {
        const nationalities = [
            'Egyptian', 'Saudi', 'Jordanian', 'Moroccan', 'Iraqi',
            'Syrian', 'Lebanese', 'Palestinian', 'Yemeni', 'Sudanese'
        ];
        nationalities.forEach(nationality => {
            it(`should process ${nationality} student searching for bachelor programs`, () => {
                const input = {
                    profile: {
                        nationality,
                        desired_degree_level: 'bachelor',
                        preferred_language: 'en',
                    },
                };
                const result = (0, search_programs_1.searchPrograms)(input, repository);
                expect(result.success).toBe(true);
                expect(result.data?.programs.length).toBeGreaterThan(0);
            });
        });
    });
    // ==========================================================================
    // Degree level scenarios
    // ==========================================================================
    describe('Degree Level Scenarios', () => {
        it('Scenario: High school graduate seeking bachelor in Computer Science', () => {
            const searchInput = {
                profile: {
                    nationality: 'Egyptian',
                    current_education_level: 'high_school',
                    desired_degree_level: 'bachelor',
                    major_keywords: ['computer'],
                    preferred_language: 'en',
                },
            };
            const searchResult = (0, search_programs_1.searchPrograms)(searchInput, repository);
            expect(searchResult.success).toBe(true);
            expect(searchResult.data?.programs.length).toBeGreaterThanOrEqual(1);
            expect(searchResult.data?.programs.every(p => p.degree_level === 'bachelor')).toBe(true);
        });
        it('Scenario: Bachelor graduate seeking master in Business', () => {
            const searchInput = {
                profile: {
                    nationality: 'Saudi',
                    current_education_level: 'bachelor',
                    desired_degree_level: 'master',
                    major_keywords: ['business', 'mba'],
                    preferred_language: 'en',
                },
            };
            const searchResult = (0, search_programs_1.searchPrograms)(searchInput, repository);
            expect(searchResult.success).toBe(true);
            expect(searchResult.data?.programs.every(p => p.degree_level === 'master')).toBe(true);
        });
        it('Scenario: Master graduate seeking PhD', () => {
            const searchInput = {
                profile: {
                    nationality: 'Jordanian',
                    current_education_level: 'master',
                    desired_degree_level: 'phd',
                    preferred_language: 'en',
                },
            };
            const searchResult = (0, search_programs_1.searchPrograms)(searchInput, repository);
            expect(searchResult.success).toBe(true);
        });
    });
    // ==========================================================================
    // Budget scenarios
    // ==========================================================================
    describe('Budget Scenarios', () => {
        it('Scenario: Low budget student (under $5000)', () => {
            const input = {
                profile: {
                    nationality: 'Egyptian',
                    desired_degree_level: 'bachelor',
                    budget_max: 5000,
                },
            };
            const result = (0, search_programs_1.searchPrograms)(input, repository);
            expect(result.success).toBe(true);
            if (result.data?.programs.length ?? 0 > 0) {
                expect(result.data?.programs.every(p => p.tuition_min <= 5000)).toBe(true);
            }
        });
        it('Scenario: Medium budget student ($5000-$15000)', () => {
            const input = {
                profile: {
                    nationality: 'Saudi',
                    desired_degree_level: 'bachelor',
                    budget_min: 5000,
                    budget_max: 15000,
                },
            };
            const result = (0, search_programs_1.searchPrograms)(input, repository);
            expect(result.success).toBe(true);
            if (result.data?.programs.length ?? 0 > 0) {
                expect(result.data?.programs.every(p => p.tuition_min <= 15000)).toBe(true);
            }
        });
        it('Scenario: High budget student (over $20000)', () => {
            const input = {
                profile: {
                    nationality: 'UAE',
                    desired_degree_level: 'bachelor',
                    budget_min: 20000,
                },
            };
            const result = (0, search_programs_1.searchPrograms)(input, repository);
            expect(result.success).toBe(true);
        });
        it('Scenario: Very low budget should show suggestions', () => {
            const input = {
                profile: {
                    nationality: 'Egyptian',
                    desired_degree_level: 'bachelor',
                    budget_max: 100,
                },
            };
            const result = (0, search_programs_1.searchPrograms)(input, repository);
            expect(result.success).toBe(true);
            if (result.data?.programs.length === 0) {
                expect(result.data?.suggestions.length).toBeGreaterThan(0);
            }
        });
    });
    // ==========================================================================
    // Language preference scenarios
    // ==========================================================================
    describe('Language Preference Scenarios', () => {
        it('Scenario: English-only programs', () => {
            const input = {
                profile: {
                    nationality: 'Egyptian',
                    desired_degree_level: 'bachelor',
                    preferred_language: 'en',
                },
            };
            const result = (0, search_programs_1.searchPrograms)(input, repository);
            expect(result.success).toBe(true);
            expect(result.data?.programs.every(p => p.language === 'en' || p.language === 'mixed')).toBe(true);
        });
        it('Scenario: Turkish-only programs', () => {
            const input = {
                profile: {
                    nationality: 'Egyptian',
                    desired_degree_level: 'bachelor',
                    preferred_language: 'tr',
                },
            };
            const result = (0, search_programs_1.searchPrograms)(input, repository);
            expect(result.success).toBe(true);
            expect(result.data?.programs.every(p => p.language === 'tr' || p.language === 'mixed')).toBe(true);
        });
    });
    // ==========================================================================
    // Eligibility scenarios
    // ==========================================================================
    describe('Eligibility Scenarios', () => {
        it('Scenario: Qualified high school student for bachelor', () => {
            const input = {
                profile: {
                    nationality: 'Egyptian',
                    current_education_level: 'high_school',
                    desired_degree_level: 'bachelor',
                    gpa: 80,
                    english_score: { type: 'ielts', score: 6.0 },
                },
                program_id: 'prog-cs-bs',
            };
            const result = (0, build_eligibility_snapshot_1.buildEligibilitySnapshot)(input, repository);
            expect(result.success).toBe(true);
            expect(['likely_eligible', 'needs_review']).toContain(result.data?.status);
            expect(result.data?.disclaimer).toBeTruthy();
        });
        it('Scenario: Unqualified student (low GPA)', () => {
            const input = {
                profile: {
                    nationality: 'Egyptian',
                    current_education_level: 'high_school',
                    desired_degree_level: 'bachelor',
                    gpa: 40,
                },
                program_id: 'prog-cs-bs',
            };
            const result = (0, build_eligibility_snapshot_1.buildEligibilitySnapshot)(input, repository);
            expect(result.success).toBe(true);
            expect(result.data?.reasons.some(r => r.rule_type === 'gpa_minimum' && !r.passed)).toBe(true);
        });
        it('Scenario: High school student applying for master (invalid)', () => {
            const input = {
                profile: {
                    nationality: 'Egyptian',
                    current_education_level: 'high_school',
                    desired_degree_level: 'master',
                },
                program_id: 'prog-mba',
            };
            const result = (0, build_eligibility_snapshot_1.buildEligibilitySnapshot)(input, repository);
            expect(result.success).toBe(true);
            expect(result.data?.status).toBe('unlikely');
        });
        it('Scenario: Eligibility with missing information', () => {
            const input = {
                profile: {
                    nationality: 'Egyptian',
                    current_education_level: 'high_school',
                    desired_degree_level: 'bachelor',
                    // No GPA or scores provided
                },
                program_id: 'prog-cs-bs',
            };
            const result = (0, build_eligibility_snapshot_1.buildEligibilitySnapshot)(input, repository);
            expect(result.success).toBe(true);
            expect(result.data?.missing_info.length).toBeGreaterThan(0);
        });
    });
    // ==========================================================================
    // Document checklist scenarios
    // ==========================================================================
    describe('Document Checklist Scenarios', () => {
        it('Scenario: Bachelor program documents', () => {
            const input = {
                profile: {
                    nationality: 'Egyptian',
                    current_education_level: 'high_school',
                    desired_degree_level: 'bachelor',
                },
                program_id: 'prog-cs-bs',
            };
            const result = (0, build_document_checklist_1.buildDocumentChecklist)(input, repository);
            expect(result.success).toBe(true);
            expect(result.data?.items.length).toBeGreaterThan(0);
            // Should include high school documents
            expect(result.data?.items.some(i => i.doc_key.includes('high_school'))).toBe(true);
        });
        it('Scenario: Master program documents', () => {
            const input = {
                profile: {
                    nationality: 'Saudi',
                    current_education_level: 'bachelor',
                    desired_degree_level: 'master',
                },
                program_id: 'prog-mba',
            };
            const result = (0, build_document_checklist_1.buildDocumentChecklist)(input, repository);
            expect(result.success).toBe(true);
            expect(result.data?.items.length).toBeGreaterThan(0);
        });
        it('Scenario: Documents have required priority markers', () => {
            const input = {
                profile: {
                    nationality: 'Egyptian',
                    current_education_level: 'high_school',
                    desired_degree_level: 'bachelor',
                },
                program_id: 'prog-cs-bs',
            };
            const result = (0, build_document_checklist_1.buildDocumentChecklist)(input, repository);
            expect(result.success).toBe(true);
            expect(result.data?.items.every(i => i.priority === 'required' || i.priority === 'recommended')).toBe(true);
        });
    });
    // ==========================================================================
    // Timeline scenarios
    // ==========================================================================
    describe('Timeline Scenarios', () => {
        it('Scenario: Timeline for fall intake', () => {
            const input = {
                profile: {
                    nationality: 'Egyptian',
                    current_education_level: 'high_school',
                    desired_degree_level: 'bachelor',
                },
                program_id: 'prog-cs-bs',
                intake_target: 'September',
            };
            const result = (0, build_timeline_1.buildTimeline)(input, repository);
            expect(result.success).toBe(true);
            expect(result.data?.weeks.length).toBeGreaterThan(0);
            expect(result.data?.target_intake).toBeTruthy();
        });
        it('Scenario: Timeline without specified intake', () => {
            const input = {
                profile: {
                    nationality: 'Egyptian',
                    current_education_level: 'high_school',
                    desired_degree_level: 'bachelor',
                },
                program_id: 'prog-cs-bs',
            };
            const result = (0, build_timeline_1.buildTimeline)(input, repository);
            expect(result.success).toBe(true);
            expect(result.data?.weeks.length).toBe(8); // Default 8-week timeline
        });
        it('Scenario: Critical path identification', () => {
            const input = {
                profile: {
                    nationality: 'Egyptian',
                    current_education_level: 'high_school',
                    desired_degree_level: 'bachelor',
                },
                program_id: 'prog-cs-bs',
            };
            const result = (0, build_timeline_1.buildTimeline)(input, repository);
            expect(result.success).toBe(true);
            expect(result.data?.critical_path_items.length).toBeGreaterThan(0);
        });
    });
    // ==========================================================================
    // End-to-end journey scenarios
    // ==========================================================================
    describe('End-to-End Journey Scenarios', () => {
        it('Complete journey: Egyptian student seeking CS bachelor', async () => {
            const profile = {
                nationality: 'Egyptian',
                current_education_level: 'high_school',
                desired_degree_level: 'bachelor',
                major_keywords: ['computer'],
                preferred_language: 'en',
                budget_max: 10000,
            };
            // Step 1: Search programs
            const searchResult = (0, search_programs_1.searchPrograms)({ profile }, repository);
            expect(searchResult.success).toBe(true);
            expect(searchResult.data?.programs.length).toBeGreaterThan(0);
            const programId = searchResult.data.programs[0].id;
            // Step 2: Check eligibility
            const eligibilityResult = (0, build_eligibility_snapshot_1.buildEligibilitySnapshot)({
                profile: { ...profile, gpa: 75 },
                program_id: programId,
            }, repository);
            expect(eligibilityResult.success).toBe(true);
            // Step 3: Get document checklist
            const checklistResult = (0, build_document_checklist_1.buildDocumentChecklist)({
                profile,
                program_id: programId,
            }, repository);
            expect(checklistResult.success).toBe(true);
            expect(checklistResult.data?.items.length).toBeGreaterThan(0);
            // Step 4: Generate timeline
            const timelineResult = (0, build_timeline_1.buildTimeline)({
                profile,
                program_id: programId,
                intake_target: 'September',
            }, repository);
            expect(timelineResult.success).toBe(true);
            expect(timelineResult.data?.weeks.length).toBeGreaterThan(0);
        });
        it('Complete journey: Saudi student seeking MBA', async () => {
            const profile = {
                nationality: 'Saudi',
                current_education_level: 'bachelor',
                desired_degree_level: 'master',
                major_keywords: ['business', 'mba'],
                preferred_language: 'en',
            };
            // Step 1: Search programs
            const searchResult = (0, search_programs_1.searchPrograms)({ profile }, repository);
            expect(searchResult.success).toBe(true);
            if (searchResult.data.programs.length > 0) {
                const programId = searchResult.data.programs[0].id;
                // Step 2: Check eligibility
                const eligibilityResult = (0, build_eligibility_snapshot_1.buildEligibilitySnapshot)({
                    profile: { ...profile, gpa: 3.2 },
                    program_id: programId,
                }, repository);
                expect(eligibilityResult.success).toBe(true);
                // Step 3: Get document checklist
                const checklistResult = (0, build_document_checklist_1.buildDocumentChecklist)({
                    profile,
                    program_id: programId,
                }, repository);
                expect(checklistResult.success).toBe(true);
            }
        });
    });
    // ==========================================================================
    // Data integrity scenarios
    // ==========================================================================
    describe('Data Integrity Scenarios', () => {
        it('All programs should have verification status', () => {
            const input = {
                profile: {},
            };
            const result = (0, search_programs_1.searchPrograms)(input, repository);
            expect(result.success).toBe(true);
            expect(result.data?.programs.every(p => p.verification_status === 'verified' ||
                p.verification_status === 'needs_verification' ||
                p.verification_status === 'outdated')).toBe(true);
        });
        it('No fabricated requirements in eligibility', () => {
            const input = {
                profile: {
                    nationality: 'Egyptian',
                    current_education_level: 'high_school',
                    desired_degree_level: 'bachelor',
                },
                program_id: 'prog-cs-bs',
            };
            const result = (0, build_eligibility_snapshot_1.buildEligibilitySnapshot)(input, repository);
            expect(result.success).toBe(true);
            // All reasons should be data-driven
            expect(result.data?.reasons.every(r => r.data_driven === true)).toBe(true);
        });
        it('Unknown fields should be explicitly marked', () => {
            const input = {
                profile: {
                    nationality: 'Egyptian',
                    current_education_level: 'high_school',
                    desired_degree_level: 'bachelor',
                },
                program_id: 'prog-cs-bs',
            };
            const result = (0, build_document_checklist_1.buildDocumentChecklist)(input, repository);
            expect(result.success).toBe(true);
            // Unknowns array should exist
            expect(Array.isArray(result.data?.unknowns)).toBe(true);
        });
    });
});
function seedComprehensiveTestData(db) {
    // Insert universities
    db.prepare(`
    INSERT INTO universities (id, name_ar, name_en, city, website) VALUES
      ('uni-1', 'جامعة إسطنبول', 'Istanbul University', 'Istanbul', 'https://istanbul.edu'),
      ('uni-2', 'جامعة أنقرة', 'Ankara University', 'Ankara', 'https://ankara.edu'),
      ('uni-3', 'جامعة إزمير', 'Izmir University', 'Izmir', 'https://izmir.edu')
  `).run();
    // Insert programs
    db.prepare(`
    INSERT INTO programs (id, university_id, program_name_ar, program_name_en, degree_level, language, city, tuition_min, tuition_max, currency, intakes) VALUES
      ('prog-cs-bs', 'uni-1', 'علوم الحاسوب', 'Computer Science', 'bachelor', 'en', 'Istanbul', 5000, 7000, 'USD', '["September", "February"]'),
      ('prog-ba-bs', 'uni-1', 'إدارة الأعمال', 'Business Administration', 'bachelor', 'en', 'Istanbul', 4500, 6000, 'USD', '["September"]'),
      ('prog-mba', 'uni-1', 'ماجستير إدارة الأعمال', 'MBA', 'master', 'en', 'Istanbul', 12000, 18000, 'USD', '["September"]'),
      ('prog-law-tr', 'uni-1', 'القانون', 'Law', 'bachelor', 'tr', 'Istanbul', 4000, 5000, 'USD', '["September"]'),
      ('prog-med', 'uni-2', 'الطب', 'Medicine', 'bachelor', 'en', 'Ankara', 20000, 25000, 'USD', '["September"]'),
      ('prog-eng', 'uni-2', 'الهندسة', 'Engineering', 'bachelor', 'en', 'Ankara', 6000, 8000, 'USD', '["September", "February"]'),
      ('prog-cs-phd', 'uni-1', 'دكتوراه علوم الحاسوب', 'Computer Science PhD', 'phd', 'en', 'Istanbul', 0, 5000, 'USD', '["September"]')
  `).run();
    // Insert document templates
    db.prepare(`
    INSERT INTO document_templates (id, doc_key, label_ar, label_en, translation_required_default, notarization_required_default, estimated_days_to_obtain) VALUES
      ('dt-1', 'high_school_diploma', 'شهادة الثانوية', 'High School Diploma', 1, 1, 7),
      ('dt-2', 'high_school_transcript', 'كشف درجات الثانوية', 'High School Transcript', 1, 1, 5),
      ('dt-3', 'passport_copy', 'صورة جواز السفر', 'Passport Copy', 0, 0, 1),
      ('dt-4', 'personal_photo', 'صورة شخصية', 'Personal Photo', 0, 0, 1),
      ('dt-5', 'english_proficiency', 'شهادة اللغة الإنجليزية', 'English Proficiency', 0, 0, 14),
      ('dt-6', 'bachelor_diploma', 'شهادة البكالوريوس', 'Bachelor Diploma', 1, 1, 7),
      ('dt-7', 'bachelor_transcript', 'كشف درجات البكالوريوس', 'Bachelor Transcript', 1, 1, 5),
      ('dt-8', 'cv_resume', 'السيرة الذاتية', 'CV/Resume', 0, 0, 3),
      ('dt-9', 'motivation_letter', 'خطاب الدافع', 'Motivation Letter', 0, 0, 5)
  `).run();
    // Link documents to programs
    db.prepare(`
    INSERT INTO program_document_rules (id, program_id, doc_key, required_flag) VALUES
      ('pdr-1', 'prog-cs-bs', 'high_school_diploma', 1),
      ('pdr-2', 'prog-cs-bs', 'high_school_transcript', 1),
      ('pdr-3', 'prog-cs-bs', 'passport_copy', 1),
      ('pdr-4', 'prog-cs-bs', 'personal_photo', 1),
      ('pdr-5', 'prog-cs-bs', 'english_proficiency', 1),
      ('pdr-6', 'prog-mba', 'bachelor_diploma', 1),
      ('pdr-7', 'prog-mba', 'bachelor_transcript', 1),
      ('pdr-8', 'prog-mba', 'passport_copy', 1),
      ('pdr-9', 'prog-mba', 'cv_resume', 1),
      ('pdr-10', 'prog-mba', 'motivation_letter', 1),
      ('pdr-11', 'prog-mba', 'english_proficiency', 1)
  `).run();
    // Insert requirements
    db.prepare(`
    INSERT INTO requirements (id, program_id, university_id, applicant_category, rule_type, rule_value, human_text_ar, human_text_en, required_flag) VALUES
      ('req-1', 'prog-cs-bs', 'uni-1', 'international', 'gpa_minimum', '60', 'الحد الأدنى 60%', 'Minimum 60%', 1),
      ('req-2', 'prog-cs-bs', 'uni-1', 'international', 'language_proficiency', '{"type":"english","ielts":5.5,"toefl":70}', 'إتقان الإنجليزية', 'English proficiency', 1),
      ('req-3', 'prog-mba', 'uni-1', 'international', 'gpa_minimum', '2.5', 'الحد الأدنى 2.5', 'Minimum 2.5/4.0', 1),
      ('req-4', 'prog-mba', 'uni-1', 'international', 'language_proficiency', '{"type":"english","ielts":6.0,"toefl":80}', 'إتقان الإنجليزية', 'English proficiency', 1),
      ('req-5', 'prog-mba', 'uni-1', 'international', 'work_experience', '2', 'خبرة عملية 2 سنة', '2 years work experience', 0)
  `).run();
    // Insert verifications
    db.prepare(`
    INSERT INTO verifications (id, entity_type, entity_id, last_verified_at, verified_by) VALUES
      ('ver-1', 'program', 'prog-cs-bs', datetime('now'), 'system'),
      ('ver-2', 'program', 'prog-ba-bs', datetime('now'), 'system'),
      ('ver-3', 'program', 'prog-mba', datetime('now'), 'system'),
      ('ver-4', 'university', 'uni-1', datetime('now'), 'system')
  `).run();
    // Insert source references
    db.prepare(`
    INSERT INTO source_references (id, entity_type, entity_id, title, url, captured_at) VALUES
      ('src-1', 'program', 'prog-cs-bs', 'Official Website', 'https://istanbul.edu/cs', datetime('now')),
      ('src-2', 'program', 'prog-mba', 'Official Website', 'https://istanbul.edu/mba', datetime('now'))
  `).run();
}
//# sourceMappingURL=scenarios.test.js.map