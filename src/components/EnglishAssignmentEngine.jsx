import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_ENGLISH_RUBRIC,
  PLACEHOLDER_ENGLISH_ASSIGNMENT_TYPES,
  READY_ENGLISH_ASSIGNMENT_TYPES,
  getEnglishAssignmentType,
} from "../data/englishAssignmentTypes";
import { ENGLISH_UNIT_1_ID, englishUnit1Texts } from "../data/englishUnit1Pilot";
import {
  clearEnglishSubmissions,
  createEnglishSectionAssignment,
  gradeEnglishAnswers,
  recordEnglishAnswerProgress,
  recordEnglishAssignmentOpened,
  resetEnglishSubmission,
  reviewEnglishSubmission,
  submitEnglishAssignmentWork,
  submitEnglishDemoAssignmentWork,
  subscribeEnglishAssignments,
  subscribeEnglishDemoSubmission,
  subscribeEnglishDemoSubmissions,
  subscribeEnglishSubmission,
  subscribeEnglishSubmissions,
} from "../services/englishAssignments";
import { subscribeDemoStudents } from "../services/demoRoster";
import { canResourceBeEmbedded, getResourceUseLabel, subscribeSourceLibrary } from "../services/sourceLibrary";
import { subscribeSectionRoster } from "../services/sections";

const DEFAULT_SOURCE_KEY = `original:${englishUnit1Texts[0]?.textId || ""}`;

function formatDate(value) {
  if (!value) return "No due date";
  if (value && typeof value.toDate === "function") return value.toDate().toLocaleDateString();
  return value;
}

function formatDateTime(value) {
  if (!value) return "--";
  if (value && typeof value.toDate === "function") return value.toDate().toLocaleString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "--" : date.toLocaleString();
}

function textToBlock(text) {
  return {
    textId: text.textId,
    title: text.title,
    author: text.author,
    sourceType: text.sourceType,
    copyrightStatus: text.copyrightStatus,
    licenseType: text.licenseType,
    canEmbed: true,
    attributionText: text.requiresAttribution ? text.attributionText || "" : "",
    paragraphs: text.paragraphs || [],
  };
}

function originalSourceRef(text) {
  return {
    sourceId: text.textId,
    title: text.title,
    author: text.author,
    providerName: "Gamble Education",
    sourceUrl: "",
    licenseType: text.licenseType,
    copyrightStatus: text.copyrightStatus,
    canEmbed: true,
    canLink: false,
    attributionText: "",
    isOriginalGambleText: true,
  };
}

function sourceLibraryRef(resource) {
  return {
    sourceId: resource.sourceId,
    title: resource.title,
    author: resource.author || "",
    providerName: resource.providerName || "",
    sourceUrl: resource.sourceUrl || "",
    licenseType: resource.licenseType || "",
    copyrightStatus: resource.copyrightStatus || "",
    canEmbed: canResourceBeEmbedded(resource),
    canLink: resource.canLink !== false,
    attributionText: resource.attributionText || "",
    isOriginalGambleText: false,
  };
}

function buildSourceOptions(resources = []) {
  const originalOptions = englishUnit1Texts.map((text) => ({
    key: `original:${text.textId}`,
    label: `Original Gamble text: ${text.title}`,
    kind: "original",
    canAssign: true,
    resource: text,
    useLabel: "Embeddable",
  }));

  const libraryOptions = resources.map((resource) => {
    const approved = resource.approvalStatus === "approved";
    const canAssign = approved && (resource.canLink || canResourceBeEmbedded(resource));
    return {
      key: `source:${resource.sourceId}`,
      label: `${resource.title} (${getResourceUseLabel(resource)})`,
      kind: "source",
      canAssign,
      resource,
      useLabel: getResourceUseLabel(resource),
    };
  });

  return [...originalOptions, ...libraryOptions];
}

function getLatestSubmittedAt(submission) {
  const attempts = Array.isArray(submission?.attempts) ? submission.attempts : [];
  return attempts.at(-1)?.submittedAt || submission?.submittedAt;
}

function answerIsFilled(answer) {
  if (Array.isArray(answer)) {
    return answer.some((item) =>
      item && typeof item === "object"
        ? Object.values(item).some((value) => String(value || "").trim())
        : String(item || "").trim(),
    );
  }

  if (answer && typeof answer === "object") {
    return Object.values(answer).some((value) => String(value || "").trim());
  }

  return String(answer || "").trim().length > 0;
}

function countAnswered(answers = {}) {
  return Object.values(answers).filter(answerIsFilled).length;
}

function getStudentName(row) {
  return row.kind === "demo"
    ? row.student.displayName || "Demo Student"
    : row.student.studentName || row.student.studentEmail || "Student";
}

function getStudentId(row) {
  return row.kind === "demo" ? row.student.demoStudentId : row.student.studentUid;
}

function getSubmissionScore(submission) {
  return submission?.finalScore ?? submission?.score ?? submission?.autoScore ?? 0;
}

function getTotalPoints(assignment, submission) {
  return (
    Number(submission?.totalPoints) ||
    Number(submission?.problemCount) ||
    Number(assignment?.questions?.reduce((sum, question) => sum + (Number(question.points) || 0), 0)) ||
    assignment?.questions?.length ||
    0
  );
}

function getSubmissionPercent(submission) {
  return submission?.gradePercent ?? submission?.percent ?? 0;
}

function getRosterStatus(submission) {
  if (!submission) return { className: "waiting", label: "Waiting" };
  if (submission.resubmissionAllowed || ["needs_revision", "needs_resubmission"].includes(submission.status)) {
    return { className: "needs-resubmission", label: "Needs Resubmission" };
  }
  if (submission.status === "resubmitted") return { className: "resubmitted", label: "Resubmitted" };
  if (submission.status === "graded" || submission.gradedAt) return { className: "graded", label: "Graded" };
  if (submission.status === "auto_graded") return { className: "graded", label: "Auto-Graded" };
  if (submission.status === "awaiting_teacher_review") return { className: "submitted", label: "Needs Review" };
  return { className: "submitted", label: "Submitted" };
}

function normalizeAnswer(value) {
  return String(value || "").trim().toLowerCase();
}

const ANNOTATION_NOTE_TYPES = [
  "Important detail",
  "Question",
  "Confusing part",
  "Vocabulary",
  "Evidence",
  "Theme / central idea clue",
  "Other",
];

const FRIENDLY_STATUS_LABELS = {
  assigned: "Not Started",
  auto_graded: "Auto-Graded",
  awaiting_teacher_review: "Awaiting Teacher Review",
  graded: "Graded",
  needs_resubmission: "Resubmission Available",
  needs_revision: "Resubmission Available",
  nearly_done: "In Progress",
  resubmitted: "Resubmitted",
  started: "In Progress",
  submitted: "Submitted",
  working: "In Progress",
};

function getFriendlyStatus(submission, previewMode = false) {
  if (previewMode) return "Preview Only";
  if (!submission) return "Not Started";
  return FRIENDLY_STATUS_LABELS[submission.status] || "Submitted";
}

function getStudentKey({ testMode, user }) {
  return testMode ? user?.demoStudentId : user?.uid;
}

function getLocalDraftKey({ assignment, previewMode, testMode, user }) {
  const studentKey = getStudentKey({ testMode, user }) || "preview";
  const mode = previewMode ? "preview" : testMode ? "demo" : "student";
  return `gamble:english-draft:${assignment?.assignmentId || "unknown"}:${mode}:${studentKey}`;
}

function readLocalDraft(key) {
  if (typeof window === "undefined" || !key) return null;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn("Unable to read English draft", error);
    return null;
  }
}

function writeLocalDraft(key, answers) {
  if (typeof window === "undefined" || !key) return;
  window.localStorage.setItem(key, JSON.stringify({ answers, savedAt: new Date().toISOString() }));
}

function clearLocalDraft(key) {
  if (typeof window === "undefined" || !key) return;
  window.localStorage.removeItem(key);
}

function answerComplete(question, answer) {
  if (question.optional) return true;

  if (question.type === "paragraph_response") {
    return Boolean(String(answer?.finalParagraph || "").trim());
  }

  if (question.type === "annotation") {
    if (Array.isArray(answer)) {
      return answer.some((note) => String(note?.noteText || "").trim());
    }

    return Boolean(String(answer || "").trim());
  }

  return answerIsFilled(answer);
}

function getMissingRequiredQuestions(assignment, answers = {}) {
  return (assignment.questions || []).filter(
    (question) => !answerComplete(question, answers[question.questionId]),
  );
}

