// Loaded with `node --import ./tests/register.mjs`. The app imports its own
// modules without file extensions (the bundler resolves them); this hook lets
// plain Node resolve those imports the same way, so tests can load lib/ and
// app/api/ modules directly.
import { register } from 'node:module';

register('./resolve-extensions.mjs', import.meta.url);
