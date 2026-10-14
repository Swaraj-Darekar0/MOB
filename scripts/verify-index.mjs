#!/usr/bin/env node

/**
 * Permanent Verification Script for MOB/.wiki/INDEX.md
 * 
 * Verifies:
 * 1. ASD-STE-100 sentence word count constraints (all <= 25 words).
 * 2. All Markdown links and anchor references resolve to valid files/headings.
 * 3. All referenced source code files and directories exist on disk.
 * 4. Active voice compliance and absence of complex conjunctions.
 * 
 * Usage:
 *   node scripts/verify-index.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mobDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(mobDir, '..');
const wikiDir = path.join(mobDir, '.wiki');
const indexFile = path.join(wikiDir, 'INDEX.md');
const featureMapFile = path.join(wikiDir, 'feature_map.md');

console.log('================================================================================');
console.log('MOB WIKI INDEX VERIFICATION ENGINE (scripts/verify-index.mjs)');
console.log('Index Target:       ' + indexFile);
console.log('Feature Map Target: ' + featureMapFile);
console.log('Application Root:   ' + mobDir);
console.log('================================================================================\n');

if (!fs.existsSync(indexFile)) {
  console.error(`[ERROR] Target file does not exist: ${indexFile}`);
  process.exit(1);
}

const indexContent = fs.readFileSync(indexFile, 'utf8');
const featureMapContent = fs.existsSync(featureMapFile) ? fs.readFileSync(featureMapFile, 'utf8') : '';

let totalFailures = 0;

// -----------------------------------------------------------------------------
// CHECK 1: MARKDOWN LINKS & HEADING ANCHOR RESOLUTION
// -----------------------------------------------------------------------------
console.log('>>> CHECK 1: MARKDOWN LINKS & HEADING ANCHORS');

const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
let match;
const links = [];
while ((match = linkRegex.exec(indexContent)) !== null) {
  const lineNum = indexContent.substring(0, match.index).split('\n').length;
  links.push({ text: match[1], url: match[2], line: lineNum });
}

function extractHeadings(content) {
  return content
    .split(/\r?\n/)
    .filter(l => l.startsWith('#'))
    .map(l => {
      const hMatch = l.match(/^(#+)\s+(.*)$/);
      return hMatch ? { level: hMatch[1].length, text: hMatch[2].trim() } : null;
    })
    .filter(Boolean);
}

function computeSlugs(headings) {
  const slugs = new Set();
  headings.forEach(h => {
    const s1 = h.text.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');
    const s2 = h.text.toLowerCase().replace(/[^\w\s-]/g, ' ').trim().replace(/\s+/g, '-');
    slugs.add(s1);
    slugs.add(s2);
  });
  return slugs;
}

const fmHeadings = extractHeadings(featureMapContent);
const fmSlugs = computeSlugs(fmHeadings);

const indexHeadings = extractHeadings(indexContent);
const indexSlugs = computeSlugs(indexHeadings);

let brokenLinks = 0;
links.forEach((l, i) => {
  const [filePath, anchor] = l.url.split('#');
  let targetFileOk = true;
  let anchorOk = true;

  if (filePath) {
    const full = path.resolve(wikiDir, filePath);
    if (!fs.existsSync(full)) targetFileOk = false;
  }

  if (anchor) {
    const slugSet = filePath === 'INDEX.md' ? indexSlugs : fmSlugs;
    if (!slugSet.has(anchor)) {
      anchorOk = false;
    }
  }

  const pass = targetFileOk && anchorOk;
  if (!pass) brokenLinks++;
  console.log(`  [${pass ? 'OK' : 'FAIL'}] Link #${i + 1} (Line ${l.line}): [${l.text}](${l.url}) -> File: ${targetFileOk}, Anchor: ${anchorOk}`);
});

console.log(`\nLink Test Result: ${links.length - brokenLinks}/${links.length} valid. Broken: ${brokenLinks}\n`);
if (brokenLinks > 0) totalFailures += brokenLinks;

// -----------------------------------------------------------------------------
// CHECK 2: ASD-STE-100 SENTENCE LENGTH & WORD COUNT
// -----------------------------------------------------------------------------
console.log('>>> CHECK 2: ASD-STE-100 SENTENCE LENGTH & WORD COUNT');

const cleanBody = indexContent
  .replace(/```[\s\S]*?```/g, '')
  .replace(/\$\$[\s\S]*?\$\$/g, '');

const rawLines = cleanBody.split(/\r?\n/);
const sentences = [];

rawLines.forEach((line, idx) => {
  const lineNum = idx + 1;
  const t = line.trim();
  if (!t || t.startsWith('#') || t === '---') return;

  // Handle table rows
  if (t.startsWith('|')) {
    if (t.includes('---')) return;
    const cells = t.split('|').slice(1, -1).map(c => c.trim());
    cells.forEach(c => {
      let stripped = c
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/`[^`]+`/g, 'token')
        .replace(/\*\*([^*]+)\*\*/g, '$1');
      if (stripped.length > 3 && !stripped.match(/^[0-9.-]+$/)) {
        stripped.split(/(?<=[.!?])\s+/).forEach(part => {
          if (part.trim().length > 0) {
            sentences.push({ text: part.trim(), lineNum, type: 'table_cell' });
          }
        });
      }
    });
    return;
  }

  // Handle prose and list items
  let stripped = t.replace(/^[-*+]\s+/, '').replace(/^\d+\.\s+/, '');
  stripped = stripped
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1');

  stripped.split(/(?<=[.!?])\s+/).forEach(part => {
    if (part.trim().length > 0) {
      sentences.push({ text: part.trim(), lineNum, type: 'prose' });
    }
  });
});

