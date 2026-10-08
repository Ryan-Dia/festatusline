import type { I18nKey } from '../i18n/index.js';
import { displayWidth } from '../utils/width.js';

type Translate = (key: I18nKey) => string;

// Stacked rows line up as   <row label> │ <first bar> │ <second bar>
//   Daily   │ Ctx <bar> … │ Session <bar> …
//   Weekly  │ all <bar> … │ Fable   <bar> …
//   Codex   │ 7d  <bar> …
// Each column is as wide as the widest label that can sit in it in the active locale, so a
// translated label keeps the rows aligned. In English these come out at the original fixed
// widths (7, 3, 7). Brand and model names and abbreviations stay English in every locale.
const widest = (labels: string[]): number => Math.max(...labels.map(displayWidth));

export function rowLabelWidth(t: Translate): number {
  return widest([t('row.daily'), t('row.weekly'), 'Codex']) + 1;
}

export function firstBarPrefixWidth(t: Translate): number {
  return widest(['Ctx', t('bar.all'), '7d']);
}

export function secondBarPrefixWidth(t: Translate): number {
  return widest([t('bar.session'), 'Fable']);
}
