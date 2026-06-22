import { join } from 'node:path';

const DATA_ROOT = join(process.cwd(), 'data');

export function getAppPath(): string {
  return join(DATA_ROOT, 'app.yml');
}

export function getYearDir(year: number): string {
  return join(DATA_ROOT, 'school-years', String(year));
}

export function getYearConfigPath(year: number): string {
  return join(getYearDir(year), 'config.yml');
}

export function getSubjectsPath(year: number): string {
  return join(getYearDir(year), 'subjects.yml');
}

export function getClassDir(year: number, classSlug: string): string {
  return join(getYearDir(year), 'classes', classSlug);
}

export function getStudentsPath(year: number, classSlug: string): string {
  return join(getClassDir(year, classSlug), 'students.yml');
}

export function getGradePath(year: number, classSlug: string, subjectCode: string): string {
  return join(getClassDir(year, classSlug), 'grades', `${subjectCode}.yml`);
}
