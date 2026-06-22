import { file as bunFile } from 'bun';

import { getAppPath, getStudentsPath } from './paths';
import { readYaml } from './read-yaml';
import { AppRootSchema, ClassStudentsSchema } from './schemas';

export type StudentsIndex = Record<string, { class_slug: string }>;

export async function getStudentsIndex(): Promise<StudentsIndex> {
  const appFile = await readYaml(getAppPath(), AppRootSchema);

  const index: StudentsIndex = {};

  for (const schoolClass of appFile.classes) {
    const studentsPath = getStudentsPath(appFile.active_year, schoolClass.slug);

    if (!(await bunFile(studentsPath).exists())) {
      continue;
    }

    const students = await readYaml(studentsPath, ClassStudentsSchema);

    for (const student of students) {
      index[student.uuid] = { class_slug: schoolClass.slug };
    }
  }

  return index;
}
