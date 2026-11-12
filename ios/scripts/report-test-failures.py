#!/usr/bin/env python3
"""Turns the failed tests of a UI test run into GitHub annotations.

A run's step logs open only to someone signed in to GitHub. Its annotations
show on the run's page and through the public API, so the reason a test
failed, and what was on screen when it did, can be read from anywhere.

    xcrun xcresulttool get test-results tests --path X.xcresult > tests.json
    xcrun xcresulttool get test-results summary --path X.xcresult > summary.json
    python3 report-test-failures.py tests.json summary.json attachments

The last argument is the folder `xcresulttool export attachments` filled.
Any input may be missing or in an unexpected shape: the script then says
less, and never fails the step itself.
"""
import json
import pathlib
import re
import sys

IOS = pathlib.Path(__file__).resolve().parent.parent
REPO = IOS.parent
# GitHub keeps at most ten error annotations per step.
MOST = 10


def load(path):
    try:
        return json.loads(pathlib.Path(path).read_text())
    except (OSError, ValueError):
        return None


def data(text):
    return text.replace("%", "%25").replace("\r", "%0D").replace("\n", "%0A")


def prop(text):
    return data(text).replace(":", "%3A").replace(",", "%2C")


def failures_in(node, test=None):
    """(test, message) for every failure message in the test tree."""
    if isinstance(node, dict):
        kind = node.get("nodeType")
        name = str(node.get("name", ""))
        if kind == "Test Case":
            test = name
        elif kind == "Failure Message":
            yield test, name
        for value in node.values():
            yield from failures_in(value, test)
    elif isinstance(node, list):
        for value in node:
            yield from failures_in(value, test)


def source_of(message):
    """The test file and line a message starts with ("Tests.swift:62: ...")."""
    match = re.match(r"\s*([\w.+-]+\.swift):(\d+):\s*(.*)", message, re.S)
    if not match:
        return None, None, message
    name, line, rest = match.groups()
    found = [p for p in IOS.rglob(name) if "build" not in p.relative_to(IOS).parts]
    path = found[0].relative_to(REPO).as_posix() if found else None
    return path, line, rest or message


def on_screen(folder):
    """What was on screen at the first failure: the labelled elements of
    the outline Xcode saved, without memory addresses."""
    if not folder:
        return None
    folder = pathlib.Path(folder)
    manifest = load(folder / "manifest.json")
    records = []

    def walk(node):
        if isinstance(node, dict):
            if "exportedFileName" in node:
                records.append(node)
            for value in node.values():
                walk(value)
        elif isinstance(node, list):
            for value in node:
                walk(value)

    walk(manifest)
    for record in records:
        if not str(record.get("suggestedHumanReadableName", "")).startswith("App UI hierarchy"):
            continue
        exported = folder / str(record.get("exportedFileName", ""))
        if not exported.is_file():
            continue
        kept = []
        for line in exported.read_text(errors="replace").splitlines():
            if "identifier:" not in line and "label:" not in line:
                continue
            line = re.sub(r"0x[0-9a-f]+, ", "", line).strip()
            kept.append(line[:150])
            if len(kept) == 70:
                break
        return "\n".join(kept)
    return None


tests = load(sys.argv[1]) if len(sys.argv) > 1 else None
summary = load(sys.argv[2]) if len(sys.argv) > 2 else None
attachments = sys.argv[3] if len(sys.argv) > 3 else None

failures = list(failures_in(tests))
if not failures and isinstance(summary, dict):
    # No failure messages in the tree (a crash, say): the summary still
    # names the test and gives its reason.
    for item in summary.get("testFailures") or []:
        if isinstance(item, dict):
            failures.append((item.get("testName"), str(item.get("failureText", ""))))

if isinstance(summary, dict):
    counts = {key: summary.get(key) for key in ("totalTestCount", "passedTests", "failedTests", "skippedTests")}
    print("Result:", summary.get("result"), counts)

for index, (test, message) in enumerate(failures):
    path, line, text = source_of(message)
    title = test or "UI test"
    print(f"FAILED {title}: {path or ''}{':' + line if line else ''} {text}")
    if index >= MOST:
        continue
    where = f"file={prop(path)},line={line}," if path else ""
    print(f"::error {where}title={prop(title)}::{data(text)}")

if not failures:
    print("::error title=UI tests::The tests failed, but the result bundle names no failed test.")

screen = on_screen(attachments)
if screen:
    print(f"::notice title=On screen at the first failure::{data(screen)}")
