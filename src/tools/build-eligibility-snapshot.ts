/**
 * MCP Tool: build_eligibility_snapshot
 * Evaluates eligibility based on student profile and program requirements
 * Uses data-driven rules only - never guesses
 */

import { z } from 'zod';
import { ProgramRepository } from '../db/repositories/program.repository';
import { 
  EligibilitySnapshotOutput, 
  EligibilityReason, 
  EligibilityStatus,
  ToolResponse,
  StudentProfileInput,
  RequirementOutput
} from '../types';

// Input schema
export const buildEligibilitySnapshotInputSchema = z.object({
  profile: z.object({
    nationality: z.string(),
    current_education_level: z.enum(['high_school', 'bachelor', 'master', 'phd']),
    desired_degree_level: z.enum(['bachelor', 'master', 'phd', 'associate']),
    gpa: z.number().optional(),
    english_score: z.object({
      type: z.enum(['ielts', 'toefl']),
      score: z.number(),
    }).optional(),
    turkish_score: z.object({
      type: z.enum(['tomer']),
      level: z.string(),
    }).optional(),
    has_portfolio: z.boolean().optional(),
    work_experience_years: z.number().optional(),
  }),
  program_id: z.string().min(1, 'Program ID is required'),
});

export type BuildEligibilitySnapshotInput = z.infer<typeof buildEligibilitySnapshotInputSchema>;

const DISCLAIMER_AR = 'هذا التقييم مبني على البيانات المتوفرة وليس قراراً نهائياً بالقبول. يرجى التحقق مع الجامعة مباشرة.';
const DISCLAIMER_EN = 'This assessment is based on available data and is not a final admission decision. Please verify with the university directly.';

