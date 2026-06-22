import { file as bunFile, YAML } from 'bun';

export async function readYaml<T>(path: string, schema: { parse: (v: unknown) => T }): Promise<T> {
  const raw = await bunFile(path).text();
  const parsed = YAML.parse(raw);

  return schema.parse(parsed);
}
