/**
 * Admin API Server for UniTR Admissions Assistant
 * Provides CRUD operations for universities, programs, requirements, and documents
 */

import express, { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/connection';
import { runMigrations } from '../db/migrate';

const app = express();
app.use(express.json());

// Rate limiting - limit requests per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: {
      message_ar: 'تم تجاوز الحد الأقصى للطلبات. يرجى المحاولة لاحقاً.',
      message_en: 'Too many requests. Please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all API routes
app.use('/api/', limiter);

// Initialize database
runMigrations();
const db = getDatabase();

// CORS middleware for development
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Error handler
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => 
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

// =============================================================================
// Universities CRUD
// =============================================================================

app.get('/api/universities', asyncHandler(async (req: Request, res: Response) => {
  const universities = db.prepare(`
    SELECT u.*, v.last_verified_at
    FROM universities u
    LEFT JOIN verifications v ON v.entity_type = 'university' AND v.entity_id = u.id
    ORDER BY u.name_en
  `).all();
  
  res.json({ success: true, data: universities });
}));

app.get('/api/universities/:id', asyncHandler(async (req: Request, res: Response) => {
  const university = db.prepare(`
    SELECT u.*, v.last_verified_at
    FROM universities u
    LEFT JOIN verifications v ON v.entity_type = 'university' AND v.entity_id = u.id
    WHERE u.id = ?
  `).get(req.params.id);
  
  if (!university) {
    return res.status(404).json({ success: false, error: 'University not found' });
  }
  
  res.json({ success: true, data: university });
}));

app.post('/api/universities', asyncHandler(async (req: Request, res: Response) => {
  const { name_ar, name_en, city, website, notes } = req.body;
  const id = uuidv4();
  
  db.prepare(`
    INSERT INTO universities (id, name_ar, name_en, city, website, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, name_ar, name_en, city, website, notes);
  
  res.status(201).json({ success: true, data: { id } });
}));

app.put('/api/universities/:id', asyncHandler(async (req: Request, res: Response) => {
  const { name_ar, name_en, city, website, notes } = req.body;
  
  const result = db.prepare(`
    UPDATE universities
    SET name_ar = ?, name_en = ?, city = ?, website = ?, notes = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(name_ar, name_en, city, website, notes, req.params.id);
  
  if (result.changes === 0) {
    return res.status(404).json({ success: false, error: 'University not found' });
  }
  
  res.json({ success: true });
}));

app.delete('/api/universities/:id', asyncHandler(async (req: Request, res: Response) => {
  const result = db.prepare('DELETE FROM universities WHERE id = ?').run(req.params.id);
  
  if (result.changes === 0) {
    return res.status(404).json({ success: false, error: 'University not found' });
  }
  
  res.json({ success: true });
}));

// =============================================================================
// Programs CRUD
// =============================================================================

app.get('/api/programs', asyncHandler(async (req: Request, res: Response) => {
  const programs = db.prepare(`
    SELECT p.*, u.name_en as university_name, v.last_verified_at
    FROM programs p
    JOIN universities u ON p.university_id = u.id
    LEFT JOIN verifications v ON v.entity_type = 'program' AND v.entity_id = p.id
    ORDER BY u.name_en, p.program_name_en
  `).all();
  
  res.json({ success: true, data: programs });
}));

app.get('/api/programs/:id', asyncHandler(async (req: Request, res: Response) => {
  const program = db.prepare(`
    SELECT p.*, u.name_en as university_name, v.last_verified_at
    FROM programs p
    JOIN universities u ON p.university_id = u.id
    LEFT JOIN verifications v ON v.entity_type = 'program' AND v.entity_id = p.id
    WHERE p.id = ?
  `).get(req.params.id);
  
  if (!program) {
    return res.status(404).json({ success: false, error: 'Program not found' });
  }
  
  res.json({ success: true, data: program });
}));

app.post('/api/programs', asyncHandler(async (req: Request, res: Response) => {
  const {
    university_id, program_name_ar, program_name_en, degree_level,
    language, city, tuition_min, tuition_max, currency, intakes, active_flag
  } = req.body;
  const id = uuidv4();
  
  db.prepare(`
    INSERT INTO programs (id, university_id, program_name_ar, program_name_en, degree_level,
      language, city, tuition_min, tuition_max, currency, intakes, active_flag)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, university_id, program_name_ar, program_name_en, degree_level,
    language, city, tuition_min, tuition_max, currency || 'USD',
    JSON.stringify(intakes || []), active_flag !== false ? 1 : 0
  );
  
  res.status(201).json({ success: true, data: { id } });
}));

app.put('/api/programs/:id', asyncHandler(async (req: Request, res: Response) => {
  const {
    university_id, program_name_ar, program_name_en, degree_level,
    language, city, tuition_min, tuition_max, currency, intakes, active_flag
  } = req.body;
  
  const result = db.prepare(`
    UPDATE programs
    SET university_id = ?, program_name_ar = ?, program_name_en = ?, degree_level = ?,
        language = ?, city = ?, tuition_min = ?, tuition_max = ?, currency = ?,
        intakes = ?, active_flag = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    university_id, program_name_ar, program_name_en, degree_level,
    language, city, tuition_min, tuition_max, currency,
    JSON.stringify(intakes || []), active_flag ? 1 : 0, req.params.id
  );
  
  if (result.changes === 0) {
    return res.status(404).json({ success: false, error: 'Program not found' });
  }
  
  res.json({ success: true });
}));

app.delete('/api/programs/:id', asyncHandler(async (req: Request, res: Response) => {
  const result = db.prepare('DELETE FROM programs WHERE id = ?').run(req.params.id);
  
  if (result.changes === 0) {
    return res.status(404).json({ success: false, error: 'Program not found' });
  }
  
  res.json({ success: true });
}));

// =============================================================================
// Requirements CRUD
// =============================================================================

app.get('/api/requirements', asyncHandler(async (req: Request, res: Response) => {
  const { program_id, university_id } = req.query;
  
  let query = 'SELECT * FROM requirements WHERE 1=1';
  const params: any[] = [];
  
  if (program_id) {
    query += ' AND program_id = ?';
    params.push(program_id);
  }
  
  if (university_id) {
    query += ' AND university_id = ?';
    params.push(university_id);
  }
  
  query += ' ORDER BY required_flag DESC, rule_type';
  
  const requirements = db.prepare(query).all(...params);
  res.json({ success: true, data: requirements });
}));

app.post('/api/requirements', asyncHandler(async (req: Request, res: Response) => {
  const {
    program_id, university_id, applicant_category, rule_type,
    rule_value, human_text_ar, human_text_en, required_flag
  } = req.body;
  const id = uuidv4();
  
  db.prepare(`
    INSERT INTO requirements (id, program_id, university_id, applicant_category, rule_type,
      rule_value, human_text_ar, human_text_en, required_flag)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, program_id, university_id, applicant_category, rule_type,
    rule_value, human_text_ar, human_text_en, required_flag ? 1 : 0
  );
  
  res.status(201).json({ success: true, data: { id } });
}));

app.put('/api/requirements/:id', asyncHandler(async (req: Request, res: Response) => {
  const {
    program_id, university_id, applicant_category, rule_type,
    rule_value, human_text_ar, human_text_en, required_flag
  } = req.body;
  
  const result = db.prepare(`
    UPDATE requirements
    SET program_id = ?, university_id = ?, applicant_category = ?, rule_type = ?,
        rule_value = ?, human_text_ar = ?, human_text_en = ?, required_flag = ?,
        updated_at = datetime('now')
    WHERE id = ?
  `).run(
    program_id, university_id, applicant_category, rule_type,
    rule_value, human_text_ar, human_text_en, required_flag ? 1 : 0, req.params.id
  );
  
  if (result.changes === 0) {
    return res.status(404).json({ success: false, error: 'Requirement not found' });
  }
  
  res.json({ success: true });
}));

app.delete('/api/requirements/:id', asyncHandler(async (req: Request, res: Response) => {
  const result = db.prepare('DELETE FROM requirements WHERE id = ?').run(req.params.id);
  
  if (result.changes === 0) {
    return res.status(404).json({ success: false, error: 'Requirement not found' });
  }
  
  res.json({ success: true });
}));

// =============================================================================
// Document Templates CRUD
// =============================================================================

app.get('/api/document-templates', asyncHandler(async (req: Request, res: Response) => {
  const templates = db.prepare('SELECT * FROM document_templates ORDER BY label_en').all();
  res.json({ success: true, data: templates });
}));

app.post('/api/document-templates', asyncHandler(async (req: Request, res: Response) => {
  const {
    doc_key, label_ar, label_en, translation_required_default,
    notarization_required_default, notes_ar, notes_en, estimated_days_to_obtain
  } = req.body;
  const id = uuidv4();
  
  db.prepare(`
    INSERT INTO document_templates (id, doc_key, label_ar, label_en, translation_required_default,
      notarization_required_default, notes_ar, notes_en, estimated_days_to_obtain)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, doc_key, label_ar, label_en,
    translation_required_default ? 1 : 0, notarization_required_default ? 1 : 0,
    notes_ar, notes_en, estimated_days_to_obtain
  );
  
  res.status(201).json({ success: true, data: { id } });
}));

// =============================================================================
// Verifications
// =============================================================================

app.post('/api/verify', asyncHandler(async (req: Request, res: Response) => {
  const { entity_type, entity_id, verified_by, verification_notes } = req.body;
  const now = new Date().toISOString();
  
  // Upsert verification
  db.prepare(`
    INSERT INTO verifications (id, entity_type, entity_id, last_verified_at, verified_by, verification_notes)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(entity_type, entity_id) DO UPDATE SET
      last_verified_at = excluded.last_verified_at,
      verified_by = excluded.verified_by,
      verification_notes = excluded.verification_notes,
      updated_at = datetime('now')
  `).run(uuidv4(), entity_type, entity_id, now, verified_by, verification_notes);
  
  res.json({ success: true, data: { last_verified_at: now } });
}));

// =============================================================================
// Source References
// =============================================================================

app.get('/api/sources', asyncHandler(async (req: Request, res: Response) => {
  const { entity_type, entity_id } = req.query;
  
  let query = 'SELECT * FROM source_references WHERE 1=1';
  const params: any[] = [];
  
  if (entity_type) {
    query += ' AND entity_type = ?';
    params.push(entity_type);
  }
  
  if (entity_id) {
    query += ' AND entity_id = ?';
    params.push(entity_id);
  }
  
  query += ' ORDER BY captured_at DESC';
  
  const sources = db.prepare(query).all(...params);
  res.json({ success: true, data: sources });
}));

app.post('/api/sources', asyncHandler(async (req: Request, res: Response) => {
  const { entity_type, entity_id, title, url, notes } = req.body;
  const id = uuidv4();
  const captured_at = new Date().toISOString();
  
  db.prepare(`
    INSERT INTO source_references (id, entity_type, entity_id, title, url, captured_at, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, entity_type, entity_id, title, url, captured_at, notes);
  
  res.status(201).json({ success: true, data: { id } });
}));

// =============================================================================
// Audit Queue - Records needing verification
// =============================================================================

app.get('/api/audit-queue', asyncHandler(async (req: Request, res: Response) => {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const cutoffDate = sixMonthsAgo.toISOString();
  
  // Programs without recent verification
  const stalePrograms = db.prepare(`
    SELECT 
      'program' as entity_type,
      p.id as entity_id,
      p.program_name_en as name,
      u.name_en as parent_name,
      v.last_verified_at,
      CASE WHEN v.last_verified_at IS NULL THEN 'missing' ELSE 'outdated' END as status
    FROM programs p
    JOIN universities u ON p.university_id = u.id
    LEFT JOIN verifications v ON v.entity_type = 'program' AND v.entity_id = p.id
    WHERE v.last_verified_at IS NULL OR v.last_verified_at < ?
    ORDER BY v.last_verified_at ASC NULLS FIRST
  `).all(cutoffDate);
  
  // Universities without recent verification
  const staleUniversities = db.prepare(`
    SELECT 
      'university' as entity_type,
      u.id as entity_id,
      u.name_en as name,
      NULL as parent_name,
      v.last_verified_at,
      CASE WHEN v.last_verified_at IS NULL THEN 'missing' ELSE 'outdated' END as status
    FROM universities u
    LEFT JOIN verifications v ON v.entity_type = 'university' AND v.entity_id = u.id
    WHERE v.last_verified_at IS NULL OR v.last_verified_at < ?
    ORDER BY v.last_verified_at ASC NULLS FIRST
  `).all(cutoffDate);
  
  res.json({
    success: true,
    data: {
      stale_programs: stalePrograms,
      stale_universities: staleUniversities,
      total_items: stalePrograms.length + staleUniversities.length,
    },
  });
}));

// =============================================================================
// Statistics
// =============================================================================

app.get('/api/stats', asyncHandler(async (req: Request, res: Response) => {
  const stats = {
    universities: (db.prepare('SELECT COUNT(*) as count FROM universities').get() as any).count,
    programs: (db.prepare('SELECT COUNT(*) as count FROM programs WHERE active_flag = 1').get() as any).count,
    document_templates: (db.prepare('SELECT COUNT(*) as count FROM document_templates').get() as any).count,
    requirements: (db.prepare('SELECT COUNT(*) as count FROM requirements').get() as any).count,
    verifications: (db.prepare('SELECT COUNT(*) as count FROM verifications').get() as any).count,
    sources: (db.prepare('SELECT COUNT(*) as count FROM source_references').get() as any).count,
  };
  
  res.json({ success: true, data: stats });
}));

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: {
      message_ar: 'حدث خطأ في الخادم',
      message_en: err.message || 'Internal server error',
    },
  });
});

const PORT = process.env.ADMIN_PORT || 3001;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Admin API server running on port ${PORT}`);
  });
}

export { app };
