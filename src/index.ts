/**
 * UniTR Admissions Assistant - Main Entry Point
 * Turkish University Registration Assistant for Arabic-speaking students
 */

import { getDatabase, closeDatabase } from './db/connection';
import { runMigrations } from './db/migrate';
import { seedDatabase } from './db/seed';

export { getDatabase, closeDatabase } from './db/connection';
export { runMigrations } from './db/migrate';
export { seedDatabase } from './db/seed';
export { ProgramRepository } from './db/repositories/program.repository';

// Export tools (tool functions and their zod schemas)
export {
  searchPrograms,
  searchProgramsInputSchema,
  getProgramDetail,
  getProgramDetailInputSchema,
  buildEligibilitySnapshot,
  buildEligibilitySnapshotInputSchema,
  buildDocumentChecklist,
  buildDocumentChecklistInputSchema,
  buildTimeline,
  buildTimelineInputSchema,
} from './tools';

// Export types (database entities and output types)
export type {
  University,
  Program,
  Requirement,
  DocumentTemplate,
  ProgramDocumentRule,
  SourceReference,
  Verification,
  User,
  StudentProfile,
  SavedShortlist,
  SavedPlan,
  DegreeLevel,
  ProgramLanguage,
  ApplicantCategory,
  RuleType,
  EntityType,
  EducationLevel,
  IntakePreference,
  EligibilityStatus,
  StudentProfileInput,
  ProgramFilters,
  ProgramSearchResult,
  SourceReferenceOutput,
  ProgramDetailOutput,
  RequirementOutput,
  DocumentOutput,
  EligibilitySnapshotOutput,
  EligibilityReason,
  ChecklistItemOutput,
  DocumentChecklistOutput,
  TimelineWeek,
  TimelineTask,
  TimelineOutput,
  ToolResponse,
} from './types';

// Initialize function for programmatic usage
export function initialize(options?: { seed?: boolean }): void {
  runMigrations();
  
  if (options?.seed) {
    seedDatabase();
  }
}

// CLI entry point
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--migrate')) {
    console.log('Running database migrations...');
    runMigrations();
    console.log('Done.');
  }
  
  if (args.includes('--seed')) {
    console.log('Seeding database...');
    seedDatabase();
    console.log('Done.');
  }
  
  if (args.includes('--help')) {
    console.log(`
UniTR Admissions Assistant

Usage:
  npx ts-node src/index.ts [options]

Options:
  --migrate   Run database migrations
  --seed      Seed database with sample data
  --help      Show this help message

For MCP server: npm run start:mcp
For Admin API: npm run start:admin
    `);
  }
  
  if (args.length === 0) {
    console.log('UniTR Admissions Assistant initialized.');
    console.log('Use --help for available commands.');
  }
}
