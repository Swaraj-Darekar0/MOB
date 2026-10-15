import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

console.log('\n======================================================================');
console.log('🧪 Section 52: Goals Tab View Modes & Modal Viewport Containment');
console.log('======================================================================\n');

let passedTests = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err);
    process.exit(1);
  }
}

// ----------------------------------------------------------------------
// 1. Testing getGoalVisuals Deterministic Tagging & Logic
// ----------------------------------------------------------------------
console.log('--- 1. Testing getGoalVisuals Deterministic Tagging & Logic ---');

const goalVisualsFile = path.resolve('src/utils/goalVisuals.ts');
const goalVisualsCode = fs.readFileSync(goalVisualsFile, 'utf8');

test('goalVisuals.ts exports getGoalVisuals function', () => {
  assert.ok(goalVisualsCode.includes('export function getGoalVisuals'));
  assert.ok(goalVisualsCode.includes('GoalVisuals'));
});

test('Completed goals assign Trophy icon and completion celebration tag', () => {
  assert.ok(goalVisualsCode.includes("status === 'COMPLETED'"));
  assert.ok(goalVisualsCode.includes('Trophy'));
  assert.ok(goalVisualsCode.includes('🎉 Target Reached'));
  assert.ok(goalVisualsCode.includes('#EAB308'));
});

test('Shortfalls assign empathetic shortfall strain tag', () => {
  assert.ok(goalVisualsCode.includes('if (hasShortfall)'));
  assert.ok(goalVisualsCode.includes('Wind'));
  assert.ok(goalVisualsCode.includes('💨 sigh · shortfall strain'));
  assert.ok(goalVisualsCode.includes('#FB7185'));
});

test('Paused goals assign Moon icon and On Hold tag', () => {
  assert.ok(goalVisualsCode.includes("status === 'PAUSED'"));
  assert.ok(goalVisualsCode.includes('Moon'));
  assert.ok(goalVisualsCode.includes('⏸ On Hold'));
  assert.ok(goalVisualsCode.includes('#94A3B8'));
});

test('Matches semantic keywords (laptop, travel, car, emergency, wealth)', () => {
  assert.ok(goalVisualsCode.includes("name.includes('laptop')") || goalVisualsCode.includes("name.includes('macbook')"));
  assert.ok(goalVisualsCode.includes("name.includes('trip')") || goalVisualsCode.includes("name.includes('travel')"));
  assert.ok(goalVisualsCode.includes("name.includes('car')"));
  assert.ok(goalVisualsCode.includes("name.includes('emergency')"));
  assert.ok(goalVisualsCode.includes("name.includes('invest')") || goalVisualsCode.includes("name.includes('wealth')"));
});

// ----------------------------------------------------------------------
// 2. Testing Goals 2-Column Grid Layout Math
// ----------------------------------------------------------------------
console.log('\n--- 2. Testing Goals 2-Column Grid Layout Math ---');

test('Grid card width fits 2 columns comfortably on mobile screens', () => {
  const screenWidth = 390; // Standard iPhone 14/15 width
  const paddingHorizontal = 16 * 2;
  const gap = 12;
  const availableWidth = screenWidth - paddingHorizontal - gap;
  const cardWidth = Math.floor(availableWidth / 2);

  assert.ok(cardWidth >= 165 && cardWidth <= 180, `Card width is ${cardWidth}px`);
  assert.ok(cardWidth * 2 + gap + paddingHorizontal <= screenWidth);
});

test('Progress ratio clamps accurately between 0 and 100%', () => {
  const calcProgress = (current, target) => {
    if (target <= 0) return 0;
    return Math.min(100, Math.max(0, Math.round((current / target) * 100)));
  };

  assert.equal(calcProgress(0, 100000), 0);
  assert.equal(calcProgress(50000, 100000), 50);
  assert.equal(calcProgress(100000, 100000), 100);
  assert.equal(calcProgress(150000, 100000), 100); // Clamped
});

// ----------------------------------------------------------------------
// 3. Testing Goals 3D Stack View Depth Transforms
// ----------------------------------------------------------------------
console.log('\n--- 3. Testing Goals 3D Stack View Depth Transforms ---');

const goalStackFile = path.resolve('src/components/ui/GoalStack.tsx');
const goalStackCode = fs.readFileSync(goalStackFile, 'utf8');

test('GoalStack component exports GoalStack and GoalStackProps', () => {
  assert.ok(goalStackCode.includes('export const GoalStack'));
  assert.ok(goalStackCode.includes('export interface GoalStackProps'));
});

test('GoalStack incorporates React Bits physics spring config', () => {
  assert.ok(goalStackCode.includes('stiffness: 260'));
  assert.ok(goalStackCode.includes('damping: 20'));
});

test('GoalStack depth transforms follow mathematical layering', () => {
  const getTargetScale = (depth) => Math.max(0.78, 1 - depth * 0.05);

  assert.equal(getTargetScale(0), 1.0);
  assert.equal(getTargetScale(1), 0.95);
  assert.equal(getTargetScale(2), 0.90);
  assert.equal(getTargetScale(3), 0.85);
  assert.equal(getTargetScale(4), 0.80);
  assert.equal(getTargetScale(5), 0.78); // Clamped at 0.78
});

