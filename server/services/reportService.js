/**
 * Deterministic report generation. Detailed reports stay non-AI, but include
 * question-aware guidance and produce a separate admin-only prompt for the
 * paid Deep Insights stage.
 */
'use strict';
const { ZODIAC_TRAITS, elementPairNote } = require('../data/zodiacTraits');

const CARD_TYPES = new Set([
  'tarot', 'lenormand', 'playing_cards',
  'lenormand_pair', 'holy_triangle', 'gypsy_cross', 'hexagram', 'solomon_star', 'seven_planets',
]);

const FOCUS_GUIDANCE = {
  relationships: {
    label: 'relationships and communication',
    direct: 'Focus less on guessing the other person and more on making the need, boundary, or invitation clear enough to be answered.',
    practical: 'Name what you actually want, then create room for the other person to respond honestly. A useful relationship decision should reduce ambiguity without demanding a guaranteed outcome.',
    actions: [
      'Write one sentence that states your need without blaming the other person.',
      'Ask one direct question instead of testing the relationship indirectly.',
      'Notice whether the response creates more honesty, safety, and mutuality.',
    ],
  },
  career: {
    label: 'work, career, and the project',
    direct: 'Treat this as a question about direction, constraints, and the next visible commitment rather than a prediction of guaranteed success.',
    practical: 'Separate what is genuinely within your control from what depends on another person, an organisation, or timing. Choose an action that creates useful evidence rather than only more analysis.',
    actions: [
      'Define the smallest useful next step you could finish within seven days.',
      'Write down the cost, benefit, and reversibility of the current option.',
      'Speak to one person who can give you concrete information rather than reassurance alone.',
    ],
  },
  money: {
    label: 'material resources and financial pressure',
    direct: 'Look for the practical constraint underneath the worry, then choose a response that protects both your options and your boundaries.',
    practical: 'This reading is not financial advice. Use it to clarify priorities, gather accurate numbers, and decide which choice has the least irreversible risk.',
    actions: [
      'List the facts you know separately from the fears you are carrying.',
      'Identify the smallest decision that protects your essential commitments.',
      'Ask a qualified professional before making a high-impact financial commitment.',
    ],
  },
  wellbeing: {
    label: 'personal wellbeing and sustainable pace',
    direct: 'The useful question is not whether you can push harder, but what kind of support, boundary, or recovery time would make the next step sustainable.',
    practical: 'This is reflective guidance, not medical advice. Look for patterns around energy, pressure, and support, and involve a qualified professional if health or safety is involved.',
    actions: [
      'Notice one obligation that is draining more energy than it returns.',
      'Choose one recoverable boundary to protect this week.',
      'Reach out to an appropriate professional or trusted person if the pressure feels unsafe.',
    ],
  },
  transition: {
    label: 'change and transition',
    direct: 'The spread points to transition: something needs to be released or renegotiated before the next chapter has room to become real.',
    practical: 'Do not confuse movement with progress. Decide what must end, what can continue in a different form, and what evidence you need before making the larger change.',
    actions: [
      'Name what you are leaving behind, not only what you hope to gain.',
      'Test the new direction with a reversible experiment.',
      'Set a date to review what the experiment taught you.',
    ],
  },
  decision: {
    label: 'a decision between competing options',
    direct: 'The cards do not remove the need to choose. They highlight the values, costs, and likely consequences that deserve to shape the choice.',
    practical: 'Compare the options by what they ask you to sacrifice, how reversible they are, and whether they move you toward the life you are actually trying to build.',
    actions: [
      'Write the strongest case for each option without arguing against it.',
      'Mark which consequences are reversible and which are not.',
      'Choose the next reversible experiment that gives you better information.',
    ],
  },
  general: {
    label: 'the situation behind your question',
    direct: 'The draw is less useful as a yes-or-no verdict than as a map of the tension you need to respond to more deliberately.',
    practical: 'Turn the reading into one concrete action, one boundary, and one question you are willing to answer honestly before repeating the same pattern.',
    actions: [
      'Choose one action that can be completed without waiting for perfect certainty.',
      'Write down what would count as meaningful evidence of change.',
      'Review the result after seven days before drawing again.',
    ],
  },
};

