#!/usr/bin/env python3
"""Picks the screenshots the UI tests took out of an exported Xcode result
bundle and gives them back the names the tests chose ("1-home.png").

    xcrun xcresulttool export attachments --path X.xcresult --output-path attachments
    python3 collect-screenshots.py attachments screenshots
"""
import json
import pathlib
import re
import shutil
import sys

source, destination = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
destination.mkdir(parents=True, exist_ok=True)


def attachments(node):
    """Every attachment record in the manifest, whatever its nesting."""
    if isinstance(node, dict):
        if "exportedFileName" in node:
            yield node
        for value in node.values():
            yield from attachments(value)
    elif isinstance(node, list):
        for value in node:
            yield from attachments(value)


manifest = source / "manifest.json"
records = list(attachments(json.loads(manifest.read_text()))) if manifest.exists() else []
copied = 0
for record in records:
    exported = source / str(record.get("exportedFileName", ""))
    # The tests name their screenshots "<number>-<what>"; Xcode appends
    # "_0_<uuid>.png" to that.
    named = re.match(r"(\d+-[a-z0-9-]+)", str(record.get("suggestedHumanReadableName", "")))
    if named and exported.suffix == ".png" and exported.is_file():
        shutil.copyfile(exported, destination / f"{named.group(1)}.png")
        copied += 1

if copied == 0:
    # The manifest was not in the shape expected: keep every image rather
    # than lose the run's pictures.
    for image in sorted(source.glob("*.png")):
        shutil.copyfile(image, destination / image.name)
        copied += 1
    print("No named screenshots found in the manifest; copied all images instead.")

print(f"Kept {copied} screenshots of {len(records)} attachments in {destination}")
