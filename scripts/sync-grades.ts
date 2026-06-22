import { YAML, file as bunFile, write as bunWrite } from 'bun';

import {
  getAppPath,
  getGradePath,
  getStudentsPath,
  getSubjectsPath,
  getYearConfigPath,
} from '../src/lib/paths';
import { readYaml } from '../src/lib/read-yaml';
import {
  AppRootSchema,
  ClassStudentsSchema,
  SubjectGradesFileSchema,
  SubjectsSchema,
  YearConfigSchema,
} from '../src/lib/schemas';

const appFile = await readYaml(getAppPath(), AppRootSchema);

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

  if (!(await bunFile(studentsPath).exists())) {
    continue; // Turma sem alunos cadastrados neste ano
  }

  const students = await readYaml(studentsPath, ClassStudentsSchema);

  for (const subject of subjects) {
    const gradePath = getGradePath(appFile.active_year, schoolClass.slug, subject.code);
    const file = bunFile(gradePath);

    if (!(await file.exists())) {
      const template = {
        subject_name: subject.name,
        students: students.map((student) => ({
          student_uuid: student.uuid,
          student_name: student.name,
          bimesters: emptyBimesters(),
        })),
      };

      await bunWrite(gradePath, YAML.stringify(template));
      continue;
    }

    const raw = await file.text();

    const parsed = SubjectGradesFileSchema.parse(YAML.parse(raw));

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

    await bunWrite(
      gradePath,
      YAML.stringify({ subject_name: subject.name, students: updatedStudents }),
    );
  }
}

console.log('\nGrade files sincronizados.');
