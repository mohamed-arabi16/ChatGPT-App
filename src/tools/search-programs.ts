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
  /** Original keywords and their expansions that were searched */
  query_info: {
    original_keywords: string[];
    expanded_keywords: string[];
    synonyms_applied: string[];
  };
  suggestions: string[];
  /** Near-equivalent programs when exact match fails (e.g., CS when CE not found) */
  near_equivalents: ProgramSearchResult[];
}

/**
 * Synonym groups for major/program keywords
 * Maps related terms together for better search matching
 */
const KEYWORD_SYNONYMS: Record<string, string[]> = {
  // Computer Engineering group
  'computer engineering': ['ce', 'ceng', 'comp eng', 'bilgisayar mühendisliği', 'هندسة الحاسوب', 'هندسة حاسوب'],
  'ce': ['computer engineering', 'ceng', 'comp eng', 'bilgisayar mühendisliği', 'هندسة الحاسوب'],
  'ceng': ['computer engineering', 'ce', 'comp eng', 'bilgisayar mühendisliği', 'هندسة الحاسوب'],
  
  // Computer Science group
  'computer science': ['cs', 'comp sci', 'bilgisayar bilimleri', 'علوم الحاسوب', 'علوم حاسوب'],
  'cs': ['computer science', 'comp sci', 'bilgisayar bilimleri', 'علوم الحاسوب'],
  
  // Software Engineering group
  'software engineering': ['se', 'soft eng', 'yazılım mühendisliği', 'هندسة البرمجيات'],
  'se': ['software engineering', 'soft eng', 'yazılım mühendisliği', 'هندسة البرمجيات'],
  
  // Electrical & Electronics Engineering group
  'electrical engineering': ['ee', 'elec eng', 'elektrik mühendisliği', 'الهندسة الكهربائية', 'هندسة كهربائية'],
  'ee': ['electrical engineering', 'elec eng', 'elektrik mühendisliği', 'الهندسة الكهربائية'],
  'electronics': ['electronic engineering', 'elektronik', 'إلكترونيات'],
  
  // Business group
  'business administration': ['ba', 'business', 'işletme', 'إدارة الأعمال', 'ادارة اعمال'],
  'mba': ['master of business administration', 'business administration', 'ماجستير إدارة الأعمال'],
  
  // Medicine group
  'medicine': ['md', 'tıp', 'الطب', 'طب'],
  'medical': ['medicine', 'tıp', 'طب'],
  
  // Architecture group
  'architecture': ['arch', 'mimarlık', 'الهندسة المعمارية', 'عمارة'],
  
  // Law group
  'law': ['llb', 'hukuk', 'القانون', 'قانون'],
  
  // Psychology group
  'psychology': ['psych', 'psikoloji', 'علم النفس'],
  
  // Nursing group
  'nursing': ['hemşirelik', 'التمريض', 'تمريض'],
  
  // Engineering general
  'engineering': ['eng', 'mühendislik', 'هندسة'],
};

/**
 * Near-equivalent major categories
 * When one major is searched but not found, suggest these alternatives
 */
const NEAR_EQUIVALENTS: Record<string, string[]> = {
  'computer engineering': ['computer science', 'software engineering', 'electrical engineering'],
  'computer science': ['computer engineering', 'software engineering', 'artificial intelligence'],
  'software engineering': ['computer science', 'computer engineering'],
  'electrical engineering': ['electronics', 'computer engineering', 'mechanical engineering'],
  'business administration': ['economics', 'international business', 'finance'],
};

/**
 * Normalize a keyword for better matching
 * - Lowercase
 * - Remove punctuation
 * - Trim whitespace
 */
function normalizeKeyword(keyword: string): string {
  return keyword
    .toLowerCase()
    .replace(/[^\w\s\u0600-\u06FF]/g, '') // Keep alphanumeric, whitespace, and Arabic chars
    .trim();
}

/**
 * Expand keywords with synonyms
 * Returns the original keywords plus their synonyms
 */
