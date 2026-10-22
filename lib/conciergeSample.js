import { savedMessage } from './savedCopy.js';
export function getConciergeSample(locale) {
  return {
    me: savedMessage(locale,'sample.me'),
    them: savedMessage(locale,'sample.them'),
    plan: [0,1,2].map(index => savedMessage(locale,`sample.plan.${index}`))
  };
}
