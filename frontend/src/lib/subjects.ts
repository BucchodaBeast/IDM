/**
 * IDM Eswatini Application Portal & Scholarship System
 * Official Eswatini High School Subjects & Curriculum Points Mapping
 *
 * This module defines the complete list of official Eswatini high school
 * subjects organised by stream, together with the grade-to-points mapping
 * used for EGCSE, IGCSE and AS Level qualifications.
 */

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type SubjectStream =
  | "core"
  | "languages"
  | "commercial"
  | "humanities"
  | "technical"
  | "sciences"
  | "arts";

export type QualificationLevel = "EGCSE" | "IGCSE" | "AS_LEVEL";

export type Grade = "A*" | "A" | "B" | "C" | "D" | "E" | "F" | "G" | "U";

export interface Subject {
  /** Unique identifier for the subject (used as option value). */
  id: string;
  /** Human-readable subject name displayed in dropdowns. */
  name: string;
  /** Curriculum stream the subject belongs to. */
  stream: SubjectStream;
  /** Whether the subject is a compulsory/core subject. */
  isCore: boolean;
  /** Qualification levels at which the subject is offered. */
  offeredAt: QualificationLevel[];
}

export interface GradePointEntry {
  grade: Grade;
  /** Points awarded for this grade (used in best-6 calculation). */
  points: number;
  /** Whether this grade counts as a credit pass (Grade C or higher). */
  isCredit: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// SUBJECT STREAM LABELS
// ─────────────────────────────────────────────────────────────────────────────

export const STREAM_LABELS: Record<SubjectStream, string> = {
  core: "Core Subjects",
  languages: "Languages",
  commercial: "Commercial / Business",
  humanities: "Humanities & Social Sciences",
  technical: "Technical & Vocational",
  sciences: "Sciences",
  arts: "Creative & Performing Arts",
};

// ─────────────────────────────────────────────────────────────────────────────
// OFFICIAL ESWATINI HIGH SCHOOL SUBJECTS
// ─────────────────────────────────────────────────────────────────────────────

export const ESWATINI_SUBJECTS: Subject[] = [
  // ── Core Subjects ──────────────────────────────────────────────────────────
  {
    id: "english-language",
    name: "English Language",
    stream: "core",
    isCore: true,
    offeredAt: ["EGCSE", "IGCSE", "AS_LEVEL"],
  },
  {
    id: "mathematics",
    name: "Mathematics",
    stream: "core",
    isCore: true,
    offeredAt: ["EGCSE", "IGCSE", "AS_LEVEL"],
  },
  {
    id: "siSwati",
    name: "SiSwati",
    stream: "core",
    isCore: true,
    offeredAt: ["EGCSE", "IGCSE"],
  },
  {
    id: "integrated-science",
    name: "Integrated Science",
    stream: "core",
    isCore: true,
    offeredAt: ["EGCSE", "IGCSE"],
  },
  {
    id: "physical-education",
    name: "Physical Education",
    stream: "core",
    isCore: false,
    offeredAt: ["EGCSE", "IGCSE"],
  },
  {
    id: "religious-studies",
    name: "Religious Studies",
    stream: "core",
    isCore: false,
    offeredAt: ["EGCSE", "IGCSE"],
  },
  {
    id: "life-skills",
    name: "Life Skills",
    stream: "core",
    isCore: false,
    offeredAt: ["EGCSE"],
  },
  {
    id: "agriculture",
    name: "Agriculture",
    stream: "core",
    isCore: false,
    offeredAt: ["EGCSE", "IGCSE"],
  },
  {
    id: "computer-studies",
    name: "Computer Studies / ICT",
    stream: "core",
    isCore: false,
    offeredAt: ["EGCSE", "IGCSE", "AS_LEVEL"],
  },

  // ── Languages ──────────────────────────────────────────────────────────────
  {
    id: "french",
    name: "French",
    stream: "languages",
    isCore: false,
    offeredAt: ["EGCSE", "IGCSE", "AS_LEVEL"],
  },
  {
    id: "portuguese",
    name: "Portuguese",
    stream: "languages",
    isCore: false,
    offeredAt: ["EGCSE", "IGCSE"],
  },

  // ── Commercial / Business ──────────────────────────────────────────────────
  {
    id: "accounting",
    name: "Accounting / Bookkeeping",
    stream: "commercial",
    isCore: false,
    offeredAt: ["EGCSE", "IGCSE", "AS_LEVEL"],
  },
  {
    id: "business-studies",
    name: "Business Studies",
    stream: "commercial",
    isCore: false,
    offeredAt: ["EGCSE", "IGCSE", "AS_LEVEL"],
  },
  {
    id: "economics",
    name: "Economics",
    stream: "commercial",
    isCore: false,
    offeredAt: ["EGCSE", "IGCSE", "AS_LEVEL"],
  },
  {
    id: "commerce",
    name: "Commerce",
    stream: "commercial",
    isCore: false,
    offeredAt: ["EGCSE", "IGCSE"],
  },
  {
    id: "secretarial-studies",
    name: "Secretarial Studies / Office Practice",
    stream: "commercial",
    isCore: false,
    offeredAt: ["EGCSE"],
  },
  {
    id: "entrepreneurship",
    name: "Entrepreneurship",
    stream: "commercial",
    isCore: false,
    offeredAt: ["EGCSE", "IGCSE"],
  },

  // ── Humanities & Social Sciences ───────────────────────────────────────────
  {
    id: "history",
    name: "History",
    stream: "humanities",
    isCore: false,
    offeredAt: ["EGCSE", "IGCSE", "AS_LEVEL"],
  },
  {
    id: "geography",
    name: "Geography",
    stream: "humanities",
    isCore: false,
    offeredAt: ["EGCSE", "IGCSE", "AS_LEVEL"],
  },
  {
    id: "development-studies",
    name: "Development Studies",
    stream: "humanities",
    isCore: false,
    offeredAt: ["EGCSE", "IGCSE", "AS_LEVEL"],
  },
  {
    id: "sociology",
    name: "Sociology",
    stream: "humanities",
    isCore: false,
    offeredAt: ["EGCSE", "IGCSE"],
  },
  {
    id: "religious-studies-hum",
    name: "Biblical Studies / Divinity",
    stream: "humanities",
    isCore: false,
    offeredAt: ["EGCSE", "IGCSE"],
  },
  {
    id: "civics",
    name: "Civics / Government & Politics",
    stream: "humanities",
    isCore: false,
    offeredAt: ["EGCSE"],
  },

  // ── Sciences ───────────────────────────────────────────────────────────────
  {
    id: "biology",
    name: "Biology / Human & Social Biology",
    stream: "sciences",
    isCore: false,
    offeredAt: ["EGCSE", "IGCSE", "AS_LEVEL"],
  },
  {
    id: "chemistry",
    name: "Chemistry",
    stream: "sciences",
    isCore: false,
    offeredAt: ["EGCSE", "IGCSE", "AS_LEVEL"],
  },
  {
    id: "physics",
    name: "Physics",
    stream: "sciences",
    isCore: false,
    offeredAt: ["EGCSE", "IGCSE", "AS_LEVEL"],
  },
  {
    id: "physical-science",
    name: "Physical Science (Combined)",
    stream: "sciences",
    isCore: false,
    offeredAt: ["EGCSE", "IGCSE"],
  },
  {
    id: "environmental-science",
    name: "Environmental Science / Management",
    stream: "sciences",
    isCore: false,
    offeredAt: ["EGCSE", "IGCSE"],
  },
  {
    id: "agricultural-science",
    name: "Agricultural Science",
    stream: "sciences",
    isCore: false,
    offeredAt: ["EGCSE", "IGCSE"],
  },

  // ── Technical & Vocational ─────────────────────────────────────────────────
  {
    id: "technical-drawing",
    name: "Technical Drawing / Engineering Drawing",
    stream: "technical",
    isCore: false,
    offeredAt: ["EGCSE", "IGCSE"],
  },
  {
    id: "woodwork",
    name: "Woodwork / Design & Technology",
    stream: "technical",
    isCore: false,
    offeredAt: ["EGCSE", "IGCSE"],
  },
  {
    id: "metalwork",
    name: "Metalwork / Metal Technology",
    stream: "technical",
    isCore: false,
    offeredAt: ["EGCSE"],
  },
  {
    id: "fashion-fabrics",
    name: "Fashion & Fabrics / Clothing & Textiles",
    stream: "technical",
    isCore: false,
    offeredAt: ["EGCSE", "IGCSE"],
  },
  {
    id: "food-nutrition",
    name: "Food & Nutrition / Home Economics",
    stream: "technical",
    isCore: false,
    offeredAt: ["EGCSE", "IGCSE"],
  },
  {
    id: "building-studies",
    name: "Building Studies / Construction",
    stream: "technical",
    isCore: false,
    offeredAt: ["EGCSE"],
  },
  {
    id: "motor-mechanics",
    name: "Motor Vehicle Mechanics",
    stream: "technical",
    isCore: false,
    offeredAt: ["EGCSE"],
  },
  {
    id: "electrical-studies",
    name: "Electrical & Electronics Studies",
    stream: "technical",
    isCore: false,
    offeredAt: ["EGCSE"],
  },

  // ── Creative & Performing Arts ─────────────────────────────────────────────
  {
    id: "art-design",
    name: "Art & Design",
    stream: "arts",
    isCore: false,
    offeredAt: ["EGCSE", "IGCSE"],
  },
  {
    id: "music",
    name: "Music",
    stream: "arts",
    isCore: false,
    offeredAt: ["EGCSE", "IGCSE"],
  },
  {
    id: "drama",
    name: "Drama / Theatre Arts",
    stream: "arts",
    isCore: false,
    offeredAt: ["EGCSE", "IGCSE"],
  },
  {
    id: "literature-english",
    name: "Literature in English",
    stream: "arts",
    isCore: false,
    offeredAt: ["EGCSE", "IGCSE", "AS_LEVEL"],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// GRADE POINTS MAP — EGCSE / IGCSE
// Standard 8-point scale used by Eswatini MOET for scholarship scoring.
// ─────────────────────────────────────────────────────────────────────────────

export const GRADE_POINTS_MAP: Record<QualificationLevel, Record<Grade, GradePointEntry>> = {
  EGCSE: {
    "A*": { grade: "A*", points: 8, isCredit: true },
    A:  { grade: "A",  points: 7, isCredit: true },
    B:  { grade: "B",  points: 6, isCredit: true },
    C:  { grade: "C",  points: 5, isCredit: true },
    D:  { grade: "D",  points: 4, isCredit: false },
    E:  { grade: "E",  points: 3, isCredit: false },
    F:  { grade: "F",  points: 2, isCredit: false },
    G:  { grade: "G",  points: 1, isCredit: false },
    U:  { grade: "U",  points: 0, isCredit: false },
  },
  IGCSE: {
    "A*": { grade: "A*", points: 8, isCredit: true },
    A:  { grade: "A",  points: 7, isCredit: true },
    B:  { grade: "B",  points: 6, isCredit: true },
    C:  { grade: "C",  points: 5, isCredit: true },
    D:  { grade: "D",  points: 4, isCredit: false },
    E:  { grade: "E",  points: 3, isCredit: false },
    F:  { grade: "F",  points: 2, isCredit: false },
    G:  { grade: "G",  points: 1, isCredit: false },
    U:  { grade: "U",  points: 0, isCredit: false },
  },
  AS_LEVEL: {
    "A*": { grade: "A*", points: 10, isCredit: true },
    A:  { grade: "A",  points: 9,  isCredit: true },
    B:  { grade: "B",  points: 8,  isCredit: true },
    C:  { grade: "C",  points: 7,  isCredit: true },
    D:  { grade: "D",  points: 6,  isCredit: false },
    E:  { grade: "E",  points: 5,  isCredit: false },
    F:  { grade: "F",  points: 0,  isCredit: false },
    G:  { grade: "G",  points: 0, isCredit: false },
    U:  { grade: "U",  points: 0, isCredit: false },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// SCHOLARSHIP CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/** Number of best subjects used in the scholarship points calculation. */
export const BEST_SUBJECTS_COUNT = 6;

/** Minimum total points required for a Diploma-level government scholarship. */
export const DIPLOMA_CUTOFF_POINTS = 27;

/** Minimum total points required for a Degree-level government scholarship. */
export const DEGREE_CUTOFF_POINTS = 30;

/** Minimum number of credit passes (Grade C or higher) required. */
export const MINIMUM_CREDIT_PASSES = 5;

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns all subjects that belong to a given stream.
 */
export function getSubjectsByStream(stream: SubjectStream): Subject[] {
  return ESWATINI_SUBJECTS.filter((s) => s.stream === stream);
}

/**
 * Returns all core (compulsory) subjects.
 */
export function getCoreSubjects(): Subject[] {
  return ESWATINI_SUBJECTS.filter((s) => s.isCore);
}

/**
 * Returns the subjects offered at a specific qualification level.
 */
export function getSubjectsByLevel(level: QualificationLevel): Subject[] {
  return ESWATINI_SUBJECTS.filter((s) => s.offeredAt.includes(level));
}

/**
 * Returns the list of grade options valid for a given qualification level.
 */
export function getGradesForLevel(level: QualificationLevel): Grade[] {
  return Object.keys(GRADE_POINTS_MAP[level]) as Grade[];
}

/**
 * Returns the point value for a given grade at a given qualification level.
 * Returns 0 for unrecognised grades.
 */
export function getGradePoints(level: QualificationLevel, grade: Grade): number {
  const entry = GRADE_POINTS_MAP[level][grade];
  return entry ? entry.points : 0;
}

/**
 * Returns true if the given grade is a credit pass (Grade C or higher)
 * at the specified qualification level.
 */
export function isCreditPass(level: QualificationLevel, grade: Grade): boolean {
  const entry = GRADE_POINTS_MAP[level][grade];
  return entry ? entry.isCredit : false;
}

/**
 * Returns a flat array of { value, label } pairs ready for use in a
 * <select> dropdown of subjects, optionally filtered by stream or level.
 */
export function getSubjectOptions(filters?: {
  stream?: SubjectStream;
  level?: QualificationLevel;
}): Array<{ value: string; label: string }> {
  let subjects = ESWATINI_SUBJECTS;
  if (filters?.stream) {
    subjects = subjects.filter((s) => s.stream === filters.stream);
  }
  if (filters?.level) {
    subjects = subjects.filter((s) => s.offeredAt.includes(filters.level!));
  }
  return subjects.map((s) => ({ value: s.id, label: s.name }));
}

/**
 * Returns a flat array of { value, label } pairs ready for use in a
 * <select> dropdown of grades for a given qualification level.
 */
export function getGradeOptions(
  level: QualificationLevel
): Array<{ value: Grade; label: string; points: number; isCredit: boolean }> {
  return (Object.keys(GRADE_POINTS_MAP[level]) as Grade[]).map((grade) => ({
    value: grade,
    label: `${grade} (${GRADE_POINTS_MAP[level][grade].points} pts)`,
    points: GRADE_POINTS_MAP[level][grade].points,
    isCredit: GRADE_POINTS_MAP[level][grade].isCredit,
  }));
}
