import fs from 'fs';
import path from 'path';

// Since i18n.js is not a standard CJS module, we will read it and parse it roughly.
// But first, let's try importing it.
try {
  const { translations } = await import('../lib/i18n.js');
  
  const baseKeys = Object.keys(translations.en).sort();
  const errors = [];

  for (const [lang, trans] of Object.entries(translations)) {
    if (lang === 'en') continue;
    
    const langKeys = Object.keys(trans).sort();
    
    const missingTop = baseKeys.filter(k => !langKeys.includes(k));
    if (missingTop.length > 0) errors.push(`[${lang}] Missing top-level keys: ${missingTop.join(', ')}`);
    
    for (const topKey of baseKeys) {
      if (typeof translations.en[topKey] === 'object' && translations.en[topKey] !== null) {
        if (!trans[topKey]) continue; 
        const baseSubKeys = Object.keys(translations.en[topKey]);
        const langSubKeys = Object.keys(trans[topKey]);
        
        const missingSub = baseSubKeys.filter(k => !langSubKeys.includes(k));
        if (missingSub.length > 0) errors.push(`[${lang}] Missing sub-keys in ${topKey}: ${missingSub.join(', ')}`);
      }
    }
  }

  if (errors.length > 0) {
    console.log('Validation FAILED:');
    console.log(errors.join('\n'));
    process.exit(1);
  } else {
    console.log('Validation PASSED: All languages have parity with EN keys.');
  }

} catch(e) {
  console.log('Failed to import directly, reading file manually or check error:', e);
}
