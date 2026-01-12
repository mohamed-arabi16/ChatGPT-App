/**
 * MCP Tool: search_programs
 * Searches programs based on student profile and filters
 */

import { z } from 'zod';
import { ProgramRepository } from '../db/repositories/program.repository';
import { ProgramSearchResult, ToolResponse, StudentProfileInput, ProgramFilters } from '../types';

// Input schema
export const searchProgramsInputSchema = z.object({
  profile: z.object({
    nationality: z.string().optional(),
    current_education_level: z.enum(['high_school', 'bachelor', 'master', 'phd']).optional(),
    desired_degree_level: z.enum(['bachelor', 'master', 'phd', 'associate']).optional(),
    major_keywords: z.array(z.string()).optional(),
    preferred_language: z.enum(['en', 'tr', 'ar', 'mixed']).optional(),
    budget_min: z.number().optional(),
    budget_max: z.number().optional(),
    city_preference: z.string().optional(),
    intake_preference: z.enum(['fall', 'spring', 'any']).optional(),
  }),
  filters: z.object({
    degree_level: z.enum(['bachelor', 'master', 'phd', 'associate']).optional(),
    language: z.enum(['en', 'tr', 'ar', 'mixed']).optional(),
    city: z.string().optional(),
    budget_min: z.number().optional(),
    budget_max: z.number().optional(),
    university_id: z.string().optional(),
  }).optional(),
});

export type SearchProgramsInput = z.infer<typeof searchProgramsInputSchema>;

export interface SearchProgramsOutput {
  programs: ProgramSearchResult[];
  total_count: number;
  filters_applied: string[];
  suggestions: string[];
}

export function searchPrograms(
  input: SearchProgramsInput,
  repository?: ProgramRepository
): ToolResponse<SearchProgramsOutput> {
  const repo = repository || new ProgramRepository();
  
  try {
    const filtersApplied: string[] = [];
    
    // Track which filters are applied
    if (input.profile.desired_degree_level) {
      filtersApplied.push(`degree_level: ${input.profile.desired_degree_level}`);
    }
    if (input.profile.preferred_language) {
      filtersApplied.push(`language: ${input.profile.preferred_language}`);
    }
    if (input.profile.city_preference) {
      filtersApplied.push(`city: ${input.profile.city_preference}`);
    }
    if (input.profile.budget_max) {
      filtersApplied.push(`max_budget: ${input.profile.budget_max}`);
    }
    if (input.profile.major_keywords?.length) {
      filtersApplied.push(`keywords: ${input.profile.major_keywords.join(', ')}`);
    }
    
    const programs = repo.searchPrograms(
      input.profile as Partial<StudentProfileInput>,
      input.filters as ProgramFilters | undefined
    );
    
    // Generate suggestions if no results
    const suggestions: string[] = [];
    if (programs.length === 0) {
      if (input.profile.city_preference) {
        suggestions.push('جرب البحث في مدن أخرى / Try searching in other cities');
      }
      if (input.profile.budget_max && input.profile.budget_max < 10000) {
        suggestions.push('جرب زيادة الميزانية للحصول على المزيد من الخيارات / Try increasing your budget for more options');
      }
      if (input.profile.major_keywords?.length) {
        suggestions.push('جرب استخدام كلمات بحث مختلفة / Try using different search keywords');
      }
      suggestions.push('تواصل مع مستشار تعليمي للمساعدة / Contact an education advisor for help');
    }
    
    return {
      success: true,
      data: {
        programs,
        total_count: programs.length,
        filters_applied: filtersApplied,
        suggestions,
      },
      metadata: {
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'SEARCH_ERROR',
        message_ar: 'حدث خطأ أثناء البحث',
        message_en: 'An error occurred during search',
      },
      metadata: {
        timestamp: new Date().toISOString(),
      },
    };
  }
}
