/**
 * Database seed script
 * Creates sample data for UniTR Admissions Assistant with 30+ programs
 */

import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from './connection';
import { runMigrations } from './migrate';

interface SeedUniversity {
  id: string;
  name_ar: string;
  name_en: string;
  city: string;
  website: string | null;
}

interface SeedProgram {
  id: string;
  university_id: string;
  program_name_ar: string;
  program_name_en: string;
  degree_level: string;
  language: string;
  city: string;
  tuition_min: number;
  tuition_max: number;
  currency: string;
  intakes: string[];
}

// Sample Universities
const universities: SeedUniversity[] = [
  {
    id: 'univ-istanbul-aydin',
    name_ar: 'جامعة إسطنبول آيدن',
    name_en: 'Istanbul Aydin University',
    city: 'Istanbul',
    website: 'https://www.aydin.edu.tr'
  },
  {
    id: 'univ-bahcesehir',
    name_ar: 'جامعة بهتشه شهير',
    name_en: 'Bahcesehir University',
    city: 'Istanbul',
    website: 'https://www.bau.edu.tr'
  },
  {
    id: 'univ-altinbas',
    name_ar: 'جامعة التنباش',
    name_en: 'Altinbas University',
    city: 'Istanbul',
    website: 'https://www.altinbas.edu.tr'
  },
  {
    id: 'univ-istanbul-medipol',
    name_ar: 'جامعة إسطنبول ميديبول',
    name_en: 'Istanbul Medipol University',
    city: 'Istanbul',
    website: 'https://www.medipol.edu.tr'
  },
  {
    id: 'univ-ankara-bilkent',
    name_ar: 'جامعة بيلكنت',
    name_en: 'Bilkent University',
    city: 'Ankara',
    website: 'https://www.bilkent.edu.tr'
  },
  {
    id: 'univ-izmir-ekonomi',
    name_ar: 'جامعة إزمير الاقتصادية',
    name_en: 'Izmir University of Economics',
    city: 'Izmir',
    website: 'https://www.ieu.edu.tr'
  },
  {
    id: 'univ-ozyegin',
    name_ar: 'جامعة أوزيجين',
    name_en: 'Ozyegin University',
    city: 'Istanbul',
    website: 'https://www.ozyegin.edu.tr'
  },
  {
    id: 'univ-koc',
    name_ar: 'جامعة كوتش',
    name_en: 'Koc University',
    city: 'Istanbul',
    website: 'https://www.ku.edu.tr'
  }
];

