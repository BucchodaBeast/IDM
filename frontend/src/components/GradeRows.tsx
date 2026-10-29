import React from 'react';
import { ESWATINI_SUBJECTS } from '@/lib/subjects';

export const SUBJECTS = ESWATINI_SUBJECTS;

// Type exports expected by apply/page.tsx and scholarship/page.tsx
export interface GradeRow {
  subject: string;
  syllabus: string;
  grade: string;
}

export type Row = GradeRow;

// Helper functions expected across pages
export const createEmptyRow = (): GradeRow => ({
  subject: '',
  syllabus: 'EGCSE',
  grade: '',
});

export const emptyRows = (count = 6): GradeRow[] =>
  Array.from({ length: count }, createEmptyRow);

export const rowsToOlevel = (rows: GradeRow[]) => {
  return rows.filter((r) => r.subject && r.grade);
};

interface GradeRowProps {
  index: number;
  subject: string;
  grade: string;
  syllabus: string;
  onChange: (index: number, field: string, value: string) => void;
}

export default function GradeRows({ index, subject, grade, syllabus, onChange }: GradeRowProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-white rounded-lg shadow-sm border border-gray-200 mb-3 items-center">
      {/* Subject Dropdown */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Subject {index + 1}</label>
        <select
          value={subject}
          onChange={(e) => onChange(index, 'subject', e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select Subject...</option>
          {SUBJECTS.map((subj) => (
            <option key={subj} value={subj}>
              {subj}
            </option>
          ))}
        </select>
      </div>

      {/* Syllabus Level */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Syllabus Level</label>
        <select
          value={syllabus}
          onChange={(e) => onChange(index, 'syllabus', e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
        >
          <option value="EGCSE">EGCSE / SGCSE</option>
          <option value="IGCSE">IGCSE / GCE O-Level</option>
          <option value="AS">Cambridge AS Level</option>
        </select>
      </div>

      {/* Grade Dropdown */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Grade Scored</label>
        <select
          value={grade}
          onChange={(e) => onChange(index, 'grade', e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select Grade</option>
          <option value="A*">A* (Distinction)</option>
          <option value="A">A (Distinction)</option>
          <option value="B">B (Merit)</option>
          <option value="C">C (Credit Pass)</option>
          <option value="D">D (Satisfactory)</option>
          <option value="E">E (Min Pass)</option>
          <option value="F">F (Sub-Pass)</option>
          <option value="G">G (Lowest Pass)</option>
          <option value="U">U (Ungraded)</option>
        </select>
      </div>
    </div>
  );
          }
