import { join } from 'node:path';
import { parse as parseYaml, stringify } from 'yaml';
import { AppRootSchema, ClassStudentsSchema, SubjectsSchema } from '../src/lib/schemas';

async function readYaml<T>(path: string, schema: { parse: (v: unknown) => T }): Promise<T> {
  const raw = await Bun.file(path).text();
  return schema.parse(parseYaml(raw));
}

// -------------------------------------

const appFile = await readYaml(join('data', 'app.yml'), AppRootSchema);
const yearDir = join('data', 'school-years', String(appFile.active_year));
console.log(yearDir);

const subjects = await readYaml(join(yearDir, 'subjects.yml'), SubjectsSchema);

const index: Record<string, { class_slug: string }> = {};

for (const schoolClass of appFile.classes) {
  const classDir = join(yearDir, 'classes', schoolClass.slug);
  const studentsPath = join(classDir, 'students.yml');

  if (!(await Bun.file(studentsPath).exists())) {
    // Turma sem alunos cadastrados neste ano — pula sem erro
    continue;
  }

  const students = await readYaml(studentsPath, ClassStudentsSchema);

  for (const student of students) {
    index[student.uuid] = { class_slug: schoolClass.slug };
  }

  for (const subject of subjects) {
    const gradePath = join(classDir, 'grades', `${subject.code}.yml`);
    const file = Bun.file(gradePath);

    if (!(await file.exists())) {
      const template = {
        subject_name: subject.name,
        students: students.map((student) => ({
          student_uuid: student.uuid,
          student_name: student.name,
          bimesters: Array.from({ length: 4 }, () => ({ grade: 0.0, recovery: null })),
        })),
      };

      await Bun.write(gradePath, stringify(template + '\n'));
      continue;
    }

    const raw = await file.text();

    const parsed = parseYaml(raw) as {
      subject_name: string;
      students: {
        student_uuid: string;
        student_name?: string;
        bimesters: unknown[];
      }[];
    };
    console.log(parsed);

    const studentMap = Object.fromEntries(students.map((s) => [s.uuid, s.name]));

    // Mantém notas existentes, atualiza nomes/disciplina e adiciona alunos novos sem template
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
          bimesters: Array.from({ length: 4 }, () => ({ grade: 0.0, recovery: null })),
        });
      }
    }

    await Bun.write(
      gradePath,
      stringify({ subject_name: subject.name, students: updatedStudents }),
    );
  }
}

await Bun.write(join('data', 'generated', 'uuid-index.json'), JSON.stringify(index, null, 2));
console.log(`Index gerado: ${Object.keys(index).length} alunos`);