// Sample Programs (30+ programs)
const programs: SeedProgram[] = [
  // Istanbul Aydin University
  {
    id: 'prog-aydin-cs-bs',
    university_id: 'univ-istanbul-aydin',
    program_name_ar: 'علوم الحاسوب',
    program_name_en: 'Computer Science',
    degree_level: 'bachelor',
    language: 'en',
    city: 'Istanbul',
    tuition_min: 4500,
    tuition_max: 5500,
    currency: 'USD',
    intakes: ['September', 'February']
  },
  {
    id: 'prog-aydin-ba-bs',
    university_id: 'univ-istanbul-aydin',
    program_name_ar: 'إدارة الأعمال',
    program_name_en: 'Business Administration',
    degree_level: 'bachelor',
    language: 'en',
    city: 'Istanbul',
    tuition_min: 4000,
    tuition_max: 5000,
    currency: 'USD',
    intakes: ['September', 'February']
  },
  {
    id: 'prog-aydin-medicine-md',
    university_id: 'univ-istanbul-aydin',
    program_name_ar: 'الطب البشري',
    program_name_en: 'Medicine',
    degree_level: 'bachelor',
    language: 'en',
    city: 'Istanbul',
    tuition_min: 20000,
    tuition_max: 25000,
    currency: 'USD',
    intakes: ['September']
  },
  {
    id: 'prog-aydin-dentistry-dds',
    university_id: 'univ-istanbul-aydin',
    program_name_ar: 'طب الأسنان',
    program_name_en: 'Dentistry',
    degree_level: 'bachelor',
    language: 'en',
    city: 'Istanbul',
    tuition_min: 18000,
    tuition_max: 22000,
    currency: 'USD',
    intakes: ['September']
  },
  // Bahcesehir University
  {
    id: 'prog-bau-cs-bs',
    university_id: 'univ-bahcesehir',
    program_name_ar: 'علوم الحاسوب',
    program_name_en: 'Computer Science',
    degree_level: 'bachelor',
    language: 'en',
    city: 'Istanbul',
    tuition_min: 8500,
    tuition_max: 9500,
    currency: 'USD',
    intakes: ['September', 'February']
  },
  {
    id: 'prog-bau-arch-bs',
    university_id: 'univ-bahcesehir',
    program_name_ar: 'الهندسة المعمارية',
    program_name_en: 'Architecture',
    degree_level: 'bachelor',
    language: 'en',
    city: 'Istanbul',
    tuition_min: 8000,
    tuition_max: 9000,
    currency: 'USD',
    intakes: ['September']
  },
  {
    id: 'prog-bau-law-llb',
    university_id: 'univ-bahcesehir',
    program_name_ar: 'القانون',
    program_name_en: 'Law',
    degree_level: 'bachelor',
    language: 'tr',
    city: 'Istanbul',
    tuition_min: 7000,
    tuition_max: 8000,
    currency: 'USD',
    intakes: ['September']
  },
  {
    id: 'prog-bau-mba',
    university_id: 'univ-bahcesehir',
    program_name_ar: 'ماجستير إدارة الأعمال',
    program_name_en: 'MBA',
    degree_level: 'master',
    language: 'en',
    city: 'Istanbul',
    tuition_min: 15000,
    tuition_max: 18000,
    currency: 'USD',
    intakes: ['September', 'February']
  },
  // Altinbas University
  {
    id: 'prog-altinbas-ee-bs',
    university_id: 'univ-altinbas',
    program_name_ar: 'الهندسة الكهربائية',
    program_name_en: 'Electrical Engineering',
    degree_level: 'bachelor',
    language: 'en',
    city: 'Istanbul',
    tuition_min: 4000,
    tuition_max: 5000,
    currency: 'USD',
    intakes: ['September', 'February']
  },
  {
    id: 'prog-altinbas-me-bs',
    university_id: 'univ-altinbas',
    program_name_ar: 'الهندسة الميكانيكية',
    program_name_en: 'Mechanical Engineering',
    degree_level: 'bachelor',
    language: 'en',
    city: 'Istanbul',
    tuition_min: 4000,
    tuition_max: 5000,
    currency: 'USD',
    intakes: ['September', 'February']
  },
  {
    id: 'prog-altinbas-nursing-bs',
    university_id: 'univ-altinbas',
    program_name_ar: 'التمريض',
    program_name_en: 'Nursing',
    degree_level: 'bachelor',
    language: 'tr',
    city: 'Istanbul',
    tuition_min: 3500,
    tuition_max: 4500,
    currency: 'USD',
    intakes: ['September']
  },
  // Istanbul Medipol University
  {
    id: 'prog-medipol-medicine-md',
    university_id: 'univ-istanbul-medipol',
    program_name_ar: 'الطب البشري',
    program_name_en: 'Medicine',
    degree_level: 'bachelor',
    language: 'en',
    city: 'Istanbul',
    tuition_min: 25000,
    tuition_max: 30000,
    currency: 'USD',
    intakes: ['September']
  },
  {
    id: 'prog-medipol-pharmacy-bs',
    university_id: 'univ-istanbul-medipol',
    program_name_ar: 'الصيدلة',
    program_name_en: 'Pharmacy',
    degree_level: 'bachelor',
    language: 'en',
    city: 'Istanbul',
    tuition_min: 12000,
    tuition_max: 15000,
    currency: 'USD',
    intakes: ['September']
  },
  {
    id: 'prog-medipol-pt-bs',
    university_id: 'univ-istanbul-medipol',
    program_name_ar: 'العلاج الطبيعي',
    program_name_en: 'Physiotherapy',
    degree_level: 'bachelor',
    language: 'en',
    city: 'Istanbul',
    tuition_min: 6000,
    tuition_max: 8000,
    currency: 'USD',
    intakes: ['September', 'February']
  },
  {
    id: 'prog-medipol-psychology-bs',
    university_id: 'univ-istanbul-medipol',
    program_name_ar: 'علم النفس',
    program_name_en: 'Psychology',
    degree_level: 'bachelor',
    language: 'en',
    city: 'Istanbul',
    tuition_min: 5000,
    tuition_max: 6500,
    currency: 'USD',
    intakes: ['September', 'February']
  },
  // Bilkent University (Ankara)
  {
    id: 'prog-bilkent-cs-bs',
    university_id: 'univ-ankara-bilkent',
    program_name_ar: 'علوم الحاسوب',
    program_name_en: 'Computer Science',
    degree_level: 'bachelor',
    language: 'en',
    city: 'Ankara',
    tuition_min: 14000,
    tuition_max: 16000,
    currency: 'USD',
    intakes: ['September']
  },
  {
    id: 'prog-bilkent-ee-bs',
    university_id: 'univ-ankara-bilkent',
    program_name_ar: 'الهندسة الكهربائية',
    program_name_en: 'Electrical Engineering',
    degree_level: 'bachelor',
    language: 'en',
    city: 'Ankara',
    tuition_min: 14000,
    tuition_max: 16000,
    currency: 'USD',
    intakes: ['September']
  },
  {
    id: 'prog-bilkent-econ-bs',
    university_id: 'univ-ankara-bilkent',
    program_name_ar: 'الاقتصاد',
    program_name_en: 'Economics',
    degree_level: 'bachelor',
    language: 'en',
    city: 'Ankara',
    tuition_min: 14000,
    tuition_max: 16000,
    currency: 'USD',
    intakes: ['September']
  },
  {
    id: 'prog-bilkent-ir-bs',
    university_id: 'univ-ankara-bilkent',
    program_name_ar: 'العلاقات الدولية',
    program_name_en: 'International Relations',
    degree_level: 'bachelor',
    language: 'en',
    city: 'Ankara',
    tuition_min: 14000,
    tuition_max: 16000,
    currency: 'USD',
    intakes: ['September']
  },
  // Izmir University of Economics
  {
    id: 'prog-ieu-ba-bs',
    university_id: 'univ-izmir-ekonomi',
    program_name_ar: 'إدارة الأعمال',
    program_name_en: 'Business Administration',
    degree_level: 'bachelor',
    language: 'en',
    city: 'Izmir',
    tuition_min: 7000,
    tuition_max: 8500,
    currency: 'USD',
    intakes: ['September', 'February']
  },
  {
    id: 'prog-ieu-ie-bs',
    university_id: 'univ-izmir-ekonomi',
    program_name_ar: 'الهندسة الصناعية',
    program_name_en: 'Industrial Engineering',
    degree_level: 'bachelor',
    language: 'en',
    city: 'Izmir',
    tuition_min: 7500,
    tuition_max: 9000,
    currency: 'USD',
    intakes: ['September']
  },
  {
    id: 'prog-ieu-fashion-bs',
    university_id: 'univ-izmir-ekonomi',
    program_name_ar: 'تصميم الأزياء',
    program_name_en: 'Fashion Design',
    degree_level: 'bachelor',
    language: 'en',
    city: 'Izmir',
    tuition_min: 6500,
    tuition_max: 8000,
    currency: 'USD',
    intakes: ['September']
  },
  // Ozyegin University
  {
    id: 'prog-ozyegin-cs-bs',
    university_id: 'univ-ozyegin',
    program_name_ar: 'علوم الحاسوب',
    program_name_en: 'Computer Science',
    degree_level: 'bachelor',
    language: 'en',
    city: 'Istanbul',
    tuition_min: 12000,
    tuition_max: 14000,
    currency: 'USD',
    intakes: ['September', 'February']
  },
  {
    id: 'prog-ozyegin-ai-ms',
    university_id: 'univ-ozyegin',
    program_name_ar: 'ماجستير الذكاء الاصطناعي',
    program_name_en: 'Artificial Intelligence (MS)',
    degree_level: 'master',
    language: 'en',
    city: 'Istanbul',
    tuition_min: 18000,
    tuition_max: 22000,
    currency: 'USD',
    intakes: ['September']
  },
  {
    id: 'prog-ozyegin-fintech-ms',
    university_id: 'univ-ozyegin',
    program_name_ar: 'ماجستير التقنية المالية',
    program_name_en: 'Financial Technology (MS)',
    degree_level: 'master',
    language: 'en',
    city: 'Istanbul',
    tuition_min: 16000,
    tuition_max: 20000,
    currency: 'USD',
    intakes: ['September']
  },
  {
    id: 'prog-ozyegin-hotel-bs',
    university_id: 'univ-ozyegin',
    program_name_ar: 'إدارة الضيافة',
    program_name_en: 'Hospitality Management',
    degree_level: 'bachelor',
    language: 'en',
    city: 'Istanbul',
    tuition_min: 10000,
    tuition_max: 12000,
    currency: 'USD',
    intakes: ['September']
  },
  // Koc University
  {
    id: 'prog-koc-cs-bs',
    university_id: 'univ-koc',
    program_name_ar: 'علوم الحاسوب',
    program_name_en: 'Computer Science',
    degree_level: 'bachelor',
    language: 'en',
    city: 'Istanbul',
    tuition_min: 22000,
    tuition_max: 25000,
    currency: 'USD',
    intakes: ['September']
  },
  {
    id: 'prog-koc-medicine-md',
    university_id: 'univ-koc',
    program_name_ar: 'الطب البشري',
    program_name_en: 'Medicine',
    degree_level: 'bachelor',
    language: 'en',
    city: 'Istanbul',
    tuition_min: 35000,
    tuition_max: 40000,
    currency: 'USD',
    intakes: ['September']
  },
  {
    id: 'prog-koc-law-llb',
    university_id: 'univ-koc',
    program_name_ar: 'القانون',
    program_name_en: 'Law',
    degree_level: 'bachelor',
    language: 'tr',
    city: 'Istanbul',
    tuition_min: 18000,
    tuition_max: 22000,
    currency: 'USD',
    intakes: ['September']
  },
  {
    id: 'prog-koc-mba',
    university_id: 'univ-koc',
    program_name_ar: 'ماجستير إدارة الأعمال',
    program_name_en: 'MBA',
    degree_level: 'master',
    language: 'en',
    city: 'Istanbul',
    tuition_min: 35000,
    tuition_max: 45000,
    currency: 'USD',
    intakes: ['September']
  },
  {
    id: 'prog-koc-cs-phd',
    university_id: 'univ-koc',
    program_name_ar: 'دكتوراه علوم الحاسوب',
    program_name_en: 'Computer Science (PhD)',
    degree_level: 'phd',
    language: 'en',
    city: 'Istanbul',
    tuition_min: 0,
    tuition_max: 5000,
    currency: 'USD',
    intakes: ['September', 'February']
  }
];