function detectQuestionFocus(question = '') {
  const q = String(question).toLowerCase();
  if (/(health|wellbeing|well-being|sleep|energy|anxiety|burnout|body)/.test(q)) return 'wellbeing';
  if (/(relationship|partner|love|marriage|dating|friend|family|communication)/.test(q)) return 'relationships';
  if (/(job|career|work|business|project|manager|colleague|coworker|promotion)/.test(q)) return 'career';
  if (/(money|finance|financial|debt|income|salary|budget|rent|invest)/.test(q)) return 'money';
  if (/(move|leave|change|transition|start over|new chapter|Ending)/i.test(q)) return 'transition';
  if (/(should i .*(choose|accept|leave|stay|start|end)|choose|choice|option|decide|decision)/.test(q)) return 'decision';
  return 'general';
}

function cardLine(dc) {
  const orientation = dc.card.reversed != null ? (dc.card.reversed ? ' (reversed)' : '') : '';
  return `${dc.position}: ${dc.card.name}${orientation} — ${dc.card.meaning}`;
}

function simpleCardReport(reading) {
  const cards = reading.result_basic?.cards || [];
  const lead = reading.question
    ? `Here's a quick read on "${reading.question}":`
    : "Here's a quick read on your draw:";
  const lines = cards.map(cardLine);
  const closing = cards.length > 1
    ? `Together, these cards move from ${cards[0].card.name} toward ${cards[cards.length - 1].card.name} — that arc is worth sitting with before you act on any single card alone.`
    : 'Sit with this one a moment before you act on it — a single card is a prompt, not a verdict.';
  return [lead, '', ...lines, '', closing].join('\n');
}

function simpleAstrologyReport(reading) {
  const chart = reading.result_basic || {};
  const parts = [];
  if (chart.sun) parts.push(`Sun in ${chart.sun.sign} — ${ZODIAC_TRAITS[chart.sun.sign]?.trait || 'a sign in its own right'}.`);
  if (chart.moon) parts.push(`Moon in ${chart.moon.sign} — ${ZODIAC_TRAITS[chart.moon.sign]?.trait || 'a sign in its own right'}.`);
  if (chart.ascendant) parts.push(`Ascendant in ${chart.ascendant.sign} — this is the first impression you tend to give.`);
  const lead = reading.question
    ? `On "${reading.question}", here's what your chart offers at a glance:`
    : "Here's what your chart offers at a glance:";
  return [lead, '', ...parts].join('\n');
}

function cardRole(index, total) {
  if (total === 1) return 'This card is the central lens for the question.';
  if (index === 0) return 'This position describes the foundation that the rest of the reading builds from.';
  if (index === total - 1) return 'This position describes the likely direction if the current pattern continues.';
  return 'This position shows the pressure or adjustment needed between the opening and the likely outcome.';
}

function cardAction(dc) {
  if (dc.card.reversed) {
    return `Because ${dc.card.name} is reversed, treat its usual meaning as delayed, internal, or blocked. Ask what would need to change for that energy to move more freely.`;
  }
  return `Use ${dc.card.name} as an instruction to notice where its theme is already active in the situation.`;
}

function reflectionQuestions(focus) {
  if (focus === 'relationships') return [
    'What do I need to say plainly instead of hoping the other person will infer?',
    'What response would tell me that this connection is becoming more honest?',
    'Which boundary would I keep even if the other person disagreed?',
  ];
  if (focus === 'career') return [
    'What outcome am I actually responsible for, and what depends on other people?',
    'Which next step would create useful evidence rather than only more planning?',
    'What would make this decision reversible if it turned out badly?',
  ];
  if (focus === 'money') return [
    'Which numbers or commitments do I need to verify before choosing?',
    'What irreversible risk am I trying to avoid?',
    'Where would independent professional advice materially change the decision?',
  ];
  if (focus === 'wellbeing') return [
    'What is currently asking for recovery rather than more effort?',
    'Which support or professional resource would be appropriate here?',
    'What boundary would make the next week more sustainable?',
  ];
  return [
    'What am I avoiding naming about this situation?',
    'Which action is mine to take, regardless of what anyone else decides?',
    'What evidence would show me that the pattern has genuinely changed?',
  ];
}

