import { v2 } from '@google-cloud/translate';
import { promises as fs } from 'fs';

export interface TranslateParams {
  readonly srcPath: string;
  readonly outPath: string;
  readonly toLanguage: string;
}

const readJson = async (path: string): Promise<Record<string, unknown>> => {
  return import(path) as Promise<Record<string, unknown>>;
}

const translate = async (text: string, to: string): Promise<string> => {
  if (process.env.NODE_ENV !== 'development') {
    console.log(`[translating] ${text}`);
  }

  const translate = new v2.Translate();
  const [translation] = await translate.translate(text, to);
  return translation;
}

const setValue = (obj: Record<string, unknown>, paths: string[], value: string): void => {
  const [first, ...rest] = paths;
  if (rest.length === 0) {
    obj[first] = value;
    return;
  }

  if (!obj[first]) {
    obj[first] = {};
  }

  setValue(obj[first] as Record<string, unknown>, rest, value);
}

export const isObject = (x: unknown): x is Record<string, unknown> =>
  typeof x === 'object' && x !== null && x.constructor === Object;

const traverse = async (
  object: unknown,
  onValue: (paths: string[], value: unknown) => Promise<void> | void,
  lastPaths: string[] = [],
): Promise<void> => {
  if (typeof object === 'string') {
    return onValue(lastPaths, object);
  }

  if (Array.isArray(object)) {
    await Promise.all(object.map((value, index) => {
      return traverse(value, onValue, [...lastPaths, index.toString()]);
    }));
    return;
  }

  if (isObject(object)) {
    await Promise.all(Object.entries(object as any).map(([key, value]) => {
      return traverse(value, onValue, [...lastPaths, key]);
    }));
    return;
  }

  throw new TypeError(`Unknown data structure ${object}`);
}

const writeJson = async (path: string, object: Record<string, unknown>): Promise<void> => {
  await fs.writeFile(path, JSON.stringify(object, null, 2));
}

export const main = async (params: TranslateParams) => {
  const { srcPath, outPath, toLanguage } = params;

  const record = await readJson(srcPath);
  const translatedJson = {};

  await traverse(record, async (keys, value) => {
    const translated = await translate(value as string, toLanguage);
    setValue(translatedJson, keys, translated);
  });

  await writeJson(outPath, translatedJson);
}