// Document Templates
const documentTemplates = [
  {
    id: uuidv4(),
    doc_key: 'high_school_diploma',
    label_ar: 'شهادة الثانوية العامة',
    label_en: 'High School Diploma',
    translation_required_default: true,
    notarization_required_default: true,
    notes_ar: 'يجب أن تكون موثقة من وزارة الخارجية',
    notes_en: 'Must be attested by the Ministry of Foreign Affairs',
    estimated_days_to_obtain: 7
  },
  {
    id: uuidv4(),
    doc_key: 'high_school_transcript',
    label_ar: 'كشف درجات الثانوية',
    label_en: 'High School Transcript',
    translation_required_default: true,
    notarization_required_default: true,
    notes_ar: 'يجب أن يتضمن جميع السنوات الدراسية',
    notes_en: 'Must include all academic years',
    estimated_days_to_obtain: 5
  },
  {
    id: uuidv4(),
    doc_key: 'passport_copy',
    label_ar: 'صورة جواز السفر',
    label_en: 'Passport Copy',
    translation_required_default: false,
    notarization_required_default: false,
    notes_ar: 'صورة ملونة واضحة',
    notes_en: 'Clear colored copy',
    estimated_days_to_obtain: 1
  },
  {
    id: uuidv4(),
    doc_key: 'personal_photo',
    label_ar: 'صورة شخصية',
    label_en: 'Personal Photo',
    translation_required_default: false,
    notarization_required_default: false,
    notes_ar: 'خلفية بيضاء، 4x6 سم',
    notes_en: 'White background, 4x6 cm',
    estimated_days_to_obtain: 1
  },
  {
    id: uuidv4(),
    doc_key: 'english_proficiency',
    label_ar: 'شهادة إتقان اللغة الإنجليزية',
    label_en: 'English Proficiency Certificate',
    translation_required_default: false,
    notarization_required_default: false,
    notes_ar: 'IELTS أو TOEFL أو ما يعادلها',
    notes_en: 'IELTS, TOEFL, or equivalent',
    estimated_days_to_obtain: 14
  },
  {
    id: uuidv4(),
    doc_key: 'turkish_proficiency',
    label_ar: 'شهادة إتقان اللغة التركية',
    label_en: 'Turkish Proficiency Certificate',
    translation_required_default: false,
    notarization_required_default: false,
    notes_ar: 'TÖMER أو ما يعادلها',
    notes_en: 'TÖMER or equivalent',
    estimated_days_to_obtain: 14
  },
  {
    id: uuidv4(),
    doc_key: 'bachelor_diploma',
    label_ar: 'شهادة البكالوريوس',
    label_en: 'Bachelor Degree Certificate',
    translation_required_default: true,
    notarization_required_default: true,
    notes_ar: 'للتقديم على برامج الماجستير',
    notes_en: 'Required for Master\'s programs',
    estimated_days_to_obtain: 7
  },
  {
    id: uuidv4(),
    doc_key: 'bachelor_transcript',
    label_ar: 'كشف درجات البكالوريوس',
    label_en: 'Bachelor Transcript',
    translation_required_default: true,
    notarization_required_default: true,
    notes_ar: 'كشف الدرجات الكامل',
    notes_en: 'Complete grade transcript',
    estimated_days_to_obtain: 5
  },
  {
    id: uuidv4(),
    doc_key: 'cv_resume',
    label_ar: 'السيرة الذاتية',
    label_en: 'CV/Resume',
    translation_required_default: false,
    notarization_required_default: false,
    notes_ar: 'محدثة تتضمن الخبرات والمهارات',
    notes_en: 'Updated with experiences and skills',
    estimated_days_to_obtain: 2
  },
  {
    id: uuidv4(),
    doc_key: 'motivation_letter',
    label_ar: 'خطاب الدافع',
    label_en: 'Motivation Letter',
    translation_required_default: false,
    notarization_required_default: false,
    notes_ar: 'يوضح أسباب اختيار البرنامج',
    notes_en: 'Explaining reasons for choosing the program',
    estimated_days_to_obtain: 3
  },
  {
    id: uuidv4(),
    doc_key: 'recommendation_letters',
    label_ar: 'خطابات التوصية',
    label_en: 'Recommendation Letters',
    translation_required_default: false,
    notarization_required_default: false,
    notes_ar: 'عادة 2-3 خطابات من أكاديميين',
    notes_en: 'Usually 2-3 letters from academics',
    estimated_days_to_obtain: 14
  },
  {
    id: uuidv4(),
    doc_key: 'master_diploma',
    label_ar: 'شهادة الماجستير',
    label_en: 'Master Degree Certificate',
    translation_required_default: true,
    notarization_required_default: true,
    notes_ar: 'للتقديم على برامج الدكتوراه',
    notes_en: 'Required for PhD programs',
    estimated_days_to_obtain: 7
  },
  {
    id: uuidv4(),
    doc_key: 'master_transcript',
    label_ar: 'كشف درجات الماجستير',
    label_en: 'Master Transcript',
    translation_required_default: true,
    notarization_required_default: true,
    notes_ar: 'كشف الدرجات الكامل',
    notes_en: 'Complete grade transcript',
    estimated_days_to_obtain: 5
  },
  {
    id: uuidv4(),
    doc_key: 'research_proposal',
    label_ar: 'مقترح البحث',
    label_en: 'Research Proposal',
    translation_required_default: false,
    notarization_required_default: false,
    notes_ar: 'مطلوب لبرامج الدكتوراه',
    notes_en: 'Required for PhD programs',
    estimated_days_to_obtain: 14
  },
  {
    id: uuidv4(),
    doc_key: 'portfolio',
    label_ar: 'ملف الأعمال',
    label_en: 'Portfolio',
    translation_required_default: false,
    notarization_required_default: false,
    notes_ar: 'لبرامج التصميم والفنون',
    notes_en: 'For design and arts programs',
    estimated_days_to_obtain: 14
  },
  {
    id: uuidv4(),
    doc_key: 'health_certificate',
    label_ar: 'شهادة صحية',
    label_en: 'Health Certificate',
    translation_required_default: true,
    notarization_required_default: false,
    notes_ar: 'مطلوبة للبرامج الطبية',
    notes_en: 'Required for medical programs',
    estimated_days_to_obtain: 7
  }
];