function reportShell({ reading, focus, direct, central, analysis, practical }) {
  const guidance = FOCUS_GUIDANCE[focus];
  const question = reading.question || 'What should I understand about this situation?';
  const questions = reflectionQuestions(focus);
  return [
    'DIRECT RESPONSE',
    `You asked: "${question}"`,
    direct,
    '',
    'CENTRAL PATTERN',
    central,
    '',
    analysis.heading,
    ...analysis.lines,
    '',
    'PRACTICAL GUIDANCE',
    practical || guidance.practical,
    '',
    'NEXT 7 DAYS',
    ...guidance.actions.map((action, index) => `${index + 1}. ${action}`),
    '',
    'QUESTIONS TO REFLECT ON',
    ...questions.map((item) => `- ${item}`),
    '',
    'IMPORTANT BOUNDARY',
    'This is reflective guidance, not a prediction, diagnosis, legal opinion, or financial instruction. You remain responsible for choices that affect your health, money, relationships, and legal obligations.',
  ].join('\n');
}

function detailedCardReport(reading) {
  const cards = reading.result_basic?.cards || [];
  const focus = detectQuestionFocus(reading.question);
  const guidance = FOCUS_GUIDANCE[focus];
  const first = cards[0]?.card;
  const last = cards[cards.length - 1]?.card;
  const reversed = cards.filter((entry) => entry.card.reversed);
  const firstMeaning = String(first?.meaning || '').replace(/[.\s]+$/, '');
  const lastMeaning = String(last?.meaning || '').replace(/[.\s]+$/, '');

  const central = cards.length > 1
    ? `The arc runs from ${first.name} toward ${last.name}. The situation begins with "${firstMeaning}" and is being pushed toward "${lastMeaning}." The reading is therefore less about a fixed outcome than about how deliberately you handle that shift in ${guidance.label}.`
    : cards.length === 1
      ? `${cards[0].card.name} frames this question through "${cards[0].card.meaning}." One card is a focus for reflection, not proof that a particular outcome is inevitable.`
      : 'No card data was available, so the guidance stays focused on the question and the decisions around it.';

  const lines = cards.map((entry, index) => {
    const line = cardLine(entry);
    return `${line}\n${cardRole(index, cards.length)} ${cardAction(entry)}`;
  });

  if (reversed.length) {
    lines.push('', `${reversed.length} card${reversed.length > 1 ? 's are' : ' is'} reversed. The reversed position points to something delayed, internalised, or resisted rather than a simple reversal of meaning.`);
  }

  const relevantGuidance = focus === 'general'
    ? guidance.practical
    : `${guidance.direct} ${guidance.practical}`;
  return reportShell({
    reading,
    focus,
    direct: `${guidance.direct} The cards suggest that the quality of the next step matters more than forcing an immediate final answer.`,
    central,
    analysis: {
      heading: 'CARD-BY-CARD GUIDANCE',
      lines,
    },
    practical: relevantGuidance,
  });
}

