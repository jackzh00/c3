import { last } from 'lodash';
import { GetValue, PlainObject } from '@c3/types';

export const get = <T extends PlainObject>(obj: T, path: string) => {
  const segs = path.split('.');
  let res = obj;
  for (const seg of segs) {
    res = res[seg];
  }
  return res;
};

export const set = <T extends PlainObject, K = GetValue<T>>(
  obj: T,
  path: string,
  value: K
): void => {
  const segs = path.split('.');
  let tmp = obj;
  for (const seg of segs.slice(0, -1)) {
    tmp = tmp[seg];
  }
  //@ts-ignore //FIXME
  tmp[last(segs)] = value;
};

export const getKeyByValue = <T extends PlainObject, V = GetValue<T>>(object: T, value: V) => {
  return Object.keys(object).find(key => object[key] === value);
};
