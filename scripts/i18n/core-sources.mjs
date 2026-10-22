import { HOME_COPY } from '../../lib/homeCopy.js';
import { WORLDS_COPY } from '../../lib/worldsCopy.js';
import { DEALS_COPY } from '../../lib/dealsCopy.js';
import { YATR_COPY } from '../../lib/yatrCopy.js';
import { TEXT } from '../../lib/gamblingNotice.js';
import { STOPS } from '../../lib/a1aLine.js';
const flatten = (value,prefix) => typeof value === 'string' ? [[prefix,value]] : Object.entries(value).flatMap(([key,child]) => flatten(child,`${prefix}.${key}`));
export function coreMessages() {
  return [
    ...flatten(HOME_COPY.en,'home'), ...flatten(WORLDS_COPY.en,'worlds'),
    ...flatten(DEALS_COPY.en,'deals'), ...flatten(YATR_COPY.en,'yatr'), ...flatten(TEXT.en,'gambling'),
    ...STOPS.map(stop => [`a1a.${stop.id}`, stop.line.en])
  ];
}
