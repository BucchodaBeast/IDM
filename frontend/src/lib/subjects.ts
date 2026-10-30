// Subjects offered in Eswatini senior secondary schools, from the Eswatini Academic Grading and
// Scholarship Guide. `value` is the name the rules engine understands; `label` is what people see.
export type Subject = { value: string; label: string };

const s = (value: string, label = value): Subject => ({ value, label });

export const SUBJECT_GROUPS: { label: string; subjects: Subject[] }[] = [
  { label: "Core and languages", subjects: [
    s("English Language"), s("siSwati (First Language)"), s("siSwati (Second Language)"), s("Mathematics"),
    s("Physical Science", "Physical Science (Physics/Chemistry)"), s("Biology"),
  ] },
  { label: "Commercial and business", subjects: [
    s("Accounting", "Accounting / Bookkeeping"), s("Business Studies"), s("Economics"), s("Entrepreneurship"),
  ] },
  { label: "Humanities and social sciences", subjects: [
    s("Geography"), s("History"), s("Literature in English"), s("Religious Education", "Religious Education (RE)"), s("Development Studies"),
  ] },
  { label: "Technical and practical", subjects: [
    s("Agriculture", "Agriculture / Agricultural Tech"),
    s("Design and Technology", "Design & Technology / Technical Studies"),
    s("Information Technology", "Information & Communication Tech (ICT)"),
    s("Food and Nutrition", "Food & Nutrition / Consumer Science"),
    s("Fashion and Fabrics", "Fashion & Fabrics / Textile Tech"),
  ] },
  // Not in the guide's list, but IDM entry rules name them (mainly IGCSE / GCE candidates).
  { label: "Separate and combined sciences", subjects: [
    s("Physics"), s("Chemistry"), s("Combined Science"), s("Additional Combined Science"),
  ] },
];

export const ALL_SUBJECTS: Subject[] = SUBJECT_GROUPS.flatMap((g) => g.subjects);
export const subjectLabel = (value: string) => ALL_SUBJECTS.find((x) => x.value === value)?.label ?? value;

// Subjects named in IDM's NSC / Matric entry rules.
export const NSC_SUBJECTS = [
  "English Language", "Mathematics", "Physical Science", "Life Sciences", "Geography", "Information Technology",
  "Computer Applications Technology", "Computer Studies", "Design and Technology",
];
