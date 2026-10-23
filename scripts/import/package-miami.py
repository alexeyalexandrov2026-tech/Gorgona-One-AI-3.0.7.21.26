"""Create a portable review package without commits, staging, or publication."""
from hashlib import sha256
from pathlib import Path
from subprocess import check_output, run
from zipfile import ZipFile, ZIP_DEFLATED
from io import BytesIO
from tempfile import TemporaryDirectory
import json
import tarfile
import argparse

ROOT = Path(__file__).resolve().parents[2]


if __name__ == '__main__':
    run(['git', 'diff', '--check'], cwd=ROOT, check=True)
    parser = argparse.ArgumentParser()
    parser.add_argument('--base', default=json.loads((ROOT/'docs/fleet-import/decisions.json').read_text(encoding='utf-8'))['baseCommit'])
    parser.add_argument('--archive-name', default='miami-fleet-import-2026-10-23-v2.zip')
    args = parser.parse_args()
    if Path(args.archive_name).name != args.archive_name or not args.archive_name.endswith('.zip') or any(c in args.archive_name for c in '\\/:'):
        raise ValueError('Archive name must be a ZIP filename without directories')
    base = check_output(['git', 'rev-parse', args.base+'^{commit}'], cwd=ROOT, text=True).strip()
    branch = check_output(['git', 'branch', '--show-current'], cwd=ROOT, text=True).strip()
    baseline_files = set(check_output(['git','ls-tree','-r','--name-only','-z',base],cwd=ROOT).decode('utf-8').split('\0'))
    tracked = set(check_output(['git','ls-files','-z'],cwd=ROOT).decode('utf-8').split('\0'))
    untracked = set(check_output(['git','ls-files','--others','--exclude-standard','-z'],cwd=ROOT).decode('utf-8').split('\0'))
    new_files = sorted((tracked|untracked)-baseline_files-{''})
    changed = [p for p in check_output(['git','diff','--name-only','-z',base],cwd=ROOT).decode('utf-8').split('\0') if p in baseline_files and p]
    if not changed or any(not (ROOT/p).is_file() for p in changed):
        raise ValueError('Expected non-destructive source modifications')
    patch = check_output(['git', 'diff', '--binary', '--no-ext-diff', base,'--',*changed], cwd=ROOT)
    output_dir = ROOT.parent / 'outputs'
    output_dir.mkdir(exist_ok=True)
    target = output_dir / args.archive_name
    checksums = {'baseCommit': base, 'branch': branch, 'files': {}}
    with ZipFile(target, 'w', compression=ZIP_DEFLATED, compresslevel=6) as package:
        package.writestr('tracked-changes.patch', patch)
        checksums['files']['tracked-changes.patch'] = sha256(patch).hexdigest()
        for relative in sorted(file for file in new_files if file):
            file = ROOT / relative
            if not file.resolve().is_relative_to(ROOT.resolve()) or not file.is_file():
                raise ValueError('Unexpected package file')
            data = file.read_bytes()
            name = 'files/' + relative.replace('\\', '/')
            package.writestr(name, data)
            checksums['files'][name] = sha256(data).hexdigest()
        readme = (ROOT / 'docs/fleet-import/README.md').read_bytes()
        package.writestr('TRANSFER.md', readme)
        checksums['files']['TRANSFER.md'] = sha256(readme).hexdigest()
        package.writestr('SHA256SUMS.json', json.dumps(checksums, ensure_ascii=False, indent=2) + '\n')
    with ZipFile(target) as package:
        if package.testzip() is not None:
            raise ValueError('Archive integrity failure')
        for name, expected in checksums['files'].items():
            if sha256(package.read(name)).hexdigest() != expected:
                raise ValueError('Archive checksum failure')
        # Prove that the text patch and new files reconstruct this exact change
        # on the recorded clean base, without modifying any active checkout.
        with TemporaryDirectory(prefix='.tmp-fleet-transfer-', dir=ROOT.parent) as directory:
            clean = Path(directory).resolve()
            if clean.parent != ROOT.parent.resolve():
                raise ValueError('Unexpected verification directory')
            baseline = check_output(['git', 'archive', '--format=tar', base], cwd=ROOT)
            with tarfile.open(fileobj=BytesIO(baseline)) as archive:
                for member in archive:
                    destination = (clean / member.name).resolve()
                    if not destination.is_relative_to(clean) or not (member.isfile() or member.isdir()):
                        raise ValueError('Unexpected baseline entry')
                    if member.isdir():
                        destination.mkdir(parents=True, exist_ok=True)
                    else:
                        destination.parent.mkdir(parents=True, exist_ok=True)
                        destination.write_bytes(archive.extractfile(member).read())
            patch_file = clean / 'transfer.patch'
            patch_file.write_bytes(patch)
            # The checkout pins autocrlf=false; the temporary folder has no
            # local Git config, so bind the same policy explicitly.
            run(['git', '-c', 'core.autocrlf=false', 'apply', '--check', str(patch_file)], cwd=clean, check=True)
            run(['git', '-c', 'core.autocrlf=false', 'apply', str(patch_file)], cwd=clean, check=True)
            for name in checksums['files']:
                if not name.startswith('files/'):
                    continue
                relative = name.removeprefix('files/')
                destination = (clean / relative).resolve()
                if not destination.is_relative_to(clean) or destination.exists():
                    raise ValueError('New file would overwrite a baseline file')
                destination.parent.mkdir(parents=True, exist_ok=True)
                destination.write_bytes(package.read(name))
            for relative in [name for name in [*changed, *new_files] if name]:
                actual, expected = (clean / relative).read_bytes(), (ROOT / relative).read_bytes()
                if actual != expected:
                    raise ValueError(f'Transfer mismatch: {relative}; lengths={len(actual)}/{len(expected)}; '
                                     f'CRLF={actual.count(bytes([13,10]))}/{expected.count(bytes([13,10]))}; '
                                     f'newlineOnly={actual.replace(bytes([13,10]),bytes([10])) == expected.replace(bytes([13,10]),bytes([10]))}')
    result = {'path': str(target), 'bytes': target.stat().st_size, 'sha256': sha256(target.read_bytes()).hexdigest(),
              'entries': len(checksums['files']) + 1, 'integrity': 'PASS', 'cleanBaseTransfer': 'PASS', 'baseCommit': base}
    target.with_suffix('.receipt.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result))