export function buildEligibilitySnapshot(
  input: BuildEligibilitySnapshotInput,
  repository?: ProgramRepository
): ToolResponse<EligibilitySnapshotOutput> {
  const repo = repository || new ProgramRepository();
  
  try {
    const programDetail = repo.getProgramDetail(input.program_id);
    
    if (!programDetail) {
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
    
    const reasons: EligibilityReason[] = [];
    const missingInfo: string[] = [];
    const missingFields: string[] = [];
    const assumptions: string[] = [];
    
    // Check education level prerequisite
    const educationLevelOk = checkEducationLevel(
      input.profile.current_education_level,
      programDetail.degree_level
    );
    
    if (!educationLevelOk.passed) {
      reasons.push({
        rule_type: 'other',
        passed: false,
        reason_ar: educationLevelOk.reason_ar,
        reason_en: educationLevelOk.reason_en,
        data_driven: true,
      });
    } else {
      reasons.push({
        rule_type: 'other',
        passed: true,
        reason_ar: 'المستوى التعليمي مناسب للبرنامج',
        reason_en: 'Education level is appropriate for the program',
        data_driven: true,
      });
    }
    
    // Evaluate each requirement
    for (const req of programDetail.requirements) {
      const evaluation = evaluateRequirement(req, input.profile, missingInfo, missingFields, assumptions);
      if (evaluation) {
        reasons.push(evaluation);
      }
    }
    
    // Determine overall status
    const status = determineStatus(reasons, missingInfo);
    
    return {
      success: true,
      data: {
        status,
        reasons,
        missing_info: missingInfo,
        missing_fields: missingFields,
        assumptions,
        disclaimer: `${DISCLAIMER_AR}\n\n${DISCLAIMER_EN}`,
      },
      metadata: {
        timestamp: new Date().toISOString(),
        assumptions,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'ELIGIBILITY_ERROR',
        message_ar: 'حدث خطأ أثناء تقييم الأهلية',
        message_en: 'An error occurred while evaluating eligibility',
      },
      metadata: {
        timestamp: new Date().toISOString(),
      },
    };
  }
}

function checkEducationLevel(
  current: string,
  desired: string
): { passed: boolean; reason_ar: string; reason_en: string } {
  const levelOrder = ['high_school', 'bachelor', 'master', 'phd'];
  const currentIndex = levelOrder.indexOf(current);
  
  // For bachelor, need high_school
  if (desired === 'bachelor' || desired === 'associate') {
    if (currentIndex >= 0) {
      return {
        passed: true,
        reason_ar: 'المستوى التعليمي مناسب',
        reason_en: 'Education level is appropriate',
      };
    }
  }
  
  // For master, need bachelor
  if (desired === 'master') {
    if (current === 'bachelor' || current === 'master' || current === 'phd') {
      return {
        passed: true,
        reason_ar: 'لديك شهادة البكالوريوس المطلوبة',
        reason_en: 'You have the required bachelor degree',
      };
    }
    return {
      passed: false,
      reason_ar: 'برامج الماجستير تتطلب شهادة البكالوريوس',
      reason_en: 'Master programs require a bachelor degree',
    };
  }
  
  // For PhD, need master
  if (desired === 'phd') {
    if (current === 'master' || current === 'phd') {
      return {
        passed: true,
        reason_ar: 'لديك شهادة الماجستير المطلوبة',
        reason_en: 'You have the required master degree',
      };
    }
    return {
      passed: false,
      reason_ar: 'برامج الدكتوراه تتطلب شهادة الماجستير',
      reason_en: 'PhD programs require a master degree',
    };
  }
  
  return {
    passed: true,
    reason_ar: 'المستوى التعليمي مناسب',
    reason_en: 'Education level is appropriate',
  };
}

function evaluateRequirement(
  req: RequirementOutput,
  profile: BuildEligibilitySnapshotInput['profile'],
  missingInfo: string[],
  missingFields: string[],
  assumptions: string[]
): EligibilityReason | null {
  switch (req.rule_type) {
    case 'gpa_minimum': {
      if (profile.gpa === undefined) {
        missingInfo.push('GPA / المعدل التراكمي');
        missingFields.push('gpa');
        // Return null for missing info - don't treat as failure
        return null;
      }
      
      const requiredGpa = parseFloat(req.rule_value);
      const passed = profile.gpa >= requiredGpa;
      
      return {
        rule_type: 'gpa_minimum',
        passed,
        reason_ar: passed 
          ? `معدلك ${profile.gpa} يستوفي الحد الأدنى ${requiredGpa}` 
          : `معدلك ${profile.gpa} أقل من الحد الأدنى المطلوب ${requiredGpa}`,
        reason_en: passed 
          ? `Your GPA ${profile.gpa} meets the minimum ${requiredGpa}` 
          : `Your GPA ${profile.gpa} is below the required minimum ${requiredGpa}`,
        data_driven: true,
      };
    }
    
    case 'language_proficiency': {
      try {
        const langReq = JSON.parse(req.rule_value);
        
        if (langReq.type === 'english') {
          if (!profile.english_score) {
            missingInfo.push('English proficiency score / درجة اللغة الإنجليزية');
            missingFields.push('english_score');
            // Return null for missing info - don't treat as failure
            return null;
          }
          
          let passed = false;
          if (profile.english_score.type === 'ielts' && langReq.ielts) {
            passed = profile.english_score.score >= langReq.ielts;
          } else if (profile.english_score.type === 'toefl' && langReq.toefl) {
            passed = profile.english_score.score >= langReq.toefl;
          }
          
          return {
            rule_type: 'language_proficiency',
            passed,
            reason_ar: passed 
              ? 'درجة اللغة الإنجليزية تستوفي المتطلبات' 
              : 'درجة اللغة الإنجليزية لا تستوفي الحد الأدنى المطلوب',
            reason_en: passed 
              ? 'English score meets the requirements' 
              : 'English score does not meet the minimum requirement',
            data_driven: true,
          };
        }
        
        if (langReq.type === 'turkish') {
          if (!profile.turkish_score) {
            missingInfo.push('Turkish proficiency score / درجة اللغة التركية');
            missingFields.push('turkish_score');
            // Return null for missing info - don't treat as failure
            return null;
          }
          
          // Simple level comparison (B2 is usually minimum)
          const levelOrder = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
          const requiredLevel = langReq.tomer || 'B2';
          const passed = levelOrder.indexOf(profile.turkish_score.level) >= levelOrder.indexOf(requiredLevel);
          
          return {
            rule_type: 'language_proficiency',
            passed,
            reason_ar: passed 
              ? 'مستوى اللغة التركية يستوفي المتطلبات' 
              : `مستوى اللغة التركية لا يستوفي الحد الأدنى المطلوب (${requiredLevel})`,
            reason_en: passed 
              ? 'Turkish level meets the requirements' 
              : `Turkish level does not meet the minimum requirement (${requiredLevel})`,
            data_driven: true,
          };
        }
      } catch {
        assumptions.push('Could not parse language requirement - defaulting to needs review');
      }
      break;
    }
    
    case 'portfolio_required': {
      if (profile.has_portfolio === undefined) {
        missingInfo.push('Portfolio status / حالة ملف الأعمال');
        missingFields.push('has_portfolio');
        // Return null for missing info - don't treat as failure
        return null;
      }
      
      const passed = profile.has_portfolio === true;
      return {
        rule_type: 'portfolio_required',
        passed,
        reason_ar: passed 
          ? 'لديك ملف أعمال' 
          : 'يتطلب البرنامج تقديم ملف أعمال',
        reason_en: passed 
          ? 'You have a portfolio' 
          : 'Program requires a portfolio submission',
        data_driven: true,
      };
    }
    
    case 'work_experience': {
      if (profile.work_experience_years === undefined) {
        missingInfo.push('Work experience / الخبرة العملية');
        missingFields.push('work_experience_years');
        // Return null for missing info - don't treat as failure
        return null;
      }
      break;
    }
    
    default:
      // For unknown requirements, flag as needs review
      assumptions.push(`Unknown requirement type: ${req.rule_type}`);
      break;
  }
  
  return null;
}

function determineStatus(reasons: EligibilityReason[], missingInfo: string[]): EligibilityStatus {
  // Key principle: 
  // 1. Explicit disqualifiers (education level, GPA below min) → "unlikely"
  // 2. Missing data → "needs_review" (NOT unlikely)
  // 3. All requirements met → "likely_eligible"
  
  // First, check for explicit disqualifiers (actual failures, not missing data)
  // These should result in "unlikely" regardless of missing info
  const failedRequired = reasons.filter(r => !r.passed && r.data_driven);
  
  if (failedRequired.length > 0) {
    // Check if it's a major/hard failure (education level prerequisite, GPA below minimum)
    const majorFailures = failedRequired.filter(r => 
      r.rule_type === 'gpa_minimum' || 
      r.reason_en.toLowerCase().includes('education level') ||
      r.reason_en.toLowerCase().includes('bachelor degree') ||
      r.reason_en.toLowerCase().includes('master degree') ||
      r.reason_en.toLowerCase().includes('require a bachelor') ||
      r.reason_en.toLowerCase().includes('require a master')
    );
    
    if (majorFailures.length > 0) {
      return 'unlikely';
    }
  }
  
  // If any required info is missing but no hard disqualifiers, status is needs_review
  if (missingInfo.length > 0) {
    return 'needs_review';
  }
  
  // If all passed, likely eligible
  const allPassed = reasons.every(r => r.passed);
  if (allPassed) {
    return 'likely_eligible';
  }
  
  return 'needs_review';
}
