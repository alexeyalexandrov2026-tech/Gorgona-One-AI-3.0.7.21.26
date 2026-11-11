#!/bin/bash
# Prints the identifier of an available iPhone simulator on the newest iOS
# runtime installed, so CI does not depend on a particular device name.
set -euo pipefail

xcrun simctl list devices available --json | python3 -c '
import json, re, sys

candidates = []
for runtime, devices in json.load(sys.stdin)["devices"].items():
    match = re.search(r"iOS-(\d+)-(\d+)", runtime)
    if not match:
        continue
    version = (int(match.group(1)), int(match.group(2)))
    for device in devices:
        name = device.get("name", "")
        if not name.startswith("iPhone") or device.get("isAvailable") is False:
            continue
        # Prefer the plain current model over Pro, Max, Plus, SE and e variants.
        plain = re.fullmatch(r"iPhone \d+", name) is not None
        candidates.append((version, plain, name, device["udid"]))

if not candidates:
    sys.exit("No iPhone simulator is available on this machine.")

version, _, name, udid = max(candidates)
print(f"{name} (iOS {version[0]}.{version[1]})", file=sys.stderr)
print(udid)
'
