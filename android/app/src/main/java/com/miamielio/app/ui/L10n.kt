package com.miamielio.app.ui

/**
 * Every string the native screens show lives in the `strings.xml` of each
 * `res/values` folder, which `android/scripts/build-strings.mjs` generates from
 * `android/strings.json` - edit them there, not by hand.
 *
 * The translations mark what the app fills in as `{name}`, the way the
 * website's own phrases do, so a translator can move it anywhere in the
 * sentence:
 *
 *     stringResource(R.string.plan_sent_text).filled("count" to 3)
 */
fun String.filled(vararg values: Pair<String, Any>): String =
    values.fold(this) { text, (name, value) -> text.replace("{$name}", value.toString()) }