export function seedDatabase(db?: Database.Database): void {
  const database = db || getDatabase();
  
  // First run migrations
  runMigrations(database);
  
  // Clear existing data
  database.exec(`
    DELETE FROM saved_plans;
    DELETE FROM saved_shortlists;
    DELETE FROM student_profiles;
    DELETE FROM users;
    DELETE FROM verifications;
    DELETE FROM source_references;
    DELETE FROM program_document_rules;
    DELETE FROM document_templates;
    DELETE FROM requirements;
    DELETE FROM programs;
    DELETE FROM universities;
  `);
  
  // Insert universities
  const insertUniversity = database.prepare(`
    INSERT INTO universities (id, name_ar, name_en, city, website)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  for (const uni of universities) {
    insertUniversity.run(uni.id, uni.name_ar, uni.name_en, uni.city, uni.website);
  }
  
  // Insert programs
  const insertProgram = database.prepare(`
    INSERT INTO programs (id, university_id, program_name_ar, program_name_en, degree_level, language, city, tuition_min, tuition_max, currency, intakes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  for (const prog of programs) {
    insertProgram.run(
      prog.id,
      prog.university_id,
      prog.program_name_ar,
      prog.program_name_en,
      prog.degree_level,
      prog.language,
      prog.city,
      prog.tuition_min,
      prog.tuition_max,
      prog.currency,
      JSON.stringify(prog.intakes)
    );
  }
  
  // Insert document templates
  const insertDocTemplate = database.prepare(`
    INSERT INTO document_templates (id, doc_key, label_ar, label_en, translation_required_default, notarization_required_default, notes_ar, notes_en, estimated_days_to_obtain)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  for (const doc of documentTemplates) {
    insertDocTemplate.run(
      doc.id,
      doc.doc_key,
      doc.label_ar,
      doc.label_en,
      doc.translation_required_default ? 1 : 0,
      doc.notarization_required_default ? 1 : 0,
      doc.notes_ar,
      doc.notes_en,
      doc.estimated_days_to_obtain
    );
  }
  
  // Insert program document rules (basic documents for all programs)
  const insertDocRule = database.prepare(`
    INSERT INTO program_document_rules (id, program_id, doc_key, required_flag, translation_required, notarization_required, notes_ar, notes_en)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  // Basic documents for bachelor programs
  const bachelorDocs = ['high_school_diploma', 'high_school_transcript', 'passport_copy', 'personal_photo'];
  // Additional for master programs
  const masterDocs = ['bachelor_diploma', 'bachelor_transcript', 'cv_resume', 'motivation_letter', 'recommendation_letters'];
  // Additional for PhD programs
  const phdDocs = ['master_diploma', 'master_transcript', 'research_proposal'];
  
  for (const prog of programs) {
    // Basic docs for all
    for (const docKey of ['passport_copy', 'personal_photo']) {
      insertDocRule.run(uuidv4(), prog.id, docKey, 1, null, null, null, null);
    }
    
    if (prog.degree_level === 'bachelor' || prog.degree_level === 'associate') {
      for (const docKey of ['high_school_diploma', 'high_school_transcript']) {
        insertDocRule.run(uuidv4(), prog.id, docKey, 1, null, null, null, null);
      }
      // Add language proficiency based on program language
      if (prog.language === 'en') {
        insertDocRule.run(uuidv4(), prog.id, 'english_proficiency', 1, null, null, null, null);
      } else if (prog.language === 'tr') {
        insertDocRule.run(uuidv4(), prog.id, 'turkish_proficiency', 1, null, null, null, null);
      }
    }
    
    if (prog.degree_level === 'master') {
      for (const docKey of masterDocs) {
        insertDocRule.run(uuidv4(), prog.id, docKey, 1, null, null, null, null);
      }
      if (prog.language === 'en') {
        insertDocRule.run(uuidv4(), prog.id, 'english_proficiency', 1, null, null, null, null);
      }
    }
    
    if (prog.degree_level === 'phd') {
      for (const docKey of [...masterDocs, ...phdDocs]) {
        const isRequired = !['motivation_letter'].includes(docKey);
        insertDocRule.run(uuidv4(), prog.id, docKey, isRequired ? 1 : 0, null, null, null, null);
      }
      if (prog.language === 'en') {
        insertDocRule.run(uuidv4(), prog.id, 'english_proficiency', 1, null, null, null, null);
      }
    }
    
    // Special documents for specific programs
    if (prog.program_name_en.includes('Architecture') || prog.program_name_en.includes('Design')) {
      insertDocRule.run(uuidv4(), prog.id, 'portfolio', 1, null, null, null, null);
    }
    
    if (prog.program_name_en.includes('Medicine') || prog.program_name_en.includes('Nursing') || prog.program_name_en.includes('Dentistry')) {
      insertDocRule.run(uuidv4(), prog.id, 'health_certificate', 1, null, null, null, null);
    }
  }
  
  // Insert requirements for programs
  const insertRequirement = database.prepare(`
    INSERT INTO requirements (id, program_id, university_id, applicant_category, rule_type, rule_value, human_text_ar, human_text_en, required_flag)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  for (const prog of programs) {
    // GPA requirements
    if (prog.degree_level === 'bachelor') {
      insertRequirement.run(
        uuidv4(),
        prog.id,
        prog.university_id,
        'international',
        'gpa_minimum',
        '60',
        'الحد الأدنى للمعدل 60%',
        'Minimum GPA of 60%',
        1
      );
    }
    
    if (prog.degree_level === 'master') {
      insertRequirement.run(
        uuidv4(),
        prog.id,
        prog.university_id,
        'international',
        'gpa_minimum',
        '2.5',
        'الحد الأدنى للمعدل 2.5/4.0',
        'Minimum GPA of 2.5/4.0',
        1
      );
    }
    
    if (prog.degree_level === 'phd') {
      insertRequirement.run(
        uuidv4(),
        prog.id,
        prog.university_id,
        'international',
        'gpa_minimum',
        '3.0',
        'الحد الأدنى للمعدل 3.0/4.0',
        'Minimum GPA of 3.0/4.0',
        1
      );
    }
    
    // Language requirements
    if (prog.language === 'en') {
      insertRequirement.run(
        uuidv4(),
        prog.id,
        prog.university_id,
        'international',
        'language_proficiency',
        JSON.stringify({ type: 'english', ielts: 5.5, toefl: 70 }),
        'إتقان اللغة الإنجليزية: IELTS 5.5 أو TOEFL 70',
        'English proficiency: IELTS 5.5 or TOEFL 70',
        1
      );
    }
    
    if (prog.language === 'tr') {
      insertRequirement.run(
        uuidv4(),
        prog.id,
        prog.university_id,
        'international',
        'language_proficiency',
        JSON.stringify({ type: 'turkish', tomer: 'B2' }),
        'إتقان اللغة التركية: مستوى B2',
        'Turkish proficiency: B2 level',
        1
      );
    }
    
    // Special requirements for medicine
    if (prog.program_name_en === 'Medicine') {
      insertRequirement.run(
        uuidv4(),
        prog.id,
        prog.university_id,
        'international',
        'exam_score',
        JSON.stringify({ yos: 80, sat: 1200 }),
        'اختبار YOS بدرجة 80% أو SAT بدرجة 1200',
        'YOS score of 80% or SAT score of 1200',
        1
      );
    }
    
    // Portfolio for design programs
    if (prog.program_name_en.includes('Architecture') || prog.program_name_en.includes('Design')) {
      insertRequirement.run(
        uuidv4(),
        prog.id,
        prog.university_id,
        'all',
        'portfolio_required',
        'true',
        'يجب تقديم ملف أعمال يتضمن 10-15 عملاً',
        'Portfolio required with 10-15 works',
        1
      );
    }
  }
  
  // Add source references for all programs
  const insertSource = database.prepare(`
    INSERT INTO source_references (id, entity_type, entity_id, title, url, captured_at, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  const now = new Date().toISOString();
  
  for (const uni of universities) {
    insertSource.run(
      uuidv4(),
      'university',
      uni.id,
      `${uni.name_en} Official Website`,
      uni.website,
      now,
      'Official university website'
    );
  }
  
  for (const prog of programs) {
    const uni = universities.find(u => u.id === prog.university_id)!;
    insertSource.run(
      uuidv4(),
      'program',
      prog.id,
      `${prog.program_name_en} - ${uni.name_en}`,
      uni.website,
      now,
      'Program information from university catalog'
    );
  }
  
  // Add verifications
  const insertVerification = database.prepare(`
    INSERT INTO verifications (id, entity_type, entity_id, last_verified_at, verified_by, verification_notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  for (const uni of universities) {
    insertVerification.run(
      uuidv4(),
      'university',
      uni.id,
      now,
      'system',
      'Initial data entry'
    );
  }
  
  for (const prog of programs) {
    insertVerification.run(
      uuidv4(),
      'program',
      prog.id,
      now,
      'system',
      'Initial data entry'
    );
  }
  
  console.log('Database seeded successfully!');
  console.log(`- ${universities.length} universities`);
  console.log(`- ${programs.length} programs`);
  console.log(`- ${documentTemplates.length} document templates`);
}

// Run seed if this file is executed directly
if (require.main === module) {
  seedDatabase();
}
