/**
 * MCP Tool: build_timeline
 * Generates week-by-week timeline for application preparation
 */

import { z } from 'zod';
import { ProgramRepository } from '../db/repositories/program.repository';
import { 
  TimelineOutput, 
  TimelineWeek,
  TimelineTask,
  ToolResponse,
} from '../types';
import { buildDocumentChecklist } from './build-document-checklist';

// Input schema
export const buildTimelineInputSchema = z.object({
  profile: z.object({
    nationality: z.string(),
    current_education_level: z.enum(['high_school', 'bachelor', 'master', 'phd']),
    desired_degree_level: z.enum(['bachelor', 'master', 'phd', 'associate']),
  }),
  program_id: z.string().min(1, 'Program ID is required'),
  intake_target: z.string().optional(), // e.g., "September 2024" or "Fall 2024"
});

export type BuildTimelineInput = z.infer<typeof buildTimelineInputSchema>;

// Default task durations in days
const DEFAULT_TASK_DURATIONS: Record<string, number> = {
  high_school_diploma: 7,
  high_school_transcript: 5,
  passport_copy: 1,
  personal_photo: 1,
  english_proficiency: 14,
  turkish_proficiency: 14,
  bachelor_diploma: 7,
  bachelor_transcript: 5,
  cv_resume: 3,
  motivation_letter: 5,
  recommendation_letters: 14,
  master_diploma: 7,
  master_transcript: 5,
  research_proposal: 21,
  portfolio: 21,
  health_certificate: 7,
  translation: 5,
  notarization: 3,
  submission: 1,
};

export function buildTimeline(
  input: BuildTimelineInput,
  repository?: ProgramRepository
): ToolResponse<TimelineOutput> {
  const repo = repository || new ProgramRepository();
  
  try {
    // First get the checklist to know what documents are needed
    const checklistResponse = buildDocumentChecklist(
      {
        profile: input.profile,
        program_id: input.program_id,
      },
      repo
    );
    
    if (!checklistResponse.success || !checklistResponse.data) {
      return {
        success: false,
        error: {
          code: 'CHECKLIST_ERROR',
          message_ar: 'لم نتمكن من تحديد المستندات المطلوبة',
          message_en: 'Could not determine required documents',
        },
        metadata: {
          timestamp: new Date().toISOString(),
        },
      };
    }
    
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
    
    const assumptions: string[] = [];
    const criticalPathItems: string[] = [];
    
    // Calculate total timeline based on checklist items
    const tasks: Array<{
      doc_key: string;
      label_ar: string;
      label_en: string;
      estimated_days: number;
      required: boolean;
    }> = [];
    
    for (const item of checklistResponse.data.items) {
      let totalDays = item.estimated_days || DEFAULT_TASK_DURATIONS[item.doc_key] || 7;
      
      // Add time for translation if required
      if (item.translation_required) {
        totalDays += DEFAULT_TASK_DURATIONS.translation;
      }
      
      // Add time for notarization if required
      if (item.notarization_required) {
        totalDays += DEFAULT_TASK_DURATIONS.notarization;
      }
      
      tasks.push({
        doc_key: item.doc_key,
        label_ar: item.label_ar,
        label_en: item.label_en,
        estimated_days: totalDays,
        required: item.priority === 'required',
      });
    }
    
    // Sort by estimated days (longest first - critical path)
    tasks.sort((a, b) => b.estimated_days - a.estimated_days);
    
    // Find critical path (items with longest duration)
    const maxDuration = tasks.length > 0 ? tasks[0].estimated_days : 0;
    for (const task of tasks) {
      if (task.estimated_days >= maxDuration * 0.7) { // 70% of max duration
        criticalPathItems.push(task.doc_key);
      }
    }
    
    // Determine intake date
    let targetIntake = input.intake_target || 'September'; // Default to Fall
    let intakeDateKnown = false;
    
    if (programDetail.intakes.length > 0) {
      // Try to match intake preference
      if (input.intake_target) {
        const matchingIntake = programDetail.intakes.find(i => 
          i.toLowerCase().includes(input.intake_target!.toLowerCase()) ||
          input.intake_target!.toLowerCase().includes(i.toLowerCase())
        );
        if (matchingIntake) {
          targetIntake = matchingIntake;
          intakeDateKnown = true;
        }
      } else {
        targetIntake = programDetail.intakes[0];
        intakeDateKnown = true;
      }
    } else {
      assumptions.push('Intake dates not available - using generic 8-week timeline');
    }
    
    // Generate week-by-week schedule
    const weeks = generateWeeklySchedule(tasks, intakeDateKnown ? 8 : 8, criticalPathItems);
    
    if (!intakeDateKnown) {
      assumptions.push('Timeline is based on an 8-week preparation period');
    }
    
    if (tasks.some(t => !t.estimated_days)) {
      assumptions.push('Some task durations are estimated based on typical processing times');
    }
    
    return {
      success: true,
      data: {
        weeks,
        critical_path_items: criticalPathItems,
        target_intake: targetIntake,
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
        code: 'TIMELINE_ERROR',
        message_ar: 'حدث خطأ أثناء إنشاء الجدول الزمني',
        message_en: 'An error occurred while generating the timeline',
      },
      metadata: {
        timestamp: new Date().toISOString(),
      },
    };
  }
}

