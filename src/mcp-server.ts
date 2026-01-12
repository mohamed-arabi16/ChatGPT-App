/**
 * MCP Server for UniTR Admissions Assistant
 * Exposes tools for Turkish university program search, eligibility, and planning
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';

import { getDatabase } from './db/connection';
import { runMigrations } from './db/migrate';
import { ProgramRepository } from './db/repositories/program.repository';

import {
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

// Initialize database
runMigrations();
const repository = new ProgramRepository();

// Define MCP tools
const TOOLS: Tool[] = [
  {
    name: 'search_programs',
    description: 'Search for Turkish university programs based on student profile and filters. Returns programs with tuition, intakes, and verification status.',
    inputSchema: {
      type: 'object',
      properties: {
        profile: {
          type: 'object',
          description: 'Student profile information',
          properties: {
            nationality: { type: 'string', description: 'Student nationality' },
            current_education_level: { 
              type: 'string', 
              enum: ['high_school', 'bachelor', 'master', 'phd'],
              description: 'Current education level'
            },
            desired_degree_level: { 
              type: 'string', 
              enum: ['bachelor', 'master', 'phd', 'associate'],
              description: 'Desired degree level to pursue'
            },
            major_keywords: { 
              type: 'array', 
              items: { type: 'string' },
              description: 'Keywords for major/field of study'
            },
            preferred_language: { 
              type: 'string', 
              enum: ['en', 'tr', 'ar', 'mixed'],
              description: 'Preferred language of instruction'
            },
            budget_min: { type: 'number', description: 'Minimum annual budget in USD' },
            budget_max: { type: 'number', description: 'Maximum annual budget in USD' },
            city_preference: { type: 'string', description: 'Preferred city' },
            intake_preference: { 
              type: 'string', 
              enum: ['fall', 'spring', 'any'],
              description: 'Preferred intake period'
            },
          },
        },
        filters: {
          type: 'object',
          description: 'Additional filters',
          properties: {
            degree_level: { type: 'string', enum: ['bachelor', 'master', 'phd', 'associate'] },
            language: { type: 'string', enum: ['en', 'tr', 'ar', 'mixed'] },
            city: { type: 'string' },
            university_id: { type: 'string' },
          },
        },
      },
      required: ['profile'],
    },
  },
  {
    name: 'get_program_detail',
    description: 'Get detailed information about a specific program including requirements, documents, costs, and verification status.',
    inputSchema: {
      type: 'object',
      properties: {
        program_id: { 
          type: 'string', 
          description: 'The unique identifier of the program'
        },
      },
      required: ['program_id'],
    },
  },
  {
    name: 'build_eligibility_snapshot',
    description: 'Evaluate eligibility for a program based on student profile. Returns status (likely_eligible/needs_review/unlikely) with reasons. Always includes disclaimer that this is not a final decision.',
    inputSchema: {
      type: 'object',
      properties: {
        profile: {
          type: 'object',
          description: 'Student profile with qualifications',
          properties: {
            nationality: { type: 'string' },
            current_education_level: { 
              type: 'string', 
              enum: ['high_school', 'bachelor', 'master', 'phd']
            },
            desired_degree_level: { 
              type: 'string', 
              enum: ['bachelor', 'master', 'phd', 'associate']
            },
            gpa: { type: 'number', description: 'Current GPA' },
            english_score: {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['ielts', 'toefl'] },
                score: { type: 'number' },
              },
            },
            turkish_score: {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['tomer'] },
                level: { type: 'string' },
              },
            },
            has_portfolio: { type: 'boolean' },
            work_experience_years: { type: 'number' },
          },
          required: ['nationality', 'current_education_level', 'desired_degree_level'],
        },
        program_id: { type: 'string' },
      },
      required: ['profile', 'program_id'],
    },
  },
  {
    name: 'build_document_checklist',
    description: 'Generate a personalized document checklist for a program application. Includes translation/notarization requirements and estimated preparation time.',
    inputSchema: {
      type: 'object',
      properties: {
        profile: {
          type: 'object',
          properties: {
            nationality: { type: 'string' },
            current_education_level: { 
              type: 'string', 
              enum: ['high_school', 'bachelor', 'master', 'phd']
            },
            desired_degree_level: { 
              type: 'string', 
              enum: ['bachelor', 'master', 'phd', 'associate']
            },
          },
          required: ['nationality', 'current_education_level', 'desired_degree_level'],
        },
        program_id: { type: 'string' },
      },
      required: ['profile', 'program_id'],
    },
  },
  {
    name: 'build_timeline',
    description: 'Generate a week-by-week preparation timeline for a program application. Identifies critical path items and provides task scheduling.',
    inputSchema: {
      type: 'object',
      properties: {
        profile: {
          type: 'object',
          properties: {
            nationality: { type: 'string' },
            current_education_level: { 
              type: 'string', 
              enum: ['high_school', 'bachelor', 'master', 'phd']
            },
            desired_degree_level: { 
              type: 'string', 
              enum: ['bachelor', 'master', 'phd', 'associate']
            },
          },
          required: ['nationality', 'current_education_level', 'desired_degree_level'],
        },
        program_id: { type: 'string' },
        intake_target: { 
          type: 'string', 
          description: 'Target intake period (e.g., "September 2024", "Fall 2024")'
        },
      },
      required: ['profile', 'program_id'],
    },
  },
];

// Create MCP server
const server = new Server(
  {
    name: 'unitr-admissions-assistant',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    switch (name) {
      case 'search_programs': {
        const input = searchProgramsInputSchema.parse(args);
        const result = searchPrograms(input, repository);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }
      
      case 'get_program_detail': {
        const input = getProgramDetailInputSchema.parse(args);
        const result = getProgramDetail(input, repository);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }
      
      case 'build_eligibility_snapshot': {
        const input = buildEligibilitySnapshotInputSchema.parse(args);
        const result = buildEligibilitySnapshot(input, repository);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }
      
      case 'build_document_checklist': {
        const input = buildDocumentChecklistInputSchema.parse(args);
        const result = buildDocumentChecklist(input, repository);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }
      
      case 'build_timeline': {
        const input = buildTimelineInputSchema.parse(args);
        const result = buildTimeline(input, repository);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }
      
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: {
              code: 'TOOL_ERROR',
              message_ar: 'حدث خطأ أثناء تنفيذ الأداة',
              message_en: errorMessage,
            },
          }),
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('UniTR MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