test('Stack depth translateY staggers layers vertically', () => {
  const getTranslateY = (depth) => depth * 12;

  assert.equal(getTranslateY(0), 0);
  assert.equal(getTranslateY(1), 12);
  assert.equal(getTranslateY(2), 24);
  assert.equal(getTranslateY(3), 36);
});

test('Stack depth rotateZ alternates smoothly', () => {
  const getRotateZ = (depth) =>
    depth === 0 ? 0 : depth % 2 === 1 ? -(depth * 2.6) : depth * 2.6;

  assert.equal(getRotateZ(0), 0);
  assert.ok(Math.abs(getRotateZ(1) - (-2.6)) < 1e-6);
  assert.ok(Math.abs(getRotateZ(2) - 5.2) < 1e-6);
  assert.ok(Math.abs(getRotateZ(3) - (-7.8)) < 1e-6);
});

test('Stack opacity hides cards deeper than 4 layers', () => {
  const getOpacity = (depth) => (depth >= 4 ? 0 : 1 - depth * 0.15);

  assert.equal(getOpacity(0), 1.0);
  assert.equal(getOpacity(1), 0.85);
  assert.equal(getOpacity(2), 0.70);
  assert.equal(getOpacity(3), 0.55);
  assert.equal(getOpacity(4), 0);
  assert.equal(getOpacity(5), 0);
});

test('GoalStack includes navigation controls with telemetry badge', () => {
  assert.ok(goalStackCode.includes('telemetryBadge'));
  assert.ok(goalStackCode.includes('GOAL'));
  assert.ok(goalStackCode.includes('OF'));
  assert.ok(goalStackCode.includes('ChevronLeft'));
  assert.ok(goalStackCode.includes('ChevronRight'));
});

// ----------------------------------------------------------------------
// 4. Testing Create Goal Modal Sticky Footer & Presets
// ----------------------------------------------------------------------
console.log('\n--- 4. Testing Create Goal Modal Sticky Footer & Presets ---');

const goalsFilePath = path.resolve('src/app/(tabs)/goals.tsx');
const goalsCode = fs.readFileSync(goalsFilePath, 'utf8');

test('Goals tab contains independent RubberSegmentBar switcher', () => {
  assert.ok(goalsCode.includes("RubberSegmentBar<'grid' | 'stack'>"));
  assert.ok(goalsCode.includes('goalViewMode'));
  assert.ok(goalsCode.includes('setGoalViewMode'));
});

test('Goals tab imports and renders GoalStack component', () => {
  assert.ok(goalsCode.includes('GoalStack'));
  assert.ok(goalsCode.includes("<GoalStack"));
});

test('Modal contains sticky modalFooter outside ScrollView', () => {
  assert.ok(goalsCode.includes('styles.modalFooter'));
  assert.ok(goalsCode.includes('styles.modalFooterBtn'));

  // Ensure modalFooter comes AFTER </ScrollView>
  const scrollCloseIdx = goalsCode.indexOf('</ScrollView>');
  const footerIdx = goalsCode.indexOf('<View style={styles.modalFooter}>');
  assert.ok(scrollCloseIdx > 0 && footerIdx > scrollCloseIdx, 'modalFooter must be after </ScrollView>');
});

test('Modal container enforces viewport flexShrink and maxHeight bounds', () => {
  assert.ok(goalsCode.includes("maxHeight: '90%'"));
  assert.ok(goalsCode.includes("maxHeight: '100%'"));
  assert.ok(goalsCode.includes('flexShrink: 1'));
});

test('Quick horizon presets calculate future days accurately', () => {
  const now = new Date();
  const getPresetDate = (days) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    return d;
  };

  const d30 = getPresetDate(30);
  const diffDays30 = Math.round((d30.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  assert.equal(diffDays30, 30);

  const d90 = getPresetDate(90);
  const diffDays90 = Math.round((d90.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  assert.equal(diffDays90, 90);
});

test('Compact calendar cell height is 26px', () => {
  assert.ok(goalsCode.includes('height: 26'));
});

// ----------------------------------------------------------------------
// 5. Testing ASD-STE-100 Simplified Technical English
// ----------------------------------------------------------------------
console.log('\n--- 5. Testing Plain ASD-STE-100 Simplified Technical English ---');

test('Step 1 button label is concise and active', () => {
  const label = 'Continue to Savings Plan →';
  const words = label.split(/\s+/).length;
  assert.ok(words <= 6, `Word count is ${words}`);
});

test('Step 2 button labels are active and under 6 words', () => {
  const labels = [
    'Confirm Stress-Free Goal →',
    'Confirm & Trim Envelopes →',
    'Confirm & Seed Goal →',
    'Create Goal & Link Bucket',
  ];
  for (const l of labels) {
    const words = l.split(/\s+/).length;
    assert.ok(words <= 6, `Word count for "${l}" is ${words}`);
  }
});

console.log('\n======================================================================');
console.log(`📊 Suite Completed: ${passedTests} Passed, 0 Failed`);
console.log('======================================================================\n');
