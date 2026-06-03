const ANSWER_TOLERANCE = 0.0001;

function hashString(value) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function mulberry32(seed) {
  return function random() {
    let value = (seed += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function integerBetween(random, min, max) {
  return Math.floor(random() * (max - min + 1)) + min;
}

function nonZeroBetween(random, min, max) {
  let value = 0;

  while (value === 0) {
    value = integerBetween(random, min, max);
  }

  return value;
}

function greatestCommonDivisor(left, right) {
  let a = Math.abs(left);
  let b = Math.abs(right);

  while (b !== 0) {
    const next = a % b;
    a = b;
    b = next;
  }

  return a || 1;
}

function reduceFraction(numerator, denominator) {
  if (denominator === 0) {
    return { numerator: 1, denominator: 0, undefined: true };
  }

  if (numerator === 0) {
    return { numerator: 0, denominator: 1, undefined: false };
  }

  const divisor = greatestCommonDivisor(numerator, denominator);
  let reducedNumerator = numerator / divisor;
  let reducedDenominator = denominator / divisor;

  if (reducedDenominator < 0) {
    reducedNumerator *= -1;
    reducedDenominator *= -1;
  }

  return {
    numerator: reducedNumerator,
    denominator: reducedDenominator,
    undefined: false,
  };
}

function formatFraction(fraction) {
  if (!fraction || fraction.undefined) return "undefined";
  if (fraction.denominator === 1) return String(fraction.numerator);
  return `${fraction.numerator}/${fraction.denominator}`;
}

function formatTerm(coefficient, variable = "x") {
  if (coefficient === 1) return variable;
  if (coefficient === -1) return `-${variable}`;
  return `${coefficient}${variable}`;
}

function formatLinear(coefficient, constant) {
  const variable = formatTerm(coefficient);
  if (constant === 0) return variable;
  return `${variable} ${constant > 0 ? "+" : "-"} ${Math.abs(constant)}`;
}

function formatVariableTerm(coefficient, variable, isFirstTerm) {
  const absolute = Math.abs(coefficient);
  const term = absolute === 1 ? variable : `${absolute}${variable}`;

  if (isFirstTerm) {
    return coefficient < 0 ? `-${term}` : term;
  }

  return `${coefficient < 0 ? "-" : "+"} ${term}`;
}

function formatSystemEquation(xCoefficient, yCoefficient, right) {
  return `${formatVariableTerm(xCoefficient, "x", true)} ${formatVariableTerm(
    yCoefficient,
    "y",
    false,
  )} = ${right}`;
}

function makeLinearEquation(random) {
  const solution = nonZeroBetween(random, -12, 12);
  const coefficient = nonZeroBetween(random, -9, 9);
  const constant = integerBetween(random, -18, 18);
  const right = coefficient * solution + constant;

  return {
    type: "Linear Equation",
    prompt: `${formatLinear(coefficient, constant)} = ${right}`,
    answer: String(solution),
    answerMode: "single",
    directions: "Solve for x.",
  };
}

function makeSystem(random) {
  const x = integerBetween(random, -8, 8);
  const y = integerBetween(random, -8, 8);
  let xCoefficientA = nonZeroBetween(random, -6, 6);
  let yCoefficientA = nonZeroBetween(random, -6, 6);
  let xCoefficientB = nonZeroBetween(random, -6, 6);
  let yCoefficientB = nonZeroBetween(random, -6, 6);

  while (xCoefficientA * yCoefficientB - xCoefficientB * yCoefficientA === 0) {
    xCoefficientA = nonZeroBetween(random, -6, 6);
    yCoefficientA = nonZeroBetween(random, -6, 6);
    xCoefficientB = nonZeroBetween(random, -6, 6);
    yCoefficientB = nonZeroBetween(random, -6, 6);
  }

  return {
    type: "System of Equations",
    prompt: [
      formatSystemEquation(
        xCoefficientA,
        yCoefficientA,
        xCoefficientA * x + yCoefficientA * y,
      ),
      formatSystemEquation(
        xCoefficientB,
        yCoefficientB,
        xCoefficientB * x + yCoefficientB * y,
      ),
    ],
    answer: `(${x}, ${y})`,
    answerMode: "ordered-pair",
    directions: "Solve for x and y.",
  };
}

function makeSlopeProblem(random) {
  const x1 = integerBetween(random, -8, 8);
  const y1 = integerBetween(random, -8, 8);
  let x2 = integerBetween(random, -8, 8);
  let y2 = integerBetween(random, -8, 8);

  while (x2 === x1 && y2 === y1) {
    x2 = integerBetween(random, -8, 8);
    y2 = integerBetween(random, -8, 8);
  }

  const slope = reduceFraction(y2 - y1, x2 - x1);

  return {
    type: "Slope from Two Points",
    prompt: `Find the slope between (${x1}, ${y1}) and (${x2}, ${y2}).`,
    answer: formatFraction(slope),
    answerMode: "text",
    directions: "Find the slope.",
  };
}

function makeSlopeIntercept(random) {
  const numerator = nonZeroBetween(random, -6, 6);
  const denominator = integerBetween(random, 1, 6);
  const slope = reduceFraction(numerator, denominator);
  const intercept = integerBetween(random, -10, 10);
  const x = integerBetween(random, -6, 6);
  const y = (slope.numerator / slope.denominator) * x + intercept;

  return {
    type: "Slope-Intercept Form",
    prompt: `A line has slope ${formatFraction(slope)} and passes through (${x}, ${Number.isInteger(y) ? y : y.toFixed(2)}). Write the equation in y = mx + b form.`,
    answer: `y = ${formatFraction(slope)}x ${intercept >= 0 ? "+" : "-"} ${Math.abs(intercept)}`,
    answerMode: "text",
    directions: "Write the equation in slope-intercept form.",
  };
}

function flipInequality(symbol) {
  const flips = {
    "<": ">",
    ">": "<",
    "<=": ">=",
    ">=": "<=",
  };

  return flips[symbol] || symbol;
}

function makeInequality(random) {
  const solution = integerBetween(random, -10, 10);
  const coefficient = nonZeroBetween(random, -8, 8);
  const constant = integerBetween(random, -14, 14);
  const symbols = ["<", ">", "<=", ">="];
  const symbol = symbols[integerBetween(random, 0, symbols.length - 1)];
  const right = coefficient * solution + constant;
  const answerSymbol = coefficient < 0 ? flipInequality(symbol) : symbol;

  return {
    type: "Linear Inequality",
    prompt: `${formatLinear(coefficient, constant)} ${symbol} ${right}`,
    answer: `x ${answerSymbol} ${solution}`,
    answerMode: "text",
    directions: "Solve the inequality for x.",
  };
}

function makeCoordinateGridLine(random) {
  const numerator = nonZeroBetween(random, -5, 5);
  const denominator = integerBetween(random, 1, 5);
  const slope = reduceFraction(numerator, denominator);
  const intercept = integerBetween(random, -8, 8);
  const x1 = integerBetween(random, -6, 0);
  const x2 = integerBetween(random, 1, 6);
  const y1 = (slope.numerator / slope.denominator) * x1 + intercept;
  const y2 = (slope.numerator / slope.denominator) * x2 + intercept;

  return {
    type: "Coordinate Grid Line",
    prompt: `A line passes through (${x1}, ${Number.isInteger(y1) ? y1 : y1.toFixed(2)}) and (${x2}, ${Number.isInteger(y2) ? y2 : y2.toFixed(2)}). Find its equation.`,
    answer: `y = ${formatFraction(slope)}x ${intercept >= 0 ? "+" : "-"} ${Math.abs(intercept)}`,
    answerMode: "text",
    directions: "Use the points to write the equation of the line.",
  };
}

export const mathAssignmentTypes = [
  {
    assignmentType: "linear-equations",
    title: "Linear Equations",
    directions: "Solve for x.",
    defaultProblemCount: 30,
    generator: makeLinearEquation,
  },
  {
    assignmentType: "systems-equations",
    title: "Systems of Equations",
    directions: "Solve for x and y.",
    defaultProblemCount: 15,
    generator: makeSystem,
  },
  {
    assignmentType: "slope-two-points",
    title: "Slope from Two Points",
    directions: "Find the slope between two coordinate points.",
    defaultProblemCount: 30,
    generator: makeSlopeProblem,
  },
  {
    assignmentType: "slope-intercept-form",
    title: "Slope-Intercept Form",
    directions: "Write or identify slope-intercept form.",
    defaultProblemCount: 30,
    generator: makeSlopeIntercept,
  },
  {
    assignmentType: "linear-inequalities",
    title: "Linear Inequalities",
    directions: "Solve each inequality for x.",
    defaultProblemCount: 30,
    generator: makeInequality,
  },
  {
    assignmentType: "coordinate-grid-lines",
    title: "Coordinate Grid Lines",
    directions: "Use coordinate points to reason about lines.",
    defaultProblemCount: 30,
    generator: makeCoordinateGridLine,
  },
];

export function getMathAssignmentType(assignmentType) {
  return (
    mathAssignmentTypes.find((item) => item.assignmentType === assignmentType) ||
    mathAssignmentTypes[0]
  );
}

export function generateProblemSet({ assignmentType, problemCount, seed }) {
  const type = getMathAssignmentType(assignmentType);
  const random = mulberry32(hashString(`${seed}:${type.assignmentType}`));
  const total = Math.max(1, Math.min(Number(problemCount) || type.defaultProblemCount, 60));
  const problems = [];

  for (let index = 1; index <= total; index += 1) {
    const problem = type.generator(random, index);
    problems.push({
      ...problem,
      id: `${type.assignmentType}-${index}`,
      number: index,
    });
  }

  return problems;
}

export function formatProblemPrompt(problem) {
  if (Array.isArray(problem.prompt)) {
    return problem.prompt.join(" | ");
  }

  return problem.prompt;
}

export function formatExpectedAnswer(problem) {
  return problem.answer;
}

function normalizeAnswer(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/−/g, "-");
}

export function gradeAnswer(problem, answer) {
  const normalizedAnswer = normalizeAnswer(answer);
  const expected = normalizeAnswer(problem.answer);

  if (!normalizedAnswer) return false;
  if (normalizedAnswer === expected) return true;

  const numericAnswer = Number(normalizedAnswer);
  const numericExpected = Number(expected);

  return (
    Number.isFinite(numericAnswer) &&
    Number.isFinite(numericExpected) &&
    Math.abs(numericAnswer - numericExpected) <= ANSWER_TOLERANCE
  );
}