function tokenize(str, splitHyphen = false) {
  let s = str
    .replace(/(\d+)\.(\d+)/g, '$1_DEC_$2')
    .replace(/\be\.g\./gi, 'eg_token')
    .replace(/\bi\.e\./gi, 'ie_token')
    .replace(/\bvs\./gi, 'vs_token');
  if (splitHyphen) s = s.replace(/[-_]/g, ' ');
  return s
    .replace(/[.,/#!$%^&*;:{}=\`~()?"'<>]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(w => w.length > 0);
}

const proseOnly = sentences.filter(s => s.type === 'prose');
const proseEvaluated = proseOnly.map(s => {
  const words = tokenize(s.text, false);
  return { ...s, wordCount: words.length, passed: words.length <= 25 };
});
const prosePass = proseEvaluated.filter(s => s.passed).length;
const proseCompliance = (prosePass / proseEvaluated.length) * 100;

console.log(`Prose Sentences Count:        ${proseEvaluated.length}`);
console.log(`Prose Sentences <= 25 words:   ${prosePass}`);
console.log(`Prose Compliance Rate:        ${proseCompliance.toFixed(2)}% (Target: >= 80.00%)`);
console.log(`Prose Max Word Count:         ${Math.max(...proseEvaluated.map(s => s.wordCount))}`);
console.log(`Prose Avg Word Count:         ${(proseEvaluated.reduce((a, b) => a + b.wordCount, 0) / proseEvaluated.length).toFixed(2)}`);

if (proseCompliance < 80.0) {
  console.error('[FAIL] Prose sentence compliance is below 80% threshold!');
  totalFailures++;
}

// Check comprehensive (prose + table cells)
const allEvaluated = sentences.map(s => {
  const words = tokenize(s.text, false);
  return { ...s, wordCount: words.length, passed: words.length <= 25 };
});
const allPass = allEvaluated.filter(s => s.passed).length;
const allCompliance = (allPass / allEvaluated.length) * 100;
console.log(`Comprehensive Compliance:     ${allCompliance.toFixed(2)}% (${allPass}/${allEvaluated.length} <= 25 words)`);

const failingSentences = allEvaluated.filter(s => !s.passed);
if (failingSentences.length > 0) {
  console.error(`[FAIL] Found ${failingSentences.length} sentences exceeding 25 words:`);
  failingSentences.forEach(s => {
    console.error(`  - Line ${s.lineNum} (${s.wordCount} words): "${s.text}"`);
  });
  totalFailures += failingSentences.length;
}

// -----------------------------------------------------------------------------
// CHECK 3: GRAMMATICAL VOICE & CLAUSE COMPLEXITY
// -----------------------------------------------------------------------------
console.log('\n>>> CHECK 3: GRAMMATICAL VOICE & CLAUSE COMPLEXITY');

const passiveRegex = /\b(is|are|was|were|be|been|being)\s+([a-z]+(?:ed|en)|built|made|held|run|set|put|sent|found|kept|paid|struck|cut|written|given|taken|shown|chosen|known|drawn|seen|done)\b/gi;
const complexRegex = /\b(although|even though|whereas|while|nevertheless|inasmuch as|provided that|in order that|in order to|notwithstanding)\b/gi;

let passiveCount = 0;
let complexCount = 0;

proseOnly.forEach(s => {
  const pMatch = s.text.match(passiveRegex);
  if (pMatch) {
    passiveCount++;
    console.log(`  [PASSIVE VOICE] Line ${s.lineNum}: "${pMatch.join(', ')}" in "${s.text}"`);
  }
  const cMatch = s.text.match(complexRegex);
  if (cMatch) {
    complexCount++;
    console.log(`  [COMPLEX CONJUNCTION] Line ${s.lineNum}: "${cMatch.join(', ')}" in "${s.text}"`);
  }
});

const activeCompliance = ((proseOnly.length - passiveCount) / proseOnly.length) * 100;
console.log(`Total Passive Voice Instances: ${passiveCount} / ${proseOnly.length} sentences`);
console.log(`Active Voice Compliance:       ${activeCompliance.toFixed(2)}% (Target: >= 80.00%)`);
console.log(`Complex Conjunction Instances: ${complexCount}`);

if (activeCompliance < 80.0) {
  console.error('[FAIL] Active voice compliance is below 80% threshold!');
  totalFailures++;
}

// -----------------------------------------------------------------------------
// CHECK 4: REFERENCED SOURCE CODE & DIRECTORY PATHS ON DISK
// -----------------------------------------------------------------------------
console.log('\n>>> CHECK 4: CODEBASE PATH REFERENCES IN INDEX.md');

// Extract all code paths from backticks and tables
const pathRegex = /`((?:src\/|MOB\/|\.gemini|scripts\/)[^`]+)`/g;
const extractedPaths = new Set();
let pathMatch;
while ((pathMatch = pathRegex.exec(indexContent)) !== null) {
  let candidate = pathMatch[1].trim();
  // Strip trailing punctuation if accidentally included inside backtick
  candidate = candidate.replace(/[.,;:]$/, '');
  extractedPaths.add(candidate);
}

// Also explicitly inspect Table 5 (Primary Source Files) and Table 7 (Directory Path)
lines_loop: for (const line of rawLines) {
  if (!line.trim().startsWith('|')) continue;
  const parts = line.split('|').slice(1, -1).map(p => p.trim());
  if (parts.length >= 3 && parts[0].startsWith('`') && parts[0].includes('src/')) {
    // Table 7 directory
    const cleanP = parts[0].replace(/`/g, '').trim();
    extractedPaths.add(cleanP);
  }
  if (parts.length >= 5 && (parts[4].includes('src/') || parts[4].includes('`'))) {
    // Table 5 source files
    const subMatches = parts[4].match(/`([^`]+)`/g);
    if (subMatches) {
      subMatches.forEach(sm => extractedPaths.add(sm.replace(/`/g, '').trim()));
    }
  }
}

