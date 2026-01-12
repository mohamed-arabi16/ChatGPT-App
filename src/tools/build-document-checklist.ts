/**
 * MCP Tool: build_document_checklist
 * Generates personalized document checklist based on profile and program
 */

import { z } from 'zod';
import { ProgramRepository } from '../db/repositories/program.repository';
import { 
  DocumentChecklistOutput, 
  ChecklistItemOutput,
  ToolResponse,
} from '../types';

// Input schema
export const buildDocumentChecklistInputSchema = z.object({
  profile: z.object({
    nationality: z.string(),
    current_education_level: z.enum(['high_school', 'bachelor', 'master', 'phd']),
    desired_degree_level: z.enum(['bachelor', 'master', 'phd', 'associate']),
  }),
  program_id: z.string().min(1, 'Program ID is required'),
});

export type BuildDocumentChecklistInput = z.infer<typeof buildDocumentChecklistInputSchema>;

// Why needed explanations by document type
const WHY_NEEDED: Record<string, { ar: string; en: string }> = {
  high_school_diploma: {
    ar: 'مطلوبة لإثبات إكمال التعليم الثانوي',
    en: 'Required to prove completion of secondary education',
  },
  high_school_transcript: {
    ar: 'مطلوبة لتقييم أدائك الأكاديمي',
    en: 'Required to evaluate your academic performance',
  },
  passport_copy: {
    ar: 'مطلوبة للتحقق من الهوية وتقديم طلب التأشيرة',
    en: 'Required for identity verification and visa application',
  },
  personal_photo: {
    ar: 'مطلوبة لملف الطالب وبطاقة الجامعة',
    en: 'Required for student file and university ID card',
  },
  english_proficiency: {
    ar: 'مطلوبة لإثبات القدرة على الدراسة باللغة الإنجليزية',
    en: 'Required to demonstrate ability to study in English',
  },
  turkish_proficiency: {
    ar: 'مطلوبة لإثبات القدرة على الدراسة باللغة التركية',
    en: 'Required to demonstrate ability to study in Turkish',
  },
  bachelor_diploma: {
    ar: 'مطلوبة لإثبات الحصول على درجة البكالوريوس',
    en: 'Required to prove completion of bachelor degree',
  },
  bachelor_transcript: {
    ar: 'مطلوبة لتقييم أدائك الأكاديمي في البكالوريوس',
    en: 'Required to evaluate your undergraduate academic performance',
  },
  cv_resume: {
    ar: 'مطلوبة لعرض خبراتك ومهاراتك',
    en: 'Required to showcase your experience and skills',
  },
  motivation_letter: {
    ar: 'مطلوبة لشرح أسباب اختيارك للبرنامج',
    en: 'Required to explain your reasons for choosing the program',
  },
  recommendation_letters: {
    ar: 'مطلوبة لتقديم تقييم أكاديمي من أساتذتك',
    en: 'Required to provide academic evaluation from your professors',
  },
  master_diploma: {
    ar: 'مطلوبة لإثبات الحصول على درجة الماجستير',
    en: 'Required to prove completion of master degree',
  },
  master_transcript: {
    ar: 'مطلوبة لتقييم أدائك الأكاديمي في الماجستير',
    en: 'Required to evaluate your graduate academic performance',
  },
  research_proposal: {
    ar: 'مطلوبة لتوضيح مجال البحث الذي ترغب في دراسته',
    en: 'Required to outline your intended research area',
  },
  portfolio: {
    ar: 'مطلوبة لعرض أعمالك الفنية أو التصميمية',
    en: 'Required to showcase your artistic or design work',
  },
  health_certificate: {
    ar: 'مطلوبة للتأكد من اللياقة الصحية للبرنامج',
    en: 'Required to verify health fitness for the program',
  },
};

export function buildDocumentChecklist(
  input: BuildDocumentChecklistInput,
  repository?: ProgramRepository
): ToolResponse<DocumentChecklistOutput> {
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
    
    const items: ChecklistItemOutput[] = [];
    const unknowns: string[] = [];
    const assumptions: string[] = [];
    
    // Process documents from program
    for (const doc of programDetail.documents) {
      const whyNeeded = WHY_NEEDED[doc.doc_key] || {
        ar: 'مطلوبة وفقاً لمتطلبات البرنامج',
        en: 'Required according to program requirements',
      };
      
      // Determine applicability based on profile
      let appliesTo = 'جميع المتقدمين / All applicants';
      
      if (doc.doc_key.includes('bachelor') && input.profile.current_education_level === 'high_school') {
        continue; // Skip bachelor docs for high school students
      }
      
      if (doc.doc_key.includes('master') && 
          !['master', 'phd'].includes(input.profile.current_education_level)) {
        continue; // Skip master docs for non-graduate students
      }
      
      // Check if notarization/translation info is unknown
      if (doc.translation_required && doc.notarization_required) {
        assumptions.push(`${doc.label_en} requires both translation and notarization based on default rules`);
      }
      
      items.push({
        doc_key: doc.doc_key,
        label_ar: doc.label_ar,
        label_en: doc.label_en,
        applies_to: appliesTo,
        required: doc.required,
        translation_required: doc.translation_required,
        notarization_required: doc.notarization_required,
        apostille_notes: getApostilleNotes(input.profile.nationality),
        why_needed_ar: whyNeeded.ar,
        why_needed_en: whyNeeded.en,
        priority: doc.required ? 'required' : 'recommended',
        estimated_days: doc.estimated_days,
      });
    }
    
    // Sort: required first, then by estimated days
    items.sort((a, b) => {
      if (a.priority === 'required' && b.priority !== 'required') return -1;
      if (b.priority === 'required' && a.priority !== 'required') return 1;
      return (a.estimated_days || 0) - (b.estimated_days || 0);
    });
    
    // Check for missing document info
    if (programDetail.documents.length === 0) {
      unknowns.push('Document requirements not available for this program / متطلبات الوثائق غير متوفرة لهذا البرنامج');
    }
    
    return {
      success: true,
      data: {
        items,
        unknowns,
        assumptions,
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
        code: 'CHECKLIST_ERROR',
        message_ar: 'حدث خطأ أثناء إنشاء قائمة الوثائق',
        message_en: 'An error occurred while generating the document checklist',
      },
      metadata: {
        timestamp: new Date().toISOString(),
      },
    };
  }
}

function getApostilleNotes(nationality: string): string | null {
  // Countries that are part of Hague Convention require apostille
  // This is a simplified list - in production, use a comprehensive database
  const hagueCountries = [
    'Saudi Arabia', 'UAE', 'Egypt', 'Jordan', 'Morocco', 'Tunisia',
    'Kuwait', 'Qatar', 'Bahrain', 'Oman', 'Algeria', 'Iraq', 'Libya',
    'Syria', 'Lebanon', 'Palestine', 'Yemen', 'Sudan'
  ];
  
  const lowerNationality = nationality.toLowerCase();
  
  // Most Arab countries require legalization through embassy chain
  if (hagueCountries.some(c => lowerNationality.includes(c.toLowerCase()))) {
    return 'قد تتطلب التصديق من السفارة التركية / May require attestation from Turkish Embassy';
  }
  
  return 'يرجى التحقق من متطلبات التصديق الخاصة ببلدك / Please verify attestation requirements for your country';
}
