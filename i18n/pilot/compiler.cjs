const path = require('node:path');
const { createUnplugin } = require('unplugin');
const compiler = require('@generaltranslation/compiler').default;
const gtConfig = require('../../gt.config.json');

const fixtureRoot = path.resolve(__dirname, '../../app/i18n-pilot/fixtures') + path.sep;

function isPilotSource(id) {
  return path.resolve(id.split('?')[0]).startsWith(fixtureRoot);
}

// GT's default transform includes every JSX file. Restrict the pilot before
// invoking it so existing pages and supplier components cannot be rewritten.
const pilotCompiler = createUnplugin((_options, meta) => {
  const plugin = compiler.raw({
    gtConfig,
    autoJsxImportSource: 'gt-next',
    enableAutoJsxInjection: true,
    compileTimeHash: true,
    logLevel: 'warn'
  }, meta);
  return {
    ...plugin,
    name: 'miami-elio-i18n-pilot',
    transformInclude(id) {
      return isPilotSource(id) && plugin.transformInclude(id);
    }
  };
});

module.exports = { pilotCompiler, isPilotSource };
