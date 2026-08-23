// Self-contained test for the zip-extraction algorithm used by
// addSkillFromZip() in src/lib/db/skills.ts. Builds its own test zip in
// memory (SKILL.md + a code reference file + notes + a fake binary + an
// empty file) and verifies: text files are extracted, binaries and empty
// files are skipped, the common top-level folder is stripped from
// displayed paths, and SKILL.md is always placed first.
//
// Run with: node scripts/test-zip-skill-extract.mjs
import JSZip from 'jszip';

const ALLOWED_SKILL_EXTENSIONS = [
  '.md', '.markdown', '.txt', '.json', '.yaml', '.yml', '.csv',
  '.py', '.js', '.ts', '.tsx', '.jsx', '.sh', '.html', '.css', '.sql', '.rb', '.go', '.rs',
];
const BINARY_LOOKING_NAME = /\.(png|jpe?g|gif|webp|svg|ico|bmp|pdf|zip|tar|gz|7z|rar|exe|dll|so|dylib|bin|mp3|mp4|wav|mov|avi|woff2?|ttf|otf|eot|pyc|class)$/i;
const MAX_SKILL_FILE_BYTES = 200_000;

async function extractZipToSkill(buffer, originalName) {
  const zip = await JSZip.loadAsync(buffer);
  const entries = Object.values(zip.files).filter((entry) => !entry.dir);

  const topLevelDirs = new Set(entries.map((e) => e.name.split('/')[0]));
  const commonPrefix =
    topLevelDirs.size === 1 && entries.every((e) => e.name.includes('/')) ? `${[...topLevelDirs][0]}/` : '';

  const pieces = [];
  const skipped = [];

  for (const entry of entries) {
    const lowerName = entry.name.toLowerCase();
    if (BINARY_LOOKING_NAME.test(lowerName)) {
      skipped.push([entry.name, 'binary-extension']);
      continue;
    }
    if (!ALLOWED_SKILL_EXTENSIONS.some((ext) => lowerName.endsWith(ext))) {
      skipped.push([entry.name, 'not-allowed-extension']);
      continue;
    }
    const text = await entry.async('string');
    if (!text.trim() || text.includes('\u0000')) {
      skipped.push([entry.name, 'empty-or-binary-content']);
      continue;
    }
    if (text.length > MAX_SKILL_FILE_BYTES) {
      skipped.push([entry.name, 'too-large']);
      continue;
    }
    const displayPath = entry.name.startsWith(commonPrefix) ? entry.name.slice(commonPrefix.length) : entry.name;
    pieces.push({ path: displayPath, content: text });
  }

  pieces.sort((a, b) => {
    const aIsSkill = /(^|\/)skill\.md$/i.test(a.path) ? 0 : 1;
    const bIsSkill = /(^|\/)skill\.md$/i.test(b.path) ? 0 : 1;
    return aIsSkill - bIsSkill;
  });

  const combined = pieces.map((p) => `# File: ${p.path}\n\n${p.content}\n\n---\n\n`).join('');
  return { name: originalName.replace(/\.zip$/i, ''), content: combined, pieces, skipped };
}

// --- Build an in-memory test zip mimicking a real skill folder ---
const zip = new JSZip();
zip.file('my-skill/SKILL.md', '# My Test Skill\n\nInstructions go here.');
zip.file('my-skill/reference.py', 'def helper():\n    return 42\n');
zip.file('my-skill/notes.txt', 'Some supporting notes.');
zip.file('my-skill/logo.png', new Uint8Array([0x89, 0x50, 0x4e, 0x47, ...new Array(50).fill(0)]));
zip.file('my-skill/empty.md', '');
const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

const result = await extractZipToSkill(zipBuffer, 'test-skill-bundle.zip');

let pass = true;
function check(label, condition) {
  console.log(`${condition ? 'PASS' : 'FAIL'} - ${label}`);
  if (!condition) pass = false;
}

check('extracted exactly the 3 text files', result.pieces.length === 3);
check('SKILL.md is first', result.content.startsWith('# File: SKILL.md'));
check('common "my-skill/" prefix stripped', result.pieces.every((p) => !p.path.startsWith('my-skill/')));
check('logo.png skipped as binary', result.skipped.some(([name, reason]) => name.endsWith('logo.png') && reason === 'binary-extension'));
check('empty.md skipped as empty', result.skipped.some(([name, reason]) => name.endsWith('empty.md') && reason === 'empty-or-binary-content'));
check('bundle name derived from zip filename', result.name === 'test-skill-bundle');

console.log(pass ? '\nAll checks passed.' : '\nSOME CHECKS FAILED.');
process.exit(pass ? 0 : 1);