function detailedAstrologyReport(reading) {
  const chart = reading.result_basic || {};
  const focus = detectQuestionFocus(reading.question);
  const guidance = FOCUS_GUIDANCE[focus];
  const lines = [];
  if (chart.sun) {
    const trait = ZODIAC_TRAITS[chart.sun.sign];
    lines.push(`Aries Sun check: ${chart.sun.sign} Sun at ${chart.sun.degreeInSign}° — your core identity tends to be ${trait?.trait || 'distinctly itself'}, expressed through a ${trait?.modality || ''} ${trait?.element || ''} style.`);
  }
  if (chart.moon) {
    const trait = ZODIAC_TRAITS[chart.moon.sign];
    lines.push(`${chart.moon.sign} Moon at ${chart.moon.degreeInSign}° — emotionally, you tend to process through ${trait?.trait || 'your own instinctive pattern'}.`);
  }
  if (chart.sun && chart.moon) {
    lines.push(`Sun and Moon together: ${elementPairNote(ZODIAC_TRAITS[chart.sun.sign]?.element, ZODIAC_TRAITS[chart.moon.sign]?.element)} Add the question ${chart.sun.sign} Sun and ${chart.moon.sign} Moon, and the practical task is to align what you consciously want with what you emotionally need.`);
  }
  if (chart.ascendant) {
    const trait = ZODIAC_TRAITS[chart.ascendant.sign];
    lines.push(`${chart.ascendant.sign} Ascendant at ${chart.ascendant.degreeInSign}° — this is the approach others are most likely to encounter first: ${trait?.trait || 'a particular outward style'}.`);
  }
  if (Array.isArray(chart.caveats) && chart.caveats.length) {
    lines.push(`Chart caveat: ${chart.caveats.join(' ')}`);
  }
  if (chart.planetsNote) lines.push(chart.planetsNote);

  const central = chart.sun && chart.moon
    ? `The chart combines a ${chart.sun.sign} Sun with a ${chart.moon.sign} Moon. Read together, this points to a tension between the way you want to act in the world and the way you need to feel secure. For a question about ${guidance.label}, that tension is the central clue: a sustainable decision has to satisfy both, not only the more visible impulse.`
    : `The available chart points suggest that the question is best approached through ${guidance.label}, using the chart as a lens rather than a fixed verdict.`;

  return reportShell({
    reading,
    focus,
    direct: `${guidance.direct} Your chart suggests that the answer becomes clearer when you stop treating your first instinct and emotional need as competing answers.`,
    central,
    analysis: {
      heading: 'CHART-POINT GUIDANCE',
      lines,
    },
  });
}

function buildDetailedAiPrompt(reading, detailedReport) {
  const cards = reading.result_basic?.cards || [];
  const chart = reading.type === 'astrology_natal' ? reading.result_basic || {} : null;
  const dataLines = [];
  for (const entry of cards) {
    const orientation = entry.card.reversed != null ? (entry.card.reversed ? ' reversed' : ' upright') : '';
    dataLines.push(`- ${entry.position}: ${entry.card.name}${orientation} — ${entry.card.meaning}`);
  }
  if (chart) {
    for (const key of ['sun', 'moon', 'ascendant']) {
      if (chart[key]) dataLines.push(`- ${key[0].toUpperCase()}${key.slice(1)}: ${chart[key].sign} at ${chart[key].degreeInSign}°.`);
    }
  }

  return [
    'You are writing a Tarawing Deep Insights report for one specific user.',
    '',
    'User question',
    `"${reading.question || 'What should I understand about this situation?'}"`,
    '',
    'Reading data',
    ...(dataLines.length ? dataLines : ['- The detailed report contains the available reading context.']),
    '',
    'Authoritative detailed report',
    '---',
    detailedReport,
    '---',
    '',
    'Task',
    'Write a cohesive Deep Insights report of roughly 700-900 words. Begin with a direct answer to the user question, then develop the central pattern, the most important choices, a practical seven-day plan, and several reflective questions.',
    'Treat the detailed report as established context: deepen it rather than repeating it line by line. Be specific to the user question and the drawn cards or chart points. Use warm, grounded language and distinguish insight from certainty.',
    'Do not provide medical, legal, or financial advice, diagnose medical or mental-health conditions, or promise that a prediction will happen. If the question involves health, legal, or high-impact financial risk, recommend qualified professional support.',
    'Return only the finished report text, without commentary about the prompt.',
  ].join('\n');
}

function generateDetailedReportBundle(reading) {
  const detailedReport = CARD_TYPES.has(reading.type)
    ? detailedCardReport(reading)
    : reading.type === 'astrology_natal'
      ? detailedAstrologyReport(reading)
      : null;
  if (!detailedReport) throw new Error(`No detailed-report generator for reading type: ${reading.type}`);
  return {
    detailedReport,
    aiPrompt: buildDetailedAiPrompt(reading, detailedReport),
  };
}

function generateSimpleReport(reading) {
  if (CARD_TYPES.has(reading.type)) return simpleCardReport(reading);
  if (reading.type === 'astrology_natal') return simpleAstrologyReport(reading);
  throw new Error(`No simple-report generator for reading type: ${reading.type}`);
}

function generateDetailedReport(reading) {
  return generateDetailedReportBundle(reading).detailedReport;
}

module.exports = {
  buildDetailedAiPrompt,
  detectQuestionFocus,
  generateDetailedReport,
  generateDetailedReportBundle,
  generateSimpleReport,
};