function expandKeywords(keywords: string[]): { 
  expanded: string[]; 
  synonymsApplied: string[]; 
} {
  const expanded = new Set<string>();
  const synonymsApplied: string[] = [];
  
  for (const keyword of keywords) {
    const normalized = normalizeKeyword(keyword);
    expanded.add(normalized);
    
    // Check if this keyword has synonyms
    const synonyms = KEYWORD_SYNONYMS[normalized];
    if (synonyms) {
      synonymsApplied.push(`"${keyword}" → [${synonyms.slice(0, 3).join(', ')}${synonyms.length > 3 ? '...' : ''}]`);
      for (const syn of synonyms) {
        expanded.add(normalizeKeyword(syn));
      }
    }
    
    // Also check if any synonym group contains this keyword
    for (const [mainTerm, syns] of Object.entries(KEYWORD_SYNONYMS)) {
      if (syns.some(s => normalizeKeyword(s) === normalized)) {
        expanded.add(normalizeKeyword(mainTerm));
        for (const syn of syns) {
          expanded.add(normalizeKeyword(syn));
        }
      }
    }
  }
  
  return {
    expanded: Array.from(expanded),
    synonymsApplied,
  };
}

/**
 * Get near-equivalent keywords for suggestions
 */
function getNearEquivalentKeywords(keywords: string[]): string[] {
  const equivalents = new Set<string>();
  
  for (const keyword of keywords) {
    const normalized = normalizeKeyword(keyword);
    const nearEq = NEAR_EQUIVALENTS[normalized];
    if (nearEq) {
      for (const eq of nearEq) {
        equivalents.add(eq);
      }
    }
  }
  
  return Array.from(equivalents);
}

export function searchPrograms(
  input: SearchProgramsInput,
  repository?: ProgramRepository
): ToolResponse<SearchProgramsOutput> {
  const repo = repository || new ProgramRepository();
  
  try {
    const filtersApplied: string[] = [];
    const originalKeywords = input.profile.major_keywords || [];
    
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
    if (originalKeywords.length) {
      filtersApplied.push(`keywords: ${originalKeywords.join(', ')}`);
    }
    
    // Expand keywords with synonyms
    const { expanded: expandedKeywords, synonymsApplied } = expandKeywords(originalKeywords);
    
    // Create a modified profile with expanded keywords
    const expandedProfile = {
      ...input.profile,
      major_keywords: expandedKeywords.length > 0 ? expandedKeywords : undefined,
    };
    
    const programs = repo.searchPrograms(
      expandedProfile as Partial<StudentProfileInput>,
      input.filters as ProgramFilters | undefined
    );
    
    // Generate suggestions and near-equivalents if no results
    const suggestions: string[] = [];
    let nearEquivalents: ProgramSearchResult[] = [];
    
    if (programs.length === 0) {
      if (input.profile.city_preference) {
        suggestions.push('جرب البحث في مدن أخرى / Try searching in other cities');
      }
      if (input.profile.budget_max && input.profile.budget_max < 10000) {
        suggestions.push('جرب زيادة الميزانية للحصول على المزيد من الخيارات / Try increasing your budget for more options');
      }
      if (originalKeywords.length) {
        // Suggest near-equivalent programs
        const nearEqKeywords = getNearEquivalentKeywords(originalKeywords);
        if (nearEqKeywords.length > 0) {
          suggestions.push(`هل تقبل بدائل مثل: ${nearEqKeywords.join('، ')}؟ / Would you accept alternatives like: ${nearEqKeywords.join(', ')}?`);
          
          // Actually search for near-equivalents
          const nearEqExpanded = expandKeywords(nearEqKeywords);
          const nearEqProfile = {
            ...input.profile,
            major_keywords: nearEqExpanded.expanded,
          };
          nearEquivalents = repo.searchPrograms(
            nearEqProfile as Partial<StudentProfileInput>,
            input.filters as ProgramFilters | undefined
          );
        } else {
          suggestions.push('جرب استخدام كلمات بحث مختلفة / Try using different search keywords');
        }
      }
      suggestions.push('تواصل مع مستشار تعليمي للمساعدة / Contact an education advisor for help');
    }
    
    return {
      success: true,
      data: {
        programs,
        total_count: programs.length,
        filters_applied: filtersApplied,
        query_info: {
          original_keywords: originalKeywords,
          expanded_keywords: expandedKeywords,
          synonyms_applied: synonymsApplied,
        },
        suggestions,
        near_equivalents: nearEquivalents,
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