function getQuestionWordCount(answer) {
  if (!answer) return 0;
  if (typeof answer === "object" && !Array.isArray(answer)) {
    return Object.values(answer).join(" ").split(/\s+/).filter(Boolean).length;
  }
  if (Array.isArray(answer)) {
    return answer
      .map((note) => Object.values(note || {}).join(" "))
      .join(" ")
      .split(/\s+/)
      .filter(Boolean).length;
  }
  return String(answer).split(/\s+/).filter(Boolean).length;
}

function defaultConfig(typeId) {
  if (typeId === "reading_check") {
    return {
      title: "Reading Check",
      instructions: "Read the source carefully. Answer each question using details from the text.",
      questions: [
        {
          questionId: "q1",
          type: "multiple_choice",
          prompt: "Which answer best states the central idea or main point?",
          options: ["Answer A", "Answer B", "Answer C", "Answer D"],
          correctAnswer: "Answer A",
          points: 1,
        },
        {
          questionId: "q2",
          type: "true_false",
          prompt: "The text uses details to support its main idea.",
          options: ["True", "False"],
          correctAnswer: "True",
          points: 1,
        },
        {
          questionId: "q3",
          type: "short_response",
          prompt: "Explain one detail from the text that supports your answer.",
          points: 4,
          teacherReviewed: true,
        },
      ],
    };
  }

  if (typeId === "short_response") {
    return {
      title: "Short Response",
      instructions: "Answer the prompt using a claim, evidence, and explanation.",
      questions: [
        {
          questionId: "q1",
          type: "short_response",
          prompt: "Claim: What is your answer to the prompt?",
          points: 2,
          teacherReviewed: true,
        },
        {
          questionId: "q2",
          type: "short_response",
          prompt: "Evidence: What detail from the source supports your claim?",
          points: 3,
          teacherReviewed: true,
        },
        {
          questionId: "q3",
          type: "short_response",
          prompt: "Explanation: How does the evidence support your claim?",
          points: 5,
          teacherReviewed: true,
        },
      ],
    };
  }

  if (typeId === "annotation_assignment") {
    return {
      title: "Annotation Assignment",
      instructions: "Write close-reading notes tied to specific paragraphs or sections.",
      questions: [
        {
          questionId: "q1",
          type: "annotation",
          paragraphNumber: 1,
          noteType: "Important detail",
          prompt: "Write an annotation for paragraph or section 1.",
          points: 3,
          teacherReviewed: true,
        },
        {
          questionId: "q2",
          type: "annotation",
          paragraphNumber: 2,
          noteType: "Question",
          prompt: "Write a question or observation for paragraph or section 2.",
          points: 3,
          teacherReviewed: true,
        },
        {
          questionId: "q3",
          type: "annotation",
          paragraphNumber: 3,
          noteType: "Evidence",
          prompt: "Choose one useful detail and explain why it matters.",
          points: 4,
          teacherReviewed: true,
        },
      ],
    };
  }

  if (typeId === "paragraph_response") {
    return {
      title: "Paragraph Response",
      instructions: "Plan and write a developed paragraph using claim, evidence, and reasoning.",
      questions: [
        {
          questionId: "q1",
          type: "paragraph_response",
          prompt: "Write a developed paragraph that answers the prompt.",
          points: 16,
          teacherReviewed: true,
        },
      ],
      rubricEnabled: true,
    };
  }

  return {
    title: "Vocabulary Practice",
    instructions: "Practice vocabulary from the source. Answer meaning questions and write original sentences.",
    vocabularyItems: [
      {
        word: "precise",
        definition: "Careful and exact",
        contextSentence: "A precise response explains how the reader knows.",
        options: ["Careful and exact", "Fast and careless", "Hidden from view", "Difficult to hear"],
        correctAnswer: "Careful and exact",
      },
      {
        word: "infer",
        definition: "To make a reasonable conclusion from evidence",
        contextSentence: "Readers infer meaning by connecting evidence across the text.",
        options: ["To ignore details", "To copy a sentence", "To make a reasonable conclusion from evidence", "To read aloud"],
        correctAnswer: "To make a reasonable conclusion from evidence",
      },
      {
        word: "purpose",
        definition: "The reason something is done or written",
        contextSentence: "Skilled readers adjust their pace according to purpose.",
        options: ["A reason", "A mistake", "A title", "A setting"],
        correctAnswer: "A reason",
      },
    ],
  };
}

function questionsFromConfig(typeId, config) {
  if (typeId === "vocabulary_practice") {
    return (config.vocabularyItems || []).flatMap((item, index) => [
      {
        questionId: `v${index + 1}-meaning`,
        type: "vocabulary_multiple_choice",
        prompt: `What does "${item.word}" mean in this context?`,
        options: item.options,
        correctAnswer: item.correctAnswer,
        points: 1,
        vocabularyWord: item.word,
      },
      {
        questionId: `v${index + 1}-sentence`,
        type: "vocabulary_sentence",
        prompt: `Use "${item.word}" in your own sentence.`,
        points: 2,
        teacherReviewed: true,
        vocabularyWord: item.word,
      },
    ]);
  }

  return config.questions || [];
}

function buildDraft({ config, selectedSource, setup, type }) {
  const textBlocks = selectedSource?.kind === "original" ? [textToBlock(selectedSource.resource)] : [];
  const sourceRefs =
    selectedSource?.kind === "original"
      ? [originalSourceRef(selectedSource.resource)]
      : [sourceLibraryRef(selectedSource.resource)];

  return {
    assignmentType: type.label,
    assignmentTypeId: type.typeId,
    courseId: "english-1",
    description: type.description,
    instructions: setup.instructions || config.instructions,
    lessonId: setup.lessonId,
    questions: questionsFromConfig(type.typeId, config),
    prompts: [],
    rubric: setup.rubricEnabled ? DEFAULT_ENGLISH_RUBRIC : [],
    rubricEnabled: setup.rubricEnabled,
    sourceRefs,
    textBlocks,
    textIds: selectedSource?.kind === "original" ? [selectedSource.resource.textId] : [],
    title: setup.title || config.title,
    unitId: setup.unitId || ENGLISH_UNIT_1_ID,
    vocabularyItems: config.vocabularyItems || [],
  };
}

function updateArrayItem(items, index, field, value) {
  return items.map((item, itemIndex) =>
    itemIndex === index ? { ...item, [field]: value } : item,
  );
}

function newQuestionForType(typeId, index) {
  if (typeId === "reading_check") {
    return {
      questionId: `q${index + 1}`,
      type: "multiple_choice",
      prompt: "New reading check question",
      options: ["Answer A", "Answer B", "Answer C", "Answer D"],
      correctAnswer: "Answer A",
      points: 1,
    };
  }

  if (typeId === "annotation_assignment") {
    return {
      questionId: `q${index + 1}`,
      type: "annotation",
      paragraphNumber: index + 1,
      noteType: "Important detail",
      prompt: "Write a close-reading note for this paragraph or section.",
      points: 3,
      teacherReviewed: true,
    };
  }

  if (typeId === "paragraph_response") {
    return {
      questionId: `q${index + 1}`,
      type: "paragraph_response",
      prompt: "Write a developed paragraph that answers this prompt.",
      points: 16,
      teacherReviewed: true,
    };
  }

  return {
    questionId: `q${index + 1}`,
    type: "short_response",
    prompt: "New short-response prompt",
    points: 4,
    teacherReviewed: true,
  };
}

function normalizeQuestionForBuilder(question, type) {
  const teacherReviewedTypes = [
    "annotation",
    "paragraph_response",
    "short_response",
    "vocabulary_sentence",
  ];

  return {
    ...question,
    type,
    correctAnswer:
      ["multiple_choice", "select"].includes(type)
        ? question.correctAnswer || question.options?.[0] || ""
        : type === "true_false"
          ? question.correctAnswer || "True"
          : "",
    options:
      ["multiple_choice", "select"].includes(type)
        ? question.options?.length
          ? question.options
          : ["Answer A", "Answer B", "Answer C", "Answer D"]
        : type === "true_false"
          ? ["True", "False"]
          : [],
    teacherReviewed: teacherReviewedTypes.includes(type),
  };
}

function newVocabularyItem(index) {
  return {
    word: `Word ${index + 1}`,
    definition: "",
    contextSentence: "",
    options: ["Correct meaning", "Distractor 1", "Distractor 2", "Distractor 3"],
    correctAnswer: "Correct meaning",
  };
}

function SourcePanel({ assignment }) {
  const textBlocks = assignment.textBlocks?.length
    ? assignment.textBlocks
    : (assignment.textIds || [])
        .map((textId) => englishUnit1Texts.find((text) => text.textId === textId))
        .filter(Boolean)
        .map(textToBlock);

  const linkedSources = (assignment.sourceRefs || []).filter((source) => !source.isOriginalGambleText);

  if (!textBlocks.length && !linkedSources.length) {
    return <p className="muted-message">No reading source is attached to this assignment.</p>;
  }

  return (
    <section className="english-source-panel">
      {textBlocks.map((text) => (
        <article className="english-text-card" key={text.textId || text.title}>
          <div className="section-heading-row compact-heading">
            <div>
              <p className="eyebrow">Embedded source</p>
              <h3>{text.title}</h3>
              <p className="helper-copy">{text.author || "Gamble Education"}</p>
            </div>
            <span className="source-use-pill embeddable">Safe to Embed</span>
          </div>
          <div className="english-passage">
            {(text.paragraphs || []).map((paragraph) => (
              <p key={paragraph.number}>
                <span>{paragraph.number}</span>
                {paragraph.text}
              </p>
            ))}
          </div>
        </article>
      ))}

      {linkedSources.map((source) => (
          <article className="english-text-card link-only-source-card" key={source.sourceId || source.title}>
            <div className="section-heading-row compact-heading">
              <div>
                <p className="eyebrow">{source.canEmbed ? "Approved source" : "Link-only source"}</p>
                <h3>{source.title}</h3>
                <p className="helper-copy">
                  {source.author ? `${source.author} | ` : ""}
                  {source.providerName || "External source"}
                </p>
              </div>
              <span className={`source-use-pill ${source.canEmbed ? "embeddable" : "link-only"}`}>
                {source.canEmbed ? "Embeddable" : "Link Only"}
              </span>
            </div>
            <p className="status-message success">
              This reading opens from its original source.
            </p>
            {source.attributionText ? <p className="helper-copy">{source.attributionText}</p> : null}
            <a className="secondary-button fit-button source-link-button" href={source.sourceUrl} rel="noreferrer" target="_blank">
              Open Reading
            </a>
          </article>
        ))}
    </section>
  );
}

function AnnotationNoteEditor({ disabled, notes = [], onChange, question }) {
  const normalizedNotes = Array.isArray(notes)
    ? notes
    : notes
      ? [
          {
            noteId: "legacy-note",
            noteText: String(notes || ""),
            noteType: question.noteType || "Important detail",
            reference: question.paragraphNumber ? `Paragraph ${question.paragraphNumber}` : "",
          },
        ]
      : [];

  function updateNote(index, field, value) {
    onChange(
      normalizedNotes.map((note, noteIndex) =>
        noteIndex === index ? { ...note, [field]: value } : note,
      ),
    );
  }

  function addNote() {
    onChange([
      ...normalizedNotes,
      {
        noteId: `note-${Date.now()}`,
        noteText: "",
        noteType: question.noteType || "Important detail",
        reference: question.paragraphNumber ? `Paragraph ${question.paragraphNumber}` : "",
      },
    ]);
  }

  function removeNote(index) {
    onChange(normalizedNotes.filter((_, noteIndex) => noteIndex !== index));
  }

  return (
    <div className="annotation-note-editor">
      <div className="section-heading-row compact-heading">
        <p className="helper-copy">Add notes tied to a paragraph, line, or section.</p>
        <button className="secondary-button fit-button" disabled={disabled} onClick={addNote} type="button">
          Add Note
        </button>
      </div>
      {normalizedNotes.length ? (
        normalizedNotes.map((note, index) => (
          <article className="annotation-note-card" key={note.noteId || index}>
            <div className="assignment-setup-grid">
              <label>
                Reference
                <input
                  disabled={disabled}
                  onChange={(event) => updateNote(index, "reference", event.target.value)}
                  placeholder="Paragraph 3"
                  value={note.reference || ""}
                />
              </label>
              <label>
                Note type
                <select
                  disabled={disabled}
                  onChange={(event) => updateNote(index, "noteType", event.target.value)}
                  value={note.noteType || "Important detail"}
                >
                  {ANNOTATION_NOTE_TYPES.map((noteType) => (
                    <option key={noteType} value={noteType}>
                      {noteType}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Note
              <textarea
                disabled={disabled}
                onChange={(event) => updateNote(index, "noteText", event.target.value)}
                placeholder="Write your note"
                value={note.noteText || ""}
              />
            </label>
            {!disabled ? (
              <button className="danger-button fit-button" onClick={() => removeNote(index)} type="button">
                Delete Note
              </button>
            ) : null}
          </article>
        ))
      ) : (
        <p className="muted-message">No notes yet.</p>
      )}
    </div>
  );
}

function EnglishQuestionRenderer({ answers, disabled, onAnswer, question }) {
  const current = answers[question.questionId] || "";

  if (["multiple_choice", "select", "true_false", "vocabulary_multiple_choice"].includes(question.type)) {
    const options = question.type === "true_false" ? ["True", "False"] : question.options || [];
    return (
      <label>
        Answer
        <select disabled={disabled} onChange={(event) => onAnswer(question.questionId, event.target.value)} value={current}>
          <option value="">Choose an answer</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (question.type === "paragraph_response") {
    const value = current && typeof current === "object" ? current : {};
    const updateField = (field, fieldValue) =>
      onAnswer(question.questionId, { ...value, [field]: fieldValue });
    const wordCount = String(value.finalParagraph || "").split(/\s+/).filter(Boolean).length;

    return (
      <div className="paragraph-response-grid">
        <label>
          Claim / Topic Sentence
          <textarea disabled={disabled} onChange={(event) => updateField("claim", event.target.value)} value={value.claim || ""} />
        </label>
        <label>
          Evidence
          <textarea disabled={disabled} onChange={(event) => updateField("evidence", event.target.value)} value={value.evidence || ""} />
        </label>
        <label>
          Explanation
          <textarea disabled={disabled} onChange={(event) => updateField("explanation", event.target.value)} value={value.explanation || ""} />
        </label>
        <label>
          Concluding Thought
          <textarea disabled={disabled} onChange={(event) => updateField("conclusion", event.target.value)} value={value.conclusion || ""} />
        </label>
        <label className="full-width-field">
          Final Paragraph
          <textarea disabled={disabled} onChange={(event) => updateField("finalParagraph", event.target.value)} value={value.finalParagraph || ""} />
        </label>
        <p className="helper-copy">Word count: {wordCount}</p>
      </div>
    );
  }

  if (question.type === "annotation") {
    return (
      <AnnotationNoteEditor
        disabled={disabled}
        notes={current}
        onChange={(notes) => onAnswer(question.questionId, notes)}
        question={question}
      />
    );
  }

  return (
    <label>
      {question.type === "annotation"
        ? `${question.noteType || "Annotation"} for paragraph/section ${question.paragraphNumber || ""}`
        : question.type === "vocabulary_sentence"
          ? "Original sentence"
          : "Response"}
      <textarea disabled={disabled} onChange={(event) => onAnswer(question.questionId, event.target.value)} value={current || ""} />
    </label>
  );
}

function EnglishStudentWorkspace({
  actorUser = null,
  assignment,
  onBack,
  previewMode = false,
  role,
  school,
  section,
  testMode = false,
  user,
}) {
  const [submission, setSubmission] = useState(null);
  const [answers, setAnswers] = useState({});
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState("success");
  const [demoResult, setDemoResult] = useState(null);
  const [previewCheckCount, setPreviewCheckCount] = useState(0);
  const [saveStatus, setSaveStatus] = useState("No answers saved yet.");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const localDraftKey = getLocalDraftKey({ assignment, previewMode, testMode, user });

  useEffect(() => {
    if (previewMode || !assignment?.assignmentId) return undefined;

    if (testMode) {
      return subscribeEnglishDemoSubmission(
        school,
        section,
        assignment.assignmentId,
        user.demoStudentId,
        setSubmission,
        (error) => console.error("English demo submission failed to load", error),
      );
    }

    return subscribeEnglishSubmission(
      school,
      section,
      assignment.assignmentId,
      user.uid,
      setSubmission,
      (error) => console.error("English submission failed to load", error),
    );
  }, [assignment, previewMode, school, section, testMode, user]);

  useEffect(() => {
    if (submission?.answers) {
      setAnswers(submission.answers);
      setSaveStatus("Loaded submitted work.");
      return;
    }

    const draft = readLocalDraft(localDraftKey);
    if (draft?.answers) {
      setAnswers(draft.answers);
      setSaveStatus("Draft restored.");
    }
  }, [localDraftKey, submission]);

  useEffect(() => {
    if (previewMode || !assignment?.assignmentId || !user) return undefined;

    recordEnglishAssignmentOpened({
      actorUser,
      assignment,
      role,
      school,
      section,
      testMode,
      user,
    }).catch((error) => console.warn("English assignment open progress failed", error));

    return undefined;
  }, [actorUser, assignment, previewMode, role, school, section, testMode, user]);

  function canSubmitAssignment() {
    if (previewMode || !submission) return true;
    const attemptNumber = Number(submission.attemptNumber) || 1;
    const maxAttempts = Math.max(Number(submission.maxAttempts) || 0, Number(assignment.maxAttempts) || 1, 1);
    return submission.resubmissionAllowed === true || attemptNumber < maxAttempts;
  }

  useEffect(() => {
    if (!assignment?.assignmentId || !user || !Object.keys(answers).length) {
      return undefined;
    }

    if (submission && !canSubmitAssignment()) return undefined;

    setSaveStatus("Saving...");
    const timeout = window.setTimeout(() => {
      try {
        writeLocalDraft(localDraftKey, answers);
      } catch (error) {
        console.warn("English local draft save failed", error);
        setSaveStatus("Unable to save.");
        return;
      }

      if (previewMode) {
        setSaveStatus("Saved locally for preview.");
        return;
      }

      recordEnglishAnswerProgress({
        actorUser,
        answers,
        assignment,
        role,
        school,
        section,
        testMode,
        user,
      })
        .then(() => setSaveStatus("Saved."))
        .catch((error) => {
          console.warn("English answer progress failed", error);
          setSaveStatus("Your work could not be saved. Check your connection and try again.");
        });
    }, 1200);

    return () => window.clearTimeout(timeout);
  }, [actorUser, answers, assignment, localDraftKey, previewMode, role, school, section, submission, testMode, user]);

  function updateAnswer(questionId, value) {
    setAnswers((current) => ({ ...current, [questionId]: value }));
  }

  async function handleSubmit() {
    setMessage("");
    setMessageTone("success");
    setIsSubmitting(true);

    const missingRequired = getMissingRequiredQuestions(assignment, answers);
    if (missingRequired.length) {
      setMessage("Some required questions are still missing.");
      setMessageTone("danger");
      setIsSubmitting(false);
      return;
    }

    const grading = gradeEnglishAnswers(assignment, answers);

    if (previewMode) {
      setDemoResult(grading);
      setPreviewCheckCount((current) => current + 1);
      setMessage("Preview checked. Answers were scored locally and were not saved.");
      setIsSubmitting(false);
      return;
    }

    try {
      if (testMode) {
        await submitEnglishDemoAssignmentWork({
          actorUser,
          answers,
          assignment,
          role,
          school,
          section,
          user,
        });
        setMessage("Demo English submission saved as test data.");
        clearLocalDraft(localDraftKey);
      } else {
        await submitEnglishAssignmentWork({ answers, assignment, role, school, section, user });
        setMessage("Submitted. Your teacher will review any written responses.");
        clearLocalDraft(localDraftKey);
      }
    } catch (error) {
      console.error("English submission failed", error);
      setMessage(error.message || "Unable to submit English work.");
      setMessageTone("danger");
    } finally {
      setIsSubmitting(false);
    }
  }

  const canSubmit = canSubmitAssignment();
  const inputDisabled = !previewMode && Boolean(submission) && !canSubmit;
  const grading = gradeEnglishAnswers(assignment, answers);
  const answeredCount = countAnswered(answers);
  const totalQuestions = assignment.questions?.length || 0;
  const attemptLabel = submission?.attemptNumber || (submission ? 1 : "--");
  const friendlyStatus = getFriendlyStatus(submission, previewMode);
  const unsupportedAssignment = !totalQuestions;

  return (
    <section className="student-work-runner english-runner english-student-workspace">
      <div className="section-heading-row">
        <div>
          <p className="eyebrow">English 1</p>
          <h3>{assignment.title}</h3>
          <p className="helper-copy">
            {assignment.assignmentType} {assignment.unitId ? `| ${assignment.unitId}` : ""}
          </p>
        </div>
        <button className="secondary-button fit-button" onClick={onBack} type="button">
          Back to English work
        </button>
      </div>

      {previewMode ? (
        <p className="preview-mode-banner">
          Teacher Preview - no student work is saved. Use Test as Student when you want saved demo work.
        </p>
      ) : null}
      {testMode ? (
        <p className="test-mode-banner">
          Teacher Test Mode - Testing as {user.displayName}. Demo English submissions are saved as test data.
        </p>
      ) : null}
      {submission?.resubmissionAllowed ? (
        <p className="status-message success">
          Resubmission is available. Review your teacher feedback, revise your work,
          and submit again.
        </p>
      ) : null}

      <dl className="detail-list assignment-detail-list english-workspace-meta">
        <div>
          <dt>Type</dt>
          <dd>{assignment.assignmentType}</dd>
        </div>
        <div>
          <dt>Due</dt>
          <dd>{formatDate(assignment.dueDate)}</dd>
        </div>
        <div>
          <dt>Attempt</dt>
          <dd>{attemptLabel}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{friendlyStatus}</dd>
        </div>
        <div>
          <dt>Saved</dt>
          <dd>{saveStatus}</dd>
        </div>
      </dl>

      <div className="english-workspace-layout">
        <aside className="english-reading-column">
          <div className="section-heading-row compact-heading">
            <div>
              <p className="eyebrow">Reading</p>
              <h3>Source</h3>
            </div>
          </div>
          <SourcePanel assignment={assignment} />
        </aside>

        <section className="english-writing-column">
          <div>
            <p className="eyebrow">Instructions</p>
            <p className="helper-copy">{assignment.instructions || assignment.directions}</p>
          </div>

          {submission ? (
            <section className="grade-summary-panel">
              <p className="eyebrow">Feedback and Grade</p>
              <h4>
                {getSubmissionScore(submission)} / {getTotalPoints(assignment, submission)} ({getSubmissionPercent(submission)}%)
              </h4>
              <p className="helper-copy">
                {submission.status === "graded" || submission.gradedAt
                  ? "Reviewed by your teacher."
                  : submission.teacherReviewRequired
                    ? "Your written response is waiting for teacher review."
                    : "Auto-graded score shown."}
              </p>
              <p className="muted-message">{submission.teacherFeedback || submission.feedback || "No feedback yet."}</p>
              {submission.rubricScores && Object.keys(submission.rubricScores).length ? (
                <dl className="detail-list assignment-detail-list">
                  {Object.entries(submission.rubricScores).map(([rubricId, score]) => (
                    <div key={rubricId}>
                      <dt>{rubricId.replace(/-/g, " ")}</dt>
                      <dd>{score}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </section>
          ) : null}

          {unsupportedAssignment ? (
            <p className="muted-message">
              This English assignment type is not available in the student workspace yet.
            </p>
          ) : (
            <div className="english-question-list">
              {(assignment.questions || []).map((question, index) => (
                <article className="student-problem-card english-question-card" key={question.questionId}>
                  <p className="eyebrow">Question {index + 1}</p>
                  <h4>{question.prompt}</h4>
                  <EnglishQuestionRenderer
                    answers={answers}
                    disabled={inputDisabled}
                    onAnswer={updateAnswer}
                    question={question}
                  />
                  {!answerComplete(question, answers[question.questionId]) ? (
                    <p className="muted-message">Required</p>
                  ) : null}
                </article>
              ))}
            </div>
          )}

          {assignment.rubric?.length ? (
            <section className="rubric-preview-panel">
              <p className="eyebrow">Rubric</p>
              <div className="rubric-grid">
                {assignment.rubric.map((item) => (
                  <span key={item.rubricId}>
                    {item.label}: {item.maxScore} pts
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          <div className="submission-action-panel">
            <p className="helper-copy">
              Answered {answeredCount} / {totalQuestions || 0}
            </p>
            <button
              className="primary-button submit-work-button"
              disabled={unsupportedAssignment || isSubmitting || (!previewMode && Boolean(submission) && !canSubmit)}
              onClick={handleSubmit}
              type="button"
            >
              {isSubmitting
                ? "Submitting..."
                : previewMode
                  ? "Preview Submit"
                  : submission && canSubmit
                    ? "Resubmit Assignment"
                    : submission
                      ? "Already Submitted"
                      : testMode
                        ? "Submit As Demo Student"
                        : "Submit Assignment"}
            </button>
            {message ? <p className={`status-message ${messageTone}`}>{message}</p> : null}
            {demoResult ? (
              <p className="status-message success">
                Preview check {previewCheckCount}: auto-score {demoResult.autoScore} / {demoResult.autoPossible}. No submission or progress record was created.
              </p>
            ) : null}
            {previewMode && grading.teacherReviewRequired ? (
              <p className="muted-message">This assignment includes written responses that need teacher review.</p>
            ) : null}
            {!canSubmit && !previewMode ? (
              <p className="muted-message">Resubmission is not currently available.</p>
            ) : null}
          </div>
        </section>
      </div>
    </section>
  );
}

function AssignmentBuilderFields({ config, setConfig, typeId }) {
  if (typeId === "vocabulary_practice") {
    return (
      <div className="english-builder-stack">
        <div className="section-heading-row compact-heading">
          <div>
            <p className="eyebrow">Vocabulary items</p>
            <h3>Words and Practice</h3>
          </div>
          <button
            className="secondary-button fit-button"
            onClick={() =>
              setConfig((current) => ({
                ...current,
                vocabularyItems: [
                  ...(current.vocabularyItems || []),
                  newVocabularyItem(current.vocabularyItems?.length || 0),
                ],
              }))
            }
            type="button"
          >
            Add Vocabulary Word
          </button>
        </div>
        {(config.vocabularyItems || []).map((item, index) => (
          <article className="student-problem-card" key={`vocab-${index}`}>
            <div className="section-heading-row compact-heading">
              <p className="eyebrow">Vocabulary word {index + 1}</p>
              {(config.vocabularyItems || []).length > 1 ? (
                <button
                  className="danger-button fit-button"
                  onClick={() =>
                    setConfig((current) => ({
                      ...current,
                      vocabularyItems: current.vocabularyItems.filter((_, itemIndex) => itemIndex !== index),
                    }))
                  }
                  type="button"
                >
                  Remove
                </button>
              ) : null}
            </div>
            <label>
              Word
              <input
                onChange={(event) =>
                  setConfig((current) => ({
                    ...current,
                    vocabularyItems: updateArrayItem(current.vocabularyItems, index, "word", event.target.value),
                  }))
                }
                value={item.word}
              />
            </label>
            <label>
              Definition
              <input
                onChange={(event) =>
                  setConfig((current) => ({
                    ...current,
                    vocabularyItems: updateArrayItem(current.vocabularyItems, index, "definition", event.target.value),
                  }))
                }
                value={item.definition}
              />
            </label>
            <label>
              Context sentence
              <textarea
                onChange={(event) =>
                  setConfig((current) => ({
                    ...current,
                    vocabularyItems: updateArrayItem(current.vocabularyItems, index, "contextSentence", event.target.value),
                  }))
                }
                value={item.contextSentence}
              />
            </label>
            <label>
              Multiple-choice options, one per line
              <textarea
                onChange={(event) =>
                  setConfig((current) => ({
                    ...current,
                    vocabularyItems: updateArrayItem(
                      current.vocabularyItems,
                      index,
                      "options",
                      event.target.value.split("\n").map((option) => option.trim()).filter(Boolean),
                    ),
                  }))
                }
                value={(item.options || []).join("\n")}
              />
            </label>
            <label>
              Correct meaning
              <input
                onChange={(event) =>
                  setConfig((current) => ({
                    ...current,
                    vocabularyItems: updateArrayItem(current.vocabularyItems, index, "correctAnswer", event.target.value),
                  }))
                }
                value={item.correctAnswer}
              />
            </label>
          </article>
        ))}
      </div>
    );
  }

  return (
    <div className="english-builder-stack">
      <div className="section-heading-row compact-heading">
        <div>
          <p className="eyebrow">Prompts</p>
          <h3>Questions and Prompts</h3>
        </div>
        <button
          className="secondary-button fit-button"
          onClick={() =>
            setConfig((current) => ({
              ...current,
              questions: [
                ...(current.questions || []),
                newQuestionForType(typeId, current.questions?.length || 0),
              ],
            }))
          }
          type="button"
        >
          Add Prompt
        </button>
      </div>
      {(config.questions || []).map((question, index) => (
        <article className="student-problem-card" key={question.questionId}>
          <div className="section-heading-row compact-heading">
            <p className="eyebrow">Prompt {index + 1}</p>
            {(config.questions || []).length > 1 ? (
              <button
                className="danger-button fit-button"
                onClick={() =>
                  setConfig((current) => ({
                    ...current,
                    questions: current.questions.filter((_, itemIndex) => itemIndex !== index),
                  }))
                }
                type="button"
              >
                Remove
              </button>
            ) : null}
          </div>
          <div className="assignment-setup-grid">
            <label>
              Prompt type
              <select
                onChange={(event) =>
                  setConfig((current) => ({
                    ...current,
                    questions: current.questions.map((item, itemIndex) =>
                      itemIndex === index
                        ? normalizeQuestionForBuilder(item, event.target.value)
                        : item,
                    ),
                  }))
                }
                value={question.type}
              >
                <option value="multiple_choice">Multiple choice</option>
                <option value="true_false">True / false</option>
                <option value="short_response">Short response</option>
                <option value="annotation">Annotation</option>
                <option value="paragraph_response">Paragraph response</option>
              </select>
            </label>
            <label>
              Points
              <input
                min="0"
                onChange={(event) =>
                  setConfig((current) => ({
                    ...current,
                    questions: updateArrayItem(current.questions, index, "points", Number(event.target.value) || 0),
                  }))
                }
                type="number"
                value={question.points ?? 1}
              />
            </label>
          </div>
          <label>
            Question / prompt
            <textarea
              onChange={(event) =>
                setConfig((current) => ({
                  ...current,
                  questions: updateArrayItem(current.questions, index, "prompt", event.target.value),
                }))
              }
              value={question.prompt}
            />
          </label>
          {["multiple_choice", "select"].includes(question.type) ? (
            <>
              <label>
                Options, one per line
                <textarea
                  onChange={(event) =>
                    setConfig((current) => ({
                      ...current,
                      questions: updateArrayItem(
                        current.questions,
                        index,
                        "options",
                        event.target.value.split("\n").map((option) => option.trim()).filter(Boolean),
                      ),
                    }))
                  }
                  value={(question.options || []).join("\n")}
                />
              </label>
              <label>
                Correct answer
                <input
                  onChange={(event) =>
                    setConfig((current) => ({
                      ...current,
                      questions: updateArrayItem(current.questions, index, "correctAnswer", event.target.value),
                    }))
                  }
                  value={question.correctAnswer || ""}
                />
              </label>
            </>
          ) : null}
          {question.type === "true_false" ? (
            <label>
              Correct answer
              <select
                onChange={(event) =>
                  setConfig((current) => ({
                    ...current,
                    questions: updateArrayItem(current.questions, index, "correctAnswer", event.target.value),
                  }))
                }
                value={question.correctAnswer || "True"}
              >
                <option value="True">True</option>
                <option value="False">False</option>
              </select>
            </label>
          ) : null}
          {question.type === "annotation" ? (
            <div className="assignment-setup-grid">
              <label>
                Paragraph / section
                <input
                  onChange={(event) =>
                    setConfig((current) => ({
                      ...current,
                      questions: updateArrayItem(current.questions, index, "paragraphNumber", event.target.value),
                    }))
                  }
                  value={question.paragraphNumber || ""}
                />
              </label>
              <label>
                Note type
                <select
                  onChange={(event) =>
                    setConfig((current) => ({
                      ...current,
                      questions: updateArrayItem(current.questions, index, "noteType", event.target.value),
                    }))
                  }
                  value={question.noteType || "Important detail"}
                >
                  {["Important detail", "Question", "Confusing part", "Vocabulary", "Evidence", "Theme/central idea clue"].map((noteType) => (
                    <option key={noteType} value={noteType}>
                      {noteType}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}

function EnglishAssignmentBuilder({ role, school, section, user }) {
  const [resources, setResources] = useState([]);
  const [sourceError, setSourceError] = useState("");
  const [typeId, setTypeId] = useState("reading_check");
  const [sourceKey, setSourceKey] = useState(DEFAULT_SOURCE_KEY);
  const [config, setConfig] = useState(defaultConfig("reading_check"));
  const [setup, setSetup] = useState({
    dueDate: "",
    feedbackSetting: "after-submit",
    instructions: defaultConfig("reading_check").instructions,
    lessonId: "",
    maxAttempts: 1,
    rubricEnabled: false,
    title: defaultConfig("reading_check").title,
    unitId: ENGLISH_UNIT_1_ID,
  });
  const [showPreview, setShowPreview] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState("success");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    return subscribeSourceLibrary(
      { role, school, user },
      (nextResources) => {
        setResources(nextResources);
        setSourceError("");
      },
      (error) => {
        console.error("English source library failed to load", error);
        setSourceError("Unable to load source library resources.");
      },
    );
  }, [role, school, user]);

  const sourceOptions = useMemo(() => buildSourceOptions(resources), [resources]);
  const selectedSource = sourceOptions.find((option) => option.key === sourceKey) || sourceOptions[0];
  const type = getEnglishAssignmentType(typeId) || READY_ENGLISH_ASSIGNMENT_TYPES[0];
  const draft = selectedSource ? buildDraft({ config, selectedSource, setup, type }) : null;
  const selectedIsLinkOnly = selectedSource?.kind === "source" && !canResourceBeEmbedded(selectedSource.resource);

  function handleTypeChange(nextTypeId) {
    const nextConfig = defaultConfig(nextTypeId);
    const nextType = getEnglishAssignmentType(nextTypeId);
    setTypeId(nextTypeId);
    setConfig(nextConfig);
    setSetup((current) => ({
      ...current,
      instructions: nextConfig.instructions,
      rubricEnabled: nextConfig.rubricEnabled || false,
      title: nextConfig.title || nextType?.label || current.title,
    }));
    setShowPreview(false);
  }

  async function handleAssign(event) {
    event.preventDefault();
    setMessage("");

    if (!selectedSource?.canAssign) {
      setMessage("Select an approved source or original Gamble text before assigning this work.");
      setMessageTone("danger");
      return;
    }

    setIsSaving(true);
    try {
      await createEnglishSectionAssignment({
        assignmentDraft: draft,
        dueDate: setup.dueDate,
        feedbackSetting: setup.feedbackSetting,
        maxAttempts: setup.maxAttempts,
        role,
        school,
        section,
        user,
      });
      setMessage(`${draft.title} was assigned to ${section.sectionName}.`);
      setMessageTone("success");
      setShowPreview(false);
    } catch (error) {
      console.error("English assignment creation failed", error);
      setMessage(error.message || "Unable to assign English work.");
      setMessageTone("danger");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="assignment-setup-panel english-assignment-builder">
      <div className="section-heading-row compact-heading">
        <div>
          <p className="eyebrow">English assignment engine</p>
          <h3>Create Assignment</h3>
          <p className="helper-copy">Build reusable English work with safe source references.</p>
        </div>
      </div>

      {sourceError ? <p className="error-message">{sourceError}</p> : null}
      {message ? <p className={`status-message ${messageTone}`}>{message}</p> : null}

      <form className="english-builder-form" onSubmit={handleAssign}>
        <div className="assignment-setup-grid">
          <label>
            Assignment type
            <select onChange={(event) => handleTypeChange(event.target.value)} value={typeId}>
              {READY_ENGLISH_ASSIGNMENT_TYPES.map((assignmentType) => (
                <option key={assignmentType.typeId} value={assignmentType.typeId}>
                  {assignmentType.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Source / resource
            <select onChange={(event) => setSourceKey(event.target.value)} value={selectedSource?.key || ""}>
              {sourceOptions.map((option) => (
                <option disabled={!option.canAssign} key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Due date
            <input onChange={(event) => setSetup((current) => ({ ...current, dueDate: event.target.value }))} type="date" value={setup.dueDate} />
          </label>
          <label>
            Max attempts
            <input
              max="10"
              min="1"
              onChange={(event) => setSetup((current) => ({ ...current, maxAttempts: event.target.value }))}
              type="number"
              value={setup.maxAttempts}
            />
          </label>
        </div>

        {selectedSource ? (
          <p className={`status-message ${selectedSource.canAssign ? "success" : "danger"}`}>
            {selectedSource.canAssign
              ? selectedIsLinkOnly
                ? "This resource is link-only. Students will open the source from its original website."
                : "This source can be used for the assignment."
              : "This source needs review or is rejected and cannot be assigned yet."}
          </p>
        ) : (
          <p className="status-message danger">Select an approved source or original Gamble text before assigning this work.</p>
        )}

        <label>
          Assignment title
          <input onChange={(event) => setSetup((current) => ({ ...current, title: event.target.value }))} value={setup.title} />
        </label>
        <label>
          Instructions
          <textarea
            className="assignment-instructions-input"
            onChange={(event) => setSetup((current) => ({ ...current, instructions: event.target.value }))}
            value={setup.instructions}
          />
        </label>
        {type.supportsRubric ? (
          <label className="checkbox-label">
            <input
              checked={setup.rubricEnabled}
              onChange={(event) => setSetup((current) => ({ ...current, rubricEnabled: event.target.checked }))}
              type="checkbox"
            />
            Use 4-category writing rubric
          </label>
        ) : null}

        <AssignmentBuilderFields config={config} setConfig={setConfig} typeId={typeId} />

        <div className="button-row">
          <button className="secondary-button fit-button" onClick={() => setShowPreview((current) => !current)} type="button">
            {showPreview ? "Hide Preview" : "Preview Assignment"}
          </button>
          <button className="primary-button fit-button" disabled={isSaving || !selectedSource?.canAssign} type="submit">
            {isSaving ? "Assigning..." : "Assign to Section"}
          </button>
        </div>
      </form>

      {PLACEHOLDER_ENGLISH_ASSIGNMENT_TYPES.length ? (
        <p className="muted-message">
          Placeholder types for later: {PLACEHOLDER_ENGLISH_ASSIGNMENT_TYPES.map((item) => item.label).join(", ")}.
        </p>
      ) : null}

      {showPreview && draft ? (
        <EnglishStudentWorkspace
          assignment={{ ...draft, assignmentId: "preview" }}
          previewMode
          role={role}
          school={school}
          section={section}
          user={{
            uid: "teacher-preview",
            displayName: "Preview Student",
            email: "preview@student.example",
          }}
          onBack={() => setShowPreview(false)}
        />
      ) : null}
    </section>
  );
}

function AssignedEnglishWork({ actorUser = null, onGrade = null, previewMode = false, role, school, section, testMode = false, user }) {
  const [assignments, setAssignments] = useState([]);
  const [submissionsByAssignment, setSubmissionsByAssignment] = useState({});
  const [studentSubmissionsByAssignment, setStudentSubmissionsByAssignment] = useState({});
  const [openAssignment, setOpenAssignment] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!school || !section) return undefined;
    setIsLoading(true);
    return subscribeEnglishAssignments(
      school,
      section,
      (nextAssignments) => {
        setAssignments(nextAssignments);
        setError("");
        setIsLoading(false);
      },
      (loadError) => {
        console.error("English assignments failed to load", loadError);
        setError("Unable to load English assignments for this section.");
        setIsLoading(false);
      },
    );
  }, [school, section]);

  useEffect(() => {
    if (!onGrade || !school || !section || !assignments.length) {
      setSubmissionsByAssignment({});
      return undefined;
    }

    const unsubscribes = assignments.flatMap((assignment) => [
      subscribeEnglishSubmissions(
        school,
        section,
        assignment.assignmentId,
        (items) =>
          setSubmissionsByAssignment((current) => ({
            ...current,
            [assignment.assignmentId]: {
              ...(current[assignment.assignmentId] || {}),
              real: items.length,
            },
          })),
        () => {},
      ),
      subscribeEnglishDemoSubmissions(
        school,
        section,
        assignment.assignmentId,
        (items) =>
          setSubmissionsByAssignment((current) => ({
            ...current,
            [assignment.assignmentId]: {
              ...(current[assignment.assignmentId] || {}),
              demo: items.length,
            },
          })),
        () => {},
      ),
    ]);

    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [assignments, onGrade, school, section]);

  useEffect(() => {
    if (onGrade || previewMode || !school || !section || !assignments.length || !user) {
      setStudentSubmissionsByAssignment({});
      return undefined;
    }

    const unsubscribes = assignments.map((assignment) => {
      const updateSubmission = (submission) =>
        setStudentSubmissionsByAssignment((current) => ({
          ...current,
          [assignment.assignmentId]: submission,
        }));

      return testMode
        ? subscribeEnglishDemoSubmission(
            school,
            section,
            assignment.assignmentId,
            user.demoStudentId,
            updateSubmission,
            () => {},
          )
        : subscribeEnglishSubmission(
            school,
            section,
            assignment.assignmentId,
            user.uid,
            updateSubmission,
            () => {},
          );
    });

    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [assignments, onGrade, previewMode, school, section, testMode, user]);

  if (openAssignment) {
    return (
      <EnglishStudentWorkspace
        actorUser={actorUser}
        assignment={openAssignment}
        previewMode={previewMode}
        role={role}
        school={school}
        section={section}
        testMode={testMode}
        user={user}
        onBack={() => setOpenAssignment(null)}
      />
    );
  }

  return (
    <section className="assigned-work-panel">
      <div>
        <p className="eyebrow">{previewMode ? "Teacher Preview" : testMode ? "Teacher Test Mode" : "Assigned work"}</p>
        <h3>English Assignments</h3>
      </div>

      {isLoading ? <p className="muted-message">Loading English assignments...</p> : null}
      {error ? <p className="error-message">{error}</p> : null}

      {!isLoading && assignments.length ? (
        <div className="assigned-work-list">
          {assignments.map((assignment) => {
            const counts = submissionsByAssignment[assignment.assignmentId] || {};
            const doneCount = (counts.real || 0) + (counts.demo || 0);
            const studentSubmission = studentSubmissionsByAssignment[assignment.assignmentId] || null;

            return (
              <article className="assigned-work-row" key={assignment.assignmentId}>
                <div>
                  <p className="eyebrow">{assignment.assignmentType}</p>
                  <h3>{assignment.title}</h3>
                  <p className="helper-copy">{assignment.sourceRefs?.[0]?.title || assignment.textBlocks?.[0]?.title || ""}</p>
                  {!onGrade ? (
                    <dl className="student-assignment-meta">
                      <div>
                        <dt>Unit</dt>
                        <dd>{assignment.unitId || "English 1"}</dd>
                      </div>
                      <div>
                        <dt>Due</dt>
                        <dd>{formatDate(assignment.dueDate)}</dd>
                      </div>
                      <div>
                        <dt>Status</dt>
                        <dd>{getFriendlyStatus(studentSubmission, previewMode)}</dd>
                      </div>
                      <div>
                        <dt>Grade</dt>
                        <dd>{studentSubmission ? `${getSubmissionPercent(studentSubmission)}%` : "--"}</dd>
                      </div>
                    </dl>
                  ) : null}
                </div>
                {onGrade ? (
                  <div>
                    <span>Done</span>
                    <strong>{doneCount}</strong>
                  </div>
                ) : null}
                <button className="secondary-button fit-button" onClick={() => (onGrade ? onGrade(assignment) : setOpenAssignment(assignment))} type="button">
                  {onGrade ? "Grade Assignment" : previewMode ? "Open Preview" : testMode ? "Open As Test Student" : "Open Assignment"}
                </button>
              </article>
            );
          })}
        </div>
      ) : null}

      {!isLoading && !assignments.length ? (
        <p className="muted-message">No English 1 assignments have been assigned yet.</p>
      ) : null}
    </section>
  );
}

function buildRosterRows({ demoRoster, demoSubmissions, roster, submissions }) {
  const realRows = roster.map((student) => ({
    kind: "real",
    student,
    submission: submissions.find((item) => item.studentUid === student.studentUid) || null,
  }));
  const demoRows = demoRoster.map((student) => ({
    kind: "demo",
    student,
    submission: demoSubmissions.find((item) => item.demoStudentId === student.demoStudentId) || null,
  }));

  return [...realRows, ...demoRows].sort((left, right) => getStudentName(left).localeCompare(getStudentName(right)));
}

function AnswerDisplay({ answer }) {
  if (Array.isArray(answer)) {
    return (
      <div className="annotation-review-list">
        {answer.length ? (
          answer.map((note, index) => (
            <article className="annotation-note-card" key={note.noteId || index}>
              <p className="eyebrow">{note.reference || "No reference"}</p>
              <h4>{note.noteType || "Note"}</h4>
              <p>{note.noteText || "--"}</p>
            </article>
          ))
        ) : (
          <p>--</p>
        )}
      </div>
    );
  }

  if (answer && typeof answer === "object") {
    return (
      <dl className="detail-list assignment-detail-list">
        {Object.entries(answer).map(([field, value]) => (
          <div key={field}>
            <dt>{field.replace(/([A-Z])/g, " $1")}</dt>
            <dd>{String(value || "--")}</dd>
          </div>
        ))}
      </dl>
    );
  }

  return <p>{String(answer || "--")}</p>;
}

function EnglishWorkDetail({ assignment, onClose, role, row, school, section, user }) {
  const submission = row.submission;
  const [feedback, setFeedback] = useState(submission?.teacherFeedback || submission?.feedback || "");
  const [score, setScore] = useState(submission?.finalScore ?? submission?.score ?? submission?.autoScore ?? 0);
  const [rubricScores, setRubricScores] = useState(submission?.rubricScores || {});
  const [resubmissionDueDate, setResubmissionDueDate] = useState(submission?.resubmissionDueDate || "");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const status = getRosterStatus(submission);
  const totalPoints = getTotalPoints(assignment, submission);

  useEffect(() => {
    setFeedback(submission?.teacherFeedback || submission?.feedback || "");
    setScore(submission?.finalScore ?? submission?.score ?? submission?.autoScore ?? 0);
    setRubricScores(submission?.rubricScores || {});
    setResubmissionDueDate(submission?.resubmissionDueDate || "");
  }, [submission]);

  function setRubricScore(rubricId, value) {
    setRubricScores((current) => ({ ...current, [rubricId]: Number(value) || 0 }));
  }

  async function handleReview(resubmissionAllowed) {
    if (!submission) return;
    setIsSaving(true);
    setMessage("");

    try {
      await reviewEnglishSubmission({
        actorUser: user,
        assignment,
        feedback,
        finalScore: score,
        resubmissionAllowed,
        resubmissionDueDate,
        role,
        rubricScores,
        school,
        section,
        submission,
        submissionKind: row.kind,
      });
      setMessage(resubmissionAllowed ? "Resubmission opened." : "Grade saved.");
    } catch (error) {
      console.error("English review failed", error);
      setMessage(error.message || "Unable to review English work.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="preview-modal-backdrop" role="presentation">
      <section aria-label="English student work" className="work-detail-modal" role="dialog">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">{assignment.assignmentType}</p>
            <h2>
              {getStudentName(row)}
              {row.kind === "demo" ? <span className="inline-badge">Demo</span> : null}
            </h2>
            <p className="helper-copy">{assignment.title}</p>
          </div>
          <button className="secondary-button fit-button" onClick={onClose} type="button">
            Close
          </button>
        </div>

        <dl className="detail-list assignment-detail-list">
          <div>
            <dt>Status</dt>
            <dd>{status.label}</dd>
          </div>
          <div>
            <dt>Submitted</dt>
            <dd>{formatDateTime(getLatestSubmittedAt(submission))}</dd>
          </div>
          <div>
            <dt>Attempt</dt>
            <dd>{submission?.attemptNumber || "--"}</dd>
          </div>
          <div>
            <dt>Auto Score</dt>
            <dd>{submission ? `${submission.autoScore || 0} / ${submission.autoPossible || 0}` : "--"}</dd>
          </div>
          <div>
            <dt>Grade</dt>
            <dd>{submission ? `${getSubmissionPercent(submission)}%` : "--"}</dd>
          </div>
        </dl>

        <SourcePanel assignment={assignment} />

        {!submission ? (
          <p className="muted-message">This student has not submitted this English assignment yet.</p>
        ) : (
          <>
            {submission.teacherReviewRequired ? (
              <p className="status-message danger">This assignment includes written responses that need teacher review.</p>
            ) : null}
            <section className="grading-controls">
              <label className="review-field">
                Score
                <input max={totalPoints || 100} min="0" onChange={(event) => setScore(event.target.value)} type="number" value={score} />
              </label>
              <label className="review-field">
                Feedback
                <textarea onChange={(event) => setFeedback(event.target.value)} placeholder="Feedback for this student" value={feedback} />
              </label>
              <label className="review-field">
                Resubmission due date
                <input onChange={(event) => setResubmissionDueDate(event.target.value)} type="date" value={resubmissionDueDate} />
              </label>
              {assignment.rubric?.length ? (
                <div className="rubric-score-grid">
                  {assignment.rubric.map((item) => (
                    <label key={item.rubricId}>
                      {item.label}
                      <input
                        max={item.maxScore}
                        min="0"
                        onChange={(event) => setRubricScore(item.rubricId, event.target.value)}
                        type="number"
                        value={rubricScores[item.rubricId] ?? ""}
                      />
                    </label>
                  ))}
                </div>
              ) : null}
              {message ? <p className="status-message success">{message}</p> : null}
              <div className="button-row">
                <button className="secondary-button fit-button" disabled={isSaving} onClick={() => handleReview(false)} type="button">
                  Save Grade
                </button>
                <button className="primary-button fit-button" disabled={isSaving} onClick={() => handleReview(true)} type="button">
                  Allow Resubmission
                </button>
              </div>
            </section>

            <div className="english-question-list">
              {(assignment.questions || []).map((question, index) => {
                const answer = submission.answers?.[question.questionId] || "";
                const isAuto = ["multiple_choice", "select", "true_false", "vocabulary_multiple_choice"].includes(question.type);
                const isCorrect = isAuto && normalizeAnswer(answer) === normalizeAnswer(question.correctAnswer);

                return (
                  <article className="student-problem-card" key={question.questionId}>
                    <p className="eyebrow">Question {index + 1}</p>
                    <h4>{question.prompt}</h4>
                    <strong>Student answer</strong>
                    <AnswerDisplay answer={answer} />
                    {isAuto ? (
                      <p className={`answer-result ${isCorrect ? "correct" : "incorrect"}`}>Correct answer: {question.correctAnswer}</p>
                    ) : (
                      <p className="muted-message">Teacher-reviewed response.</p>
                    )}
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function EnglishRosterGradingView({ assignment, onBack, role, school, section, user }) {
  const [roster, setRoster] = useState([]);
  const [demoRoster, setDemoRoster] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [demoSubmissions, setDemoSubmissions] = useState([]);
  const [openStudent, setOpenStudent] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isWorking, setIsWorking] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const sectionId = section?.sectionId || section?.id;

  useEffect(() => {
    if (!school || !sectionId) return undefined;
    return subscribeSectionRoster(school, sectionId, setRoster, () => setError("Unable to load roster."));
  }, [reloadKey, school, sectionId]);

  useEffect(() => {
    if (!school || !section) return undefined;
    return subscribeDemoStudents(school, section, setDemoRoster, () => setError("Unable to load demo roster."));
  }, [reloadKey, school, section]);

  useEffect(() => {
    if (!school || !section || !assignment?.assignmentId) return undefined;
    return subscribeEnglishSubmissions(school, section, assignment.assignmentId, setSubmissions, () => setError("Unable to load submissions."));
  }, [assignment, reloadKey, school, section]);

  useEffect(() => {
    if (!school || !section || !assignment?.assignmentId) return undefined;
    return subscribeEnglishDemoSubmissions(school, section, assignment.assignmentId, setDemoSubmissions, () => setError("Unable to load demo submissions."));
  }, [assignment, reloadKey, school, section]);

  const rows = useMemo(
    () => buildRosterRows({ demoRoster, demoSubmissions, roster, submissions }),
    [demoRoster, demoSubmissions, roster, submissions],
  );
  const activeRow = rows.find((row) => openStudent && row.kind === openStudent.kind && getStudentId(row) === openStudent.id);

  async function handleClearAll() {
    const response = window.prompt("Clear all submissions for this assignment? This cannot be undone.\n\nType CLEAR to continue.");
    if (response !== "CLEAR") return;

    setIsWorking(true);
    setMessage("");
    setError("");
    try {
      await clearEnglishSubmissions({ actorUser: user, assignment, role, school, section });
      setMessage("All English submissions for this assignment were cleared.");
      setReloadKey((current) => current + 1);
    } catch (clearError) {
      setError(clearError.message || "Unable to clear submissions.");
    } finally {
      setIsWorking(false);
    }
  }

  async function handleReset(row) {
    const confirmed = window.confirm(`Reset ${getStudentName(row)} for this English assignment?`);
    if (!confirmed) return;

    setIsWorking(true);
    setMessage("");
    setError("");
    try {
      await resetEnglishSubmission({
        actorUser: user,
        assignment,
        role,
        school,
        section,
        studentId: getStudentId(row),
        submissionKind: row.kind,
      });
      setMessage(`${getStudentName(row)} was reset.`);
      setReloadKey((current) => current + 1);
    } catch (resetError) {
      setError(resetError.message || "Unable to reset this submission.");
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <section className="grading-roster-card">
      <header className="grading-roster-header">
        <div>
          <button className="grading-back-button" onClick={onBack} type="button">
            Back to assignments
          </button>
          <h2>Roster</h2>
          <p>{assignment.title}</p>
        </div>
        <div className="button-row">
          <button className="secondary-button fit-button" onClick={() => setReloadKey((current) => current + 1)} type="button">
            Refresh
          </button>
          <button className="secondary-button fit-button" disabled={isWorking} onClick={handleClearAll} type="button">
            Clear All Submissions
          </button>
        </div>
      </header>

      {message ? <p className="status-message success">{message}</p> : null}
      {error ? <p className="error-message">{error}</p> : null}

      <div className="grading-table-wrap">
        <table className="grading-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Status</th>
              <th>Score</th>
              <th>Grade</th>
              <th>Answered</th>
              <th>Submitted</th>
              <th>Work</th>
              <th>Reset</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row) => {
                const status = getRosterStatus(row.submission);
                const total = getTotalPoints(assignment, row.submission);
                return (
                  <tr key={`${row.kind}-${getStudentId(row)}`}>
                    <td>
                      {getStudentName(row)}
                      {row.kind === "demo" ? <span className="inline-badge">Demo</span> : null}
                    </td>
                    <td>
                      <span className={`status-pill ${status.className}`}>{status.label}</span>
                    </td>
                    <td>{row.submission ? `${getSubmissionScore(row.submission)} / ${total}` : "--"}</td>
                    <td>{row.submission ? `${getSubmissionPercent(row.submission)}%` : "--"}</td>
                    <td>{row.submission ? `${countAnswered(row.submission.answers)} / ${assignment.questions?.length || 0}` : "--"}</td>
                    <td>{formatDateTime(getLatestSubmittedAt(row.submission))}</td>
                    <td>
                      <button className="secondary-button fit-button" onClick={() => setOpenStudent({ id: getStudentId(row), kind: row.kind })} type="button">
                        View Work
                      </button>
                    </td>
                    <td>
                      {row.submission ? (
                        <button className="danger-button fit-button" disabled={isWorking} onClick={() => handleReset(row)} type="button">
                          Reset
                        </button>
                      ) : (
                        "--"
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="8">No roster students yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {activeRow ? (
        <EnglishWorkDetail
          assignment={assignment}
          onClose={() => setOpenStudent(null)}
          role={role}
          row={activeRow}
          school={school}
          section={section}
          user={user}
        />
      ) : null}
    </section>
  );
}

export default function EnglishAssignmentEngine({
  actorUser = null,
  canAssign = false,
  previewMode = false,
  role,
  school,
  section,
  testMode = false,
  user,
}) {
  const [showBuilder, setShowBuilder] = useState(false);
  const [gradingAssignment, setGradingAssignment] = useState(null);

  if (canAssign && gradingAssignment && !testMode && !previewMode) {
    return (
      <EnglishRosterGradingView
        assignment={gradingAssignment}
        onBack={() => setGradingAssignment(null)}
        role={role}
        school={school}
        section={section}
        user={user}
      />
    );
  }

  if (canAssign && !previewMode && !testMode) {
    return (
      <>
        <section className="assignment-setup-launch">
          <button className="primary-button fit-button" onClick={() => setShowBuilder((current) => !current)} type="button">
            {showBuilder ? "Hide Manual Assignment Builder" : "Manually Create a New Assignment"}
          </button>
        </section>
        {showBuilder ? <EnglishAssignmentBuilder role={role} school={school} section={section} user={user} /> : null}
        <AssignedEnglishWork onGrade={setGradingAssignment} role={role} school={school} section={section} user={user} />
      </>
    );
  }

  return (
    <AssignedEnglishWork
      actorUser={actorUser}
      previewMode={previewMode}
      role={role}
      school={school}
      section={section}
      testMode={testMode}
      user={user}
    />
  );
}