function generateWeeklySchedule(
  tasks: Array<{
    doc_key: string;
    label_ar: string;
    label_en: string;
    estimated_days: number;
    required: boolean;
  }>,
  totalWeeks: number,
  criticalPathItems: string[]
): TimelineWeek[] {
  const weeks: TimelineWeek[] = [];
  const today = new Date();
  
  // Group tasks by urgency/priority
  const criticalTasks = tasks.filter(t => criticalPathItems.includes(t.doc_key) && t.required);
  const requiredTasks = tasks.filter(t => !criticalPathItems.includes(t.doc_key) && t.required);
  const optionalTasks = tasks.filter(t => !t.required);
  
  // Distribute tasks across weeks
  // Week 1-2: Start critical path items
  // Week 3-4: Continue critical, start required
  // Week 5-6: Complete required, translations
  // Week 7-8: Final review and submission
  
  for (let weekNum = 1; weekNum <= totalWeeks; weekNum++) {
    const startDate = new Date(today);
    startDate.setDate(today.getDate() + (weekNum - 1) * 7);
    
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    
    const weekTasks: TimelineTask[] = [];
    
    if (weekNum <= 2) {
      // Focus on critical path items
      for (const task of criticalTasks.slice(0, 2)) {
        weekTasks.push({
          doc_key: task.doc_key,
          task_ar: `ابدأ بالحصول على ${task.label_ar}`,
          task_en: `Start obtaining ${task.label_en}`,
          is_critical_path: true,
          estimated_days: task.estimated_days,
        });
      }
    } else if (weekNum <= 4) {
      // Continue critical, add required items
      const remainingCritical = criticalTasks.slice(2);
      for (const task of remainingCritical.slice(0, 1)) {
        weekTasks.push({
          doc_key: task.doc_key,
          task_ar: `متابعة ${task.label_ar}`,
          task_en: `Follow up on ${task.label_en}`,
          is_critical_path: true,
          estimated_days: task.estimated_days,
        });
      }
      
      for (const task of requiredTasks.slice(0, 2)) {
        weekTasks.push({
          doc_key: task.doc_key,
          task_ar: `ابدأ بالحصول على ${task.label_ar}`,
          task_en: `Start obtaining ${task.label_en}`,
          is_critical_path: false,
          estimated_days: task.estimated_days,
        });
      }
    } else if (weekNum <= 6) {
      // Complete required items
      for (const task of requiredTasks.slice(2)) {
        weekTasks.push({
          doc_key: task.doc_key,
          task_ar: `إكمال ${task.label_ar}`,
          task_en: `Complete ${task.label_en}`,
          is_critical_path: false,
          estimated_days: task.estimated_days,
        });
      }
      
      // Add translation/notarization task
      weekTasks.push({
        doc_key: 'translation_notarization',
        task_ar: 'إرسال الوثائق للترجمة والتوثيق',
        task_en: 'Submit documents for translation and notarization',
        is_critical_path: true,
        estimated_days: 8,
      });
    } else {
      // Final weeks: review and submit
      weekTasks.push({
        doc_key: 'final_review',
        task_ar: 'مراجعة نهائية لجميع الوثائق',
        task_en: 'Final review of all documents',
        is_critical_path: false,
        estimated_days: 2,
      });
      
      if (weekNum === totalWeeks) {
        weekTasks.push({
          doc_key: 'submission',
          task_ar: 'تقديم طلب الالتحاق',
          task_en: 'Submit application',
          is_critical_path: true,
          estimated_days: 1,
        });
      }
    }
    
    weeks.push({
      week_number: weekNum,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      tasks: weekTasks,
    });
  }
  
  return weeks;
}
