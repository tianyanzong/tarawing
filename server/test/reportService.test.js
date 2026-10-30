'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  detectQuestionFocus,
  generateDetailedReport,
  generateDetailedReportBundle,
} = require('../services/reportService');

function cardReading(question) {
  return {
    type: 'holy_triangle',
    question,
    result_basic: {
      spread: 'holy_triangle',
      deck: 'tarot',
      cards: [
        {
          position: 'Past',
          card: {
            name: 'The Hermit',
            meaning: 'Introspection, solitude, and seeking inner guidance.',
            reversed: false,
          },
        },
        {
          position: 'Present',
          card: {
            name: 'Two of Wands',
            meaning: 'A deliberate choice between two possible directions.',
            reversed: true,
          },
        },
        {
          position: 'Future',
          card: {
            name: 'The Sun',
            meaning: 'Clarity, vitality, and visible progress.',
            reversed: false,
          },
        },
      ],
    },
  };
}

test('detects the question focus used for practical guidance', () => {
  assert.equal(detectQuestionFocus('Should I leave my job and start a business?'), 'career');
  assert.equal(detectQuestionFocus('How can I improve communication with my partner?'), 'relationships');
  assert.equal(detectQuestionFocus('Should I choose option A or option B?'), 'decision');
  assert.equal(detectQuestionFocus('What should I notice this week?'), 'general');
  assert.equal(detectQuestionFocus('How do I remove a recurring distraction?'), 'general');
});

test('builds a structured question-specific detailed report', () => {
  const question = 'How can I move this project forward at work?';
  const report = generateDetailedReport(cardReading(question));

  assert.match(report, new RegExp(question.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(report, /DIRECT RESPONSE/);
  assert.match(report, /CENTRAL PATTERN/);
  assert.match(report, /CARD-BY-CARD GUIDANCE/);
  assert.match(report, /PRACTICAL GUIDANCE/);
  assert.match(report, /NEXT 7 DAYS/);
  assert.match(report, /QUESTIONS TO REFLECT ON/);
  assert.match(report, /The Hermit/);
  assert.match(report, /Two of Wands \(reversed\)/);
  assert.ok(report.split(/\s+/).length >= 250);
});

test('generates an AI prompt containing the full report and question', () => {
  const question = 'How can I improve communication with my partner?';
  const bundle = generateDetailedReportBundle(cardReading(question));

  assert.equal(bundle.detailedReport, generateDetailedReport(cardReading(question)));
  assert.match(bundle.aiPrompt, /Deep Insights/);
  assert.match(bundle.aiPrompt, /communication with my partner/i);
  assert.match(bundle.aiPrompt, /The Hermit/);
  assert.match(bundle.aiPrompt, /Authoritative detailed report/);
  assert.ok(bundle.aiPrompt.includes(bundle.detailedReport));
  assert.match(bundle.aiPrompt, /medical, legal, or financial/i);
});

test('builds a detailed astrology report from chart points', () => {
  const report = generateDetailedReport({
    type: 'astrology_natal',
    question: 'What should I understand about my current chapter?',
    result_basic: {
      sun: { sign: 'Aries', degreeInSign: 28.4 },
      moon: { sign: 'Cancer', degreeInSign: 12.7 },
      ascendant: { sign: 'Taurus', degreeInSign: 18.2 },
      caveats: ['Moon position is approximate.'],
      planetsNote: 'Sun, Moon, and Ascendant only.',
    },
  });

  assert.match(report, /Aries Sun/);
  assert.match(report, /Cancer Moon/);
  assert.match(report, /Taurus Ascendant/);
  assert.match(report, /NEXT 7 DAYS/);
  assert.ok(report.split(/\s+/).length >= 220);
});
