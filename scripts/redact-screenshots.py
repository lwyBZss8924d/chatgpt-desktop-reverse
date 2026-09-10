#!/usr/bin/env python3
"""Make deterministic mosaic derivatives; never overwrite the archived captures."""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image

parser = argparse.ArgumentParser()
parser.add_argument('--out', required=True)
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
source = root / 'evidence/runtime/shots'
out = Path(args.out).resolve()
out.mkdir(parents=True, exist_ok=True)
records = []
for path in sorted(source.rglob('*.jpg')):
    name = path.relative_to(source).as_posix()
    image = Image.open(path).convert('RGB')
    w, h = image.size
    regions = []
    if not name.startswith('settings/') and not name.startswith(('25-', '26-')):
        regions += [(0, .94, .18, 1, 'account identifier'), (0, .34, .18, .94, 'workspace list')]
    if name.startswith(('01-', '19-', '20-', '21-', '22-', '23-', '24-')):
        regions += [(.25, .42, .59, .52, 'workspace heading'), (.19, .83, .63, .88, 'workspace identity')]
    if name.startswith(('01-', '19-', '20-', '24-')):
        regions += [(.63, .18, 1, 1, 'private review content')]
    if name.startswith('07-'):
        regions += [(.36, .28, .65, .49, 'recent conversation labels')]
    if name == 'settings/03-profile.jpg':
        regions += [(.49, .10, .66, .27, 'profile identity'), (.56, .60, .84, .82, 'project labels')]
    if name in ['25-settings-open.jpg', '26-settings-search.jpg', 'settings/01-general.jpg', 'settings/12-account.jpg']:
        regions += [(.65, .42, .84, .49, 'local folder value')]
    if name == 'settings/07-personalization.jpg':
        regions += [(.35, .26, .77, .37, 'personal instructions')]
    if name == 'settings/10-usage-billing.jpg':
        regions += [(.35, .34, .78, .83, 'account usage values')]
    if name == 'settings/21-environments.jpg':
        regions += [(.35, .20, .76, .99, 'project labels')]
    if name == 'settings/22-worktrees.jpg':
        regions += [(.63, .16, .78, .24, 'local folder value')]
    if name == 'settings/23-archived-chats.jpg':
        regions += [(.35, .23, .78, .99, 'conversation labels')]
    for x1, y1, x2, y2, _ in regions:
        box = (int(x1*w), int(y1*h), min(w, int(x2*w)), min(h, int(y2*h)))
        crop = image.crop(box)
        small = crop.resize((max(1, crop.width//36), max(1, crop.height//36)), Image.Resampling.BOX)
        image.paste(small.resize(crop.size, Image.Resampling.NEAREST), box)
    target = out / name
    target.parent.mkdir(parents=True, exist_ok=True)
    image.save(target, quality=93, optimize=True, progressive=True)
    records.append({'name':name,'originalSha256':hashlib.sha256(path.read_bytes()).hexdigest(), 'sha256':hashlib.sha256(target.read_bytes()).hexdigest(), 'regions':[{'bounds':[a,b,c,d],'purpose':reason} for a,b,c,d,reason in regions]})
(out.parent / 'redaction-manifest.json').write_text(json.dumps({'method':'local mosaic, 36-pixel blocks; no synthesized imagery','captures':records},indent=2)+'\n')
print(f'redaction: {len(records)} real-image derivatives written')
