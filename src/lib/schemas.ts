import { z } from 'zod';

function uniqueBy<T>(items: T[], getKey: (item: T) => string): boolean {
  const keys = items.map(getKey);
  return new Set(keys).size === keys.length;
}

// ---

export const ClassSchema = z.object({
  slug: z.string().min(1),
  display_name: z.string().min(1),
});

export const AppRootSchema = z.object({
  school: z.object({ name: z.string().min(1) }),
  active_year: z.number().int().min(2000).max(2099),
  classes: z.array(ClassSchema).refine((classes) => uniqueBy(classes, ({ slug }) => slug), {
    message: 'Class slugs must be unique. A duplicate slug was found in classes.yml.',
  }),
});

export const YearConfigSchema = z.object({
  grading: z.object({
    scale: z.int().min(1).max(100),
    passing_grade: z.number().min(0).max(10),
    bimesters: z.int().min(1).max(4),
  }),
});

export const SubjectSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  teacher: z.string().min(1),
});

export const SubjectsSchema = z
  .array(SubjectSchema)
  .refine((subjects) => uniqueBy(subjects, ({ code }) => code), {
    message: 'Subject codes must be unique. A duplicate code was found in subjects.yml.',
  });

export const EnrolledStudentSchema = z.object({
  uuid: z.uuid(),
  name: z.string().min(1),
});

export const ClassStudentsSchema = z
  .array(EnrolledStudentSchema)
  .refine((students) => uniqueBy(students, ({ uuid }) => uuid), {
    message: 'Student UUIDs must be unique. A duplicate UUID was found in students.yml.',
  });

export const BimesterGradeSchema = z.object({
  grade: z.number().min(0).max(10),
  recovery: z.number().min(0).max(10).nullable(),
});

export const StudentGradeEntrySchema = z.object({
  student_uuid: z.uuid(),
  student_name: z.string().min(1),
  bimesters: z.array(BimesterGradeSchema),
});

export const SubjectGradesFileSchema = z.object({
  subject_name: z.string().min(1),
  students: z
    .array(StudentGradeEntrySchema)
    .refine((students) => uniqueBy(students, (s) => s.student_uuid), {
      message: 'Student UUIDs must be unique. A duplicate UUID was found in grades.yml.',
    }),
});

export const UuidIndexEntrySchema = z.object({
  class_slug: z.string().min(1),
});

export const UuidIndexSchema = z.record(z.uuid(), UuidIndexEntrySchema);
