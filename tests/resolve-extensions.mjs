// Module resolve hook (see register.mjs): retries extensionless imports with
// the extensions Next.js would try - relative imports ('../lib/supabase') and
// package subpaths without an exports map ('next/server').
const EXTENSIONS = ['.js', '.mjs', '/index.js'];

function retryable(specifier) {
  if (specifier.startsWith('./') || specifier.startsWith('../')) return true;
  // 'pkg/sub' or '@scope/pkg/sub', but not a bare 'pkg' or 'node:' builtin
  const parts = specifier.split('/');
  return !specifier.includes(':') && parts.length > (specifier.startsWith('@') ? 2 : 1);
}

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    if (error?.code !== 'ERR_MODULE_NOT_FOUND' || !retryable(specifier)) throw error;
    for (const extension of EXTENSIONS) {
      try {
        return await nextResolve(specifier + extension, context);
      } catch {
        /* try the next extension */
      }
    }
    throw error;
  }
}
