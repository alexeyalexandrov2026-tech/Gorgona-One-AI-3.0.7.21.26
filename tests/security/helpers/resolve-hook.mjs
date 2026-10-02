// Next.js resolves extensionless imports ('../lib/supabase', 'next/server');
// plain Node ESM does not. This hook retries such imports with the usual
// extensions so route handlers can be imported directly in tests.
const CANDIDATES = ['.js', '.mjs', '/index.js'];

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    if (!['ERR_MODULE_NOT_FOUND', 'ERR_UNSUPPORTED_DIR_IMPORT'].includes(error?.code)) throw error;
    for (const suffix of CANDIDATES) {
      try {
        return await nextResolve(specifier + suffix, context);
      } catch {
        // try the next candidate
      }
    }
    throw error;
  }
}
