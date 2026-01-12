/**
 * MCP Tool: get_program_detail
 * Gets detailed information about a specific program
 */

import { z } from 'zod';
import { ProgramRepository } from '../db/repositories/program.repository';
import { ProgramDetailOutput, ToolResponse } from '../types';

// Input schema
export const getProgramDetailInputSchema = z.object({
  program_id: z.string().min(1, 'Program ID is required'),
});

export type GetProgramDetailInput = z.infer<typeof getProgramDetailInputSchema>;

export function getProgramDetail(
  input: GetProgramDetailInput,
  repository?: ProgramRepository
): ToolResponse<ProgramDetailOutput> {
  const repo = repository || new ProgramRepository();
  
  try {
    const program = repo.getProgramDetail(input.program_id);
    
    if (!program) {
      return {
        success: false,
        error: {
          code: 'PROGRAM_NOT_FOUND',
          message_ar: 'البرنامج غير موجود',
          message_en: 'Program not found',
        },
        metadata: {
          timestamp: new Date().toISOString(),
        },
      };
    }
    
    return {
      success: true,
      data: program,
      metadata: {
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'DETAIL_ERROR',
        message_ar: 'حدث خطأ أثناء جلب تفاصيل البرنامج',
        message_en: 'An error occurred while fetching program details',
      },
      metadata: {
        timestamp: new Date().toISOString(),
      },
    };
  }
}