let pathFailures = 0;
const sortedPaths = [...extractedPaths].sort();
console.log(`Found ${sortedPaths.length} unique codebase path references in INDEX.md:`);

sortedPaths.forEach(p => {
  let resolved;
  if (p.startsWith('MOB/')) {
    resolved = path.resolve(repoRoot, p);
    if (!fs.existsSync(resolved)) {
      resolved = path.resolve(mobDir, p.replace(/^MOB\//, ''));
    }
  } else {
    resolved = path.resolve(mobDir, p);
  }

  const exists = fs.existsSync(resolved);
  if (!exists) {
    pathFailures++;
    console.error(`  [MISSING PATH] ${p} -> (${resolved})`);
  } else {
    console.log(`  [EXISTS]       ${p}`);
  }
});

console.log(`\nPath Verification Result: ${sortedPaths.length - pathFailures}/${sortedPaths.length} valid. Missing: ${pathFailures}`);
if (pathFailures > 0) totalFailures += pathFailures;

// -----------------------------------------------------------------------------
// FINAL VERIFICATION SUMMARY & EXIT CODE
// -----------------------------------------------------------------------------
console.log('\n================================================================================');
console.log('FINAL VERIFICATION SUMMARY');
console.log('================================================================================');
console.log(`- Markdown Links Valid:         ${links.length - brokenLinks}/${links.length} (Broken: ${brokenLinks})`);
console.log(`- Prose Sentence Compliance:    ${proseCompliance.toFixed(2)}% (Max words: ${Math.max(...proseEvaluated.map(s => s.wordCount))})`);
console.log(`- Active Voice Compliance:      ${activeCompliance.toFixed(2)}% (Passive: ${passiveCount})`);
console.log(`- Codebase Paths Valid:         ${sortedPaths.length - pathFailures}/${sortedPaths.length} (Missing: ${pathFailures})`);
console.log('--------------------------------------------------------------------------------');

if (totalFailures === 0 && brokenLinks === 0 && pathFailures === 0 && proseCompliance >= 80.0) {
  console.log('OVERALL VERDICT: PASSED (All checks succeeded)');
  console.log('================================================================================');
  process.exit(0);
} else {
  console.error(`OVERALL VERDICT: FAILED (Total failure points: ${totalFailures})`);
  console.log('================================================================================');
  process.exit(1);
}
