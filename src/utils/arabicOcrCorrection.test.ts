/**
 * Test/Demo file for Arabic OCR Correction Utility
 *
 * This file demonstrates how the correction utility works with examples
 * of common OCR errors in Arabic text.
 */

import { correctArabicOcrErrors, analyzeCorrections } from './arabicOcrCorrection';

// Example 1: Common word corrections (ى/ي confusion)
const example1 = "ذهب الطالب الي المدرسه في الصباح حتي يتعلم.";
const corrected1 = correctArabicOcrErrors(example1, { verbose: true });
console.log("Example 1 - ى/ي and ه/ة corrections:");
console.log("Original:", example1);
console.log("Corrected:", corrected1);
console.log("Expected: ذهب الطالب إلى المدرسة في الصباح حتى يتعلم.");
console.log("---\n");

// Example 2: Feminine noun endings (ه → ة)
const example2 = "قرأت كتابه في مكتبه الجامعه وكانت قراءه ممتعه.";
const corrected2 = correctArabicOcrErrors(example2);
console.log("Example 2 - Feminine noun endings:");
console.log("Original:", example2);
console.log("Corrected:", corrected2);
console.log("Expected: قرأت كتابة في مكتبة الجامعة وكانت قراءة ممتعة.");
console.log("---\n");

// Example 3: Multiple errors combined
const example3 = "علي الطالب ان يذهب الي الجامعه لحضور المحاضره حتي يفهم الماده.";
const corrected3 = correctArabicOcrErrors(example3);
console.log("Example 3 - Multiple errors:");
console.log("Original:", example3);
console.log("Corrected:", corrected3);
console.log("Expected: على الطالب ان يذهب إلى الجامعة لحضور المحاضرة حتى يفهم المادة.");
console.log("---\n");

// Example 4: Names with ى
const example4 = "موسي وعيسي ذهبا الي ليلي في المدينه.";
const corrected4 = correctArabicOcrErrors(example4);
console.log("Example 4 - Names correction:");
console.log("Original:", example4);
console.log("Corrected:", corrected4);
console.log("Expected: موسى وعيسى ذهبا إلى ليلى في المدينة.");
console.log("---\n");

// Example 5: Hamza corrections
const example5 = "المسؤل عن السؤل في الجزء الاول من الامتحان.";
const corrected5 = correctArabicOcrErrors(example5);
console.log("Example 5 - Hamza corrections:");
console.log("Original:", example5);
console.log("Corrected:", corrected5);
console.log("Expected: المسؤول عن السؤال في الجزء الاول من الامتحان.");
console.log("---\n");

// Example 6: Statistics
const example6 = "ذهبت الي المدرسه وقرأت كتابه عن الحياه في المدينه.";
const corrected6 = correctArabicOcrErrors(example6);
const stats = analyzeCorrections(example6, corrected6);
console.log("Example 6 - Correction statistics:");
console.log("Original:", example6);
console.log("Corrected:", corrected6);
console.log("Stats:");
console.log(`  - Total words: ${stats.totalWords}`);
console.log(`  - Corrected words: ${stats.correctedWords}`);
console.log(`  - Correction rate: ${(stats.correctionRate * 100).toFixed(1)}%`);
console.log("  - Corrections made:");
stats.corrections.forEach(c => {
  console.log(`    • "${c.original}" → "${c.corrected}"`);
});
console.log("---\n");

console.log("✅ All examples completed!");
console.log("To run this demo: tsx src/utils/arabicOcrCorrection.test.ts");
