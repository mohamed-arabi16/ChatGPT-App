# UniTR Admissions Assistant

**Turkish University Registration Assistant** - A ChatGPT App (MCP Server) for Arabic-speaking students exploring Turkish private universities.

## Overview

UniTR Admissions Assistant helps students:
- **Discover Programs**: Search Turkish university programs by major, degree level, language, budget, and city
- **Check Eligibility**: Get data-driven eligibility assessments (never fabricated)
- **Generate Checklists**: Personalized document checklists with translation/notarization requirements
- **Plan Timeline**: Week-by-week preparation schedules with critical path identification

## Features

- 🇹🇷 **30+ Programs** from 8 Turkish universities (sample data)
- 🌐 **Arabic-First**: All content available in Arabic and English
- 📊 **Data-Driven**: No AI hallucinations - all facts come from verified database records
- ✅ **Verification Tracking**: Last verified dates and source references for every record
- 🔧 **Admin Console**: CRUD operations for maintaining data accuracy

## Quick Start

```bash
# Install dependencies
npm install

# Run database migrations
npm run db:migrate

# Seed with sample data (30+ programs)
npm run db:seed

# Start MCP server (for ChatGPT integration)
npm run start:mcp

# Start Admin API server
npm run start:admin
```

## Project Structure

```
├── src/
│   ├── db/                    # Database layer
│   │   ├── connection.ts      # SQLite connection
│   │   ├── migrate.ts         # Schema migrations
│   │   ├── seed.ts            # Sample data
│   │   └── repositories/      # Data access layer
│   ├── tools/                 # MCP Tools
│   │   ├── search-programs.ts
│   │   ├── get-program-detail.ts
│   │   ├── build-eligibility-snapshot.ts
│   │   ├── build-document-checklist.ts
│   │   └── build-timeline.ts
│   ├── admin/                 # Admin API
│   │   └── server.ts
│   ├── types/                 # TypeScript types
│   └── mcp-server.ts          # MCP Server entry
├── tests/
│   ├── unit/                  # Unit tests
│   ├── integration/           # Integration tests
│   └── golden/                # Golden test scenarios (30+)
└── package.json
```

## MCP Tools

### 1. `search_programs`
Search programs based on student profile and filters.

**Input:**
```json
{
  "profile": {
    "nationality": "Egyptian",
    "desired_degree_level": "bachelor",
    "major_keywords": ["computer"],
    "preferred_language": "en",
    "budget_max": 10000,
    "city_preference": "Istanbul"
  }
}
```

### 2. `get_program_detail`
Get detailed program information including requirements, documents, and sources.

**Input:**
```json
{
  "program_id": "prog-aydin-cs-bs"
}
```

### 3. `build_eligibility_snapshot`
Evaluate eligibility based on student qualifications.

**Input:**
```json
{
  "profile": {
    "nationality": "Egyptian",
    "current_education_level": "high_school",
    "desired_degree_level": "bachelor",
    "gpa": 75,
    "english_score": { "type": "ielts", "score": 6.0 }
  },
  "program_id": "prog-aydin-cs-bs"
}
```

**Output includes:**
- `status`: `likely_eligible` | `needs_review` | `unlikely`
- `reasons`: Data-driven evaluation of each requirement
- `missing_info`: What information is needed
- `disclaimer`: Always included - this is not a final decision

### 4. `build_document_checklist`
Generate personalized document checklist.

**Output includes:**
- Document name (Arabic/English)
- Required vs recommended priority
- Translation/notarization requirements
- Estimated days to obtain
- Apostille notes based on nationality

### 5. `build_timeline`
Generate week-by-week preparation schedule.

**Output includes:**
- Weekly tasks with bilingual descriptions
- Critical path identification
- Target intake date
- Assumptions when data is incomplete

## Admin API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/universities` | List all universities |
| POST | `/api/universities` | Create university |
| PUT | `/api/universities/:id` | Update university |
| DELETE | `/api/universities/:id` | Delete university |
| GET | `/api/programs` | List all programs |
| POST | `/api/programs` | Create program |
| PUT | `/api/programs/:id` | Update program |
| GET | `/api/requirements` | List requirements |
| POST | `/api/verify` | Update verification status |
| GET | `/api/audit-queue` | Get stale records |
| GET | `/api/stats` | Get database statistics |

## Testing

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run golden test scenarios (30+ scenarios)
npm run test:golden
```

## Data Model

### Core Entities
- **University**: name_ar, name_en, city, website
- **Program**: degree_level, language, tuition, intakes
- **Requirement**: GPA, language proficiency, portfolio, etc.
- **DocumentTemplate**: translation/notarization defaults
- **ProgramDocumentRule**: program-specific document requirements
- **SourceReference**: citation for every data point
- **Verification**: last_verified_at for audit trail

## Safety & Compliance

- **No guarantees**: Never says "you will be accepted"
- **Data-driven only**: All requirements come from database records
- **Unknown = Unknown**: Missing data is explicitly marked, never fabricated
- **Disclaimer always**: Every eligibility check includes a disclaimer
- **Source tracking**: Every fact is traceable to a source

## Environment Variables

```env
DB_PATH=./unitr.db          # Database file path
ADMIN_PORT=3001             # Admin API port
```

## License

ISC