export const ENGLISH_ASSIGNMENT_TYPES = [
  {
    typeId: "reading_check",
    label: "Reading Check",
    description: "Objective and short reflection questions after reading.",
    status: "ready",
    supportsAutoGrade: true,
    supportsRubric: false,
  },
  {
    typeId: "short_response",
    label: "Short Response",
    description: "Claim, evidence, and explanation response to a text-based prompt.",
    status: "ready",
    supportsAutoGrade: false,
    supportsRubric: true,
  },
  {
    typeId: "annotation_assignment",
    label: "Annotation Assignment",
    description: "Structured close-reading notes tied to paragraphs or sections.",
    status: "ready",
    supportsAutoGrade: false,
    supportsRubric: true,
  },
  {
    typeId: "paragraph_response",
    label: "Paragraph Response",
    description: "Planning fields and a final developed paragraph response.",
    status: "ready",
    supportsAutoGrade: false,
    supportsRubric: true,
  },
  {
    typeId: "vocabulary_practice",
    label: "Vocabulary Practice",
    description: "Vocabulary meaning checks plus student-created sentences.",
    status: "ready",
    supportsAutoGrade: true,
    supportsRubric: false,
  },
  {
    typeId: "grammar_mini_lesson",
    label: "Grammar Mini-Lesson",
    description: "Reusable grammar practice shell for a later version.",
    status: "placeholder",
  },
  {
    typeId: "literary_analysis",
    label: "Literary Analysis",
    description: "Literary analysis shell for a later version.",
    status: "placeholder",
  },
  {
    typeId: "informational_text_analysis",
    label: "Informational Text Analysis",
    description: "Informational analysis shell for a later version.",
    status: "placeholder",
  },
  {
    typeId: "argument_writing",
    label: "Argument Writing",
    description: "Argument writing shell for a later version.",
    status: "placeholder",
  },
  {
    typeId: "discussion_response",
    label: "Discussion Response",
    description: "Discussion response shell for a later version.",
    status: "placeholder",
  },
];

export const READY_ENGLISH_ASSIGNMENT_TYPES = ENGLISH_ASSIGNMENT_TYPES.filter(
  (type) => type.status === "ready",
);

export const PLACEHOLDER_ENGLISH_ASSIGNMENT_TYPES = ENGLISH_ASSIGNMENT_TYPES.filter(
  (type) => type.status === "placeholder",
);

export const DEFAULT_ENGLISH_RUBRIC = [
  {
    rubricId: "textual-evidence",
    label: "Textual Evidence",
    maxScore: 4,
  },
  {
    rubricId: "reasoning",
    label: "Explanation / Reasoning",
    maxScore: 4,
  },
  {
    rubricId: "organization",
    label: "Organization",
    maxScore: 4,
  },
  {
    rubricId: "conventions",
    label: "Language / Conventions",
    maxScore: 4,
  },
];

export function getEnglishAssignmentType(typeIdOrLabel) {
  return ENGLISH_ASSIGNMENT_TYPES.find(
    (type) => type.typeId === typeIdOrLabel || type.label === typeIdOrLabel,
  );
}
