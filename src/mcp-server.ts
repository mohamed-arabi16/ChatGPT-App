/**
 * MCP Server for UniTR Admissions Assistant
 * Exposes tools for Turkish university program search, eligibility, and planning
 * Supports both stdio transport (default) and SSE transport (with --sse flag)
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
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

// Store transports by session ID (for SSE mode)
const transports: Record<string, SSEServerTransport> = {};

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

// Factory function to create configured MCP server instance
function createServer(): Server {
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

  return server;
}

// Start server in stdio mode
async function startStdioServer() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('UniTR MCP Server running on stdio');
}

// Start server in SSE mode
async function startSseServer(port: number = 3000) {
  const app = createMcpExpressApp();

  // SSE endpoint for establishing the stream (GET /sse)
  app.get('/sse', async (req, res) => {
    console.log('Received GET request to /sse (establishing SSE stream)');
    try {
      // Create a new SSE transport for the client
      // The endpoint for POST messages is '/messages'
      const transport = new SSEServerTransport('/messages', res);
      const sessionId = transport.sessionId;
      transports[sessionId] = transport;

      // Set up onclose handler to clean up transport when closed
      transport.onclose = () => {
        console.log(`SSE transport closed for session ${sessionId}`);
        delete transports[sessionId];
      };

      // Connect the transport to a new MCP server instance
      const server = createServer();
      await server.connect(transport);
      console.log(`Established SSE stream with session ID: ${sessionId}`);
    } catch (error) {
      console.error('Error establishing SSE stream:', error);
      if (!res.headersSent) {
        res.status(500).send('Error establishing SSE stream');
      }
    }
  });

  // Messages endpoint for receiving client JSON-RPC requests (POST /messages)
  app.post('/messages', async (req, res) => {
    console.log('Received POST request to /messages');
    // Extract session ID from URL query parameter
    const sessionId = req.query.sessionId as string | undefined;
    if (!sessionId) {
      console.error('No session ID provided in request URL');
      res.status(400).send('Missing sessionId parameter');
      return;
    }

    const transport = transports[sessionId];
    if (!transport) {
      console.error(`No active transport found for session ID: ${sessionId}`);
      res.status(404).send('Session not found');
      return;
    }

    try {
      // Handle the POST message with the transport
      // Pass req.body to avoid known gotcha in some TypeScript SDK versions
      await transport.handlePostMessage(req, res, req.body);
    } catch (error) {
      console.error('Error handling request:', error);
      if (!res.headersSent) {
        res.status(500).send('Error handling request');
      }
    }
  });

  // Start the server
  app.listen(port, () => {
    console.log(`UniTR MCP Server (SSE mode) listening on port ${port}`);
    console.log(`SSE endpoint: GET http://localhost:${port}/sse`);
    console.log(`Messages endpoint: POST http://localhost:${port}/messages`);
  });

  // Handle server shutdown
  process.on('SIGINT', async () => {
    console.log('Shutting down server...');
    // Close all active transports to properly clean up resources
    for (const sessionId in transports) {
      try {
        console.log(`Closing transport for session ${sessionId}`);
        await transports[sessionId].close();
        delete transports[sessionId];
      } catch (error) {
        console.error(`Error closing transport for session ${sessionId}:`, error);
      }
    }
    console.log('Server shutdown complete');
    process.exit(0);
  });
}

// Main entry point
async function main() {
  const useSSE = process.argv.includes('--sse') || process.env.MCP_SSE_MODE === 'true';
  const port = parseInt(process.env.MCP_SSE_PORT || '3000', 10);

  if (useSSE) {
    await startSseServer(port);
  } else {
    await startStdioServer();
  }
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
