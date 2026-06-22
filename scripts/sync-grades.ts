import { getGradePath, getStudentsPath, getSubjectsPath, getYearConfigPath } from '@/lib/paths';
import { join } from 'node:path';
import { parse as parseYaml, stringify } from 'yaml';
import {
  AppRootSchema,
  ClassStudentsSchema,
  SubjectGradesFileSchema,
  SubjectsSchema,
  YearConfigSchema,
} from '../src/lib/schemas';

async function readYaml<T>(path: string, schema: { parse: (v: unknown) => T }): Promise<T> {
  const raw = await Bun.file(path).text();
  const parsed = parseYaml(raw);

  return schema.parse(parsed);
}

// -------------------------------------

const appFile = await readYaml(join('data', 'app.yml'), AppRootSchema);

const yearConfigPath = getYearConfigPath(appFile.active_year);
const subjectsPath = getSubjectsPath(appFile.active_year);

const yearConfig = await readYaml(yearConfigPath, YearConfigSchema);
const subjects = await readYaml(subjectsPath, SubjectsSchema);

// -------------------------------------

function emptyBimesters() {
  return Array.from({ length: yearConfig.grading.bimesters }, () => ({
    grade: null,
    recovery: null,
  }));
}

// -------------------------------------

for (const schoolClass of appFile.classes) {
  const studentsPath = getStudentsPath(appFile.active_year, schoolClass.slug);

  if (!(await Bun.file(studentsPath).exists())) {
    continue; // Turma sem alunos cadastrados neste ano
  }

  const students = await readYaml(studentsPath, ClassStudentsSchema);

  for (const subject of subjects) {
    const gradePath = getGradePath(appFile.active_year, schoolClass.slug, subject.code);
    const file = Bun.file(gradePath);

    if (!(await file.exists())) {
      const template = {
        subject_name: subject.name,
        students: students.map((student) => ({
          student_uuid: student.uuid,
          student_name: student.name,
          bimesters: emptyBimesters(),
        })),
      };

      await Bun.write(gradePath, stringify(template));
      continue;
    }

    const raw = await file.text();

    const parsed = SubjectGradesFileSchema.parse(parseYaml(raw));

    const studentMap = Object.fromEntries(students.map(({ uuid, name }) => [uuid, name]));
    const known = new Set(parsed.students.map((e) => e.student_uuid));

    const updatedStudents = parsed.students.map((e) => ({
      ...e,
      student_name: studentMap[e.student_uuid] ?? e.student_name,
    }));

    for (const student of students) {
      if (!known.has(student.uuid)) {
        updatedStudents.push({
          student_uuid: student.uuid,
          student_name: student.name,
          bimesters: emptyBimesters(),
        });
      }
    }

    await Bun.write(
      gradePath,
      stringify({ subject_name: subject.name, students: updatedStudents }) + '\n',
    );
  }
}

console.log('\nGrade files sincronizados.');
