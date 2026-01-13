/**
 * MCP Server for UniTR Admissions Assistant
 * Exposes tools for Turkish university program search, eligibility, and planning
 * 
 * Transport modes:
 * - stdio (default): For local development and CLI usage
 * - sse: For HTTP-based access (ChatGPT integration)
 * 
 * Environment variables:
 * - MCP_TRANSPORT: 'stdio' | 'sse' (default: 'stdio')
 * - HOST: Bind address for SSE mode (default: '127.0.0.1', use '0.0.0.0' for public access)
 * - PORT: Port for SSE mode (default: 3000)
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
    log('info', 'tool_called', { tool: name });
    
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

// Structured logging helper
function log(level: 'info' | 'warn' | 'error', event: string, data?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  const logData = { timestamp, level, event, ...data };
  if (level === 'error') {
    console.error(JSON.stringify(logData));
  } else {
    console.log(JSON.stringify(logData));
  }
}

// Start server in stdio mode
async function startStdioServer() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  log('info', 'server_started', { transport: 'stdio' });
}

// Start server in SSE mode
async function startSseServer(host: string = '127.0.0.1', port: number = 3000) {
  // Configure Express app with appropriate host settings
  const allowedHosts = host === '0.0.0.0' || host === '::' 
    ? ['localhost', '127.0.0.1', '[::1]'] 
    : undefined;
  const app = createMcpExpressApp({ host, allowedHosts });

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  // SSE endpoint handler (shared between /sse and /sse/)
  const handleSseRequest = async (req: import('express').Request, res: import('express').Response) => {
    log('info', 'sse_connection_attempt', { path: req.path });
    try {
      // Create a new SSE transport for the client
      // The endpoint for POST messages is '/messages'
      const transport = new SSEServerTransport('/messages', res);
      const sessionId = transport.sessionId;
      if (!sessionId) {
        throw new Error('Failed to generate session ID for SSE transport');
      }
      transports[sessionId] = transport;

      log('info', 'session_created', { sessionId });

      // Set up onclose handler to clean up transport when closed
      transport.onclose = () => {
        log('info', 'session_closed', { sessionId });
        delete transports[sessionId];
      };

      // Connect the transport to a new MCP server instance
      const server = createServer();
      await server.connect(transport);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log('error', 'sse_connection_error', { error: errorMessage });
      if (!res.headersSent) {
        res.status(500).send('Error establishing SSE stream');
      }
    }
  };

  // SSE endpoint for establishing the stream (GET /sse and /sse/)
  app.get('/sse', handleSseRequest);
  app.get('/sse/', handleSseRequest);

  // Messages endpoint handler (shared between /messages and /messages/)
  const handleMessagesRequest = async (req: import('express').Request, res: import('express').Response) => {
    // Extract session ID from URL query parameter
    const sessionId = req.query.sessionId as string | undefined;
    if (!sessionId) {
      log('warn', 'message_missing_session', { path: req.path });
      res.status(400).send('Missing sessionId parameter');
      return;
    }

    log('info', 'message_received', { sessionId, path: req.path });

    const transport = transports[sessionId];
    if (!transport) {
      log('warn', 'message_session_not_found', { sessionId });
      res.status(404).send('Session not found');
      return;
    }

    try {
      // Handle the POST message with the transport
      // Pass req.body as the third argument (parsedBody) to handlePostMessage.
      // This is necessary because in some TypeScript SDK versions, the method
      // may not properly parse the request body from the IncomingMessage stream,
      // so providing the pre-parsed body ensures reliable message handling.
      await transport.handlePostMessage(req, res, req.body);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log('error', 'message_handling_error', { sessionId, error: errorMessage });
      if (!res.headersSent) {
        res.status(500).send('Error handling request');
      }
    }
  };

  // Messages endpoint for receiving client JSON-RPC requests (POST /messages and /messages/)
  app.post('/messages', handleMessagesRequest);
  app.post('/messages/', handleMessagesRequest);

  // Start the server
  app.listen(port, host, () => {
    log('info', 'server_started', { 
      transport: 'sse', 
      host, 
      port,
      endpoints: {
        health: `http://${host}:${port}/health`,
        sse: `http://${host}:${port}/sse`,
        messages: `http://${host}:${port}/messages`
      }
    });
  });

  // Handle server shutdown
  process.on('SIGINT', async () => {
    log('info', 'server_shutdown_started', { activeSessions: Object.keys(transports).length });
    // Close all active transports to properly clean up resources
    for (const sessionId in transports) {
      try {
        await transports[sessionId].close();
        delete transports[sessionId];
        log('info', 'session_closed_on_shutdown', { sessionId });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        log('error', 'session_close_error', { sessionId, error: errorMessage });
      }
    }
    log('info', 'server_shutdown_complete');
    process.exit(0);
  });
}

// Main entry point
async function main() {
  // Determine transport mode: MCP_TRANSPORT env var takes precedence, then --sse flag
  const transport = process.env.MCP_TRANSPORT?.toLowerCase() || 
    (process.argv.includes('--sse') ? 'sse' : 'stdio');
  
  if (transport === 'sse') {
    const host = process.env.HOST || '127.0.0.1';
    const port = parseInt(process.env.PORT || '3000', 10);
    await startSseServer(host, port);
  } else {
    await startStdioServer();
  }
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
