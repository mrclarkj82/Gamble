import { useEffect, useMemo, useState } from "react";
import {
  ENGLISH_UNIT_1_ID,
  englishUnit1AssignmentTemplates,
  englishUnit1Pilot,
  englishUnit1Texts,
} from "../data/englishUnit1Pilot";
import EnglishAssignmentEngine from "./EnglishAssignmentEngine";
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
import { subscribeSectionRoster } from "../services/sections";

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

function getText(textId) {
  return englishUnit1Texts.find((text) => text.textId === textId);
}

function getTemplate(templateId) {
  return englishUnit1AssignmentTemplates.find(
    (template) => template.assignmentTemplateId === templateId,
  );
}

function getAssignmentTemplate(assignment) {
  return getTemplate(assignment.assignmentTemplateId) || assignment;
}

function countAnswered(answers = {}) {
  return Object.values(answers).filter((answer) => String(answer || "").trim()).length;
}

function getLatestSubmittedAt(submission) {
  const attempts = Array.isArray(submission?.attempts) ? submission.attempts : [];
  return attempts.at(-1)?.submittedAt || submission?.submittedAt;
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
  return submission?.score ?? submission?.autoScore ?? 0;
}

function getSubmissionPercent(submission) {
  return submission?.gradePercent ?? submission?.percent ?? 0;
}

function getRosterStatus(submission) {
  if (!submission) return { className: "waiting", label: "Waiting" };
  if (submission.resubmissionAllowed || submission.status === "needs_revision") {
    return { className: "needs-resubmission", label: "Needs Resubmission" };
  }
  if (submission.status === "resubmitted") return { className: "resubmitted", label: "Resubmitted" };
  if (submission.status === "graded" || submission.gradedAt) return { className: "graded", label: "Graded" };
  return { className: "submitted", label: "Submitted" };
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
    submission:
      demoSubmissions.find((item) => item.demoStudentId === student.demoStudentId) || null,
  }));

  return [...realRows, ...demoRows].sort((left, right) =>
    getStudentName(left).localeCompare(getStudentName(right)),
  );
}

function TextPreview({ text }) {
  return (
    <article className="english-text-card">
      <div className="section-heading-row compact-heading">
        <div>
          <p className="eyebrow">{text.textType.replace(/_/g, " ")}</p>
          <h3>{text.title}</h3>
          <p className="helper-copy">
            {text.author} | {text.approximateWordCount} words | {text.gradeLevel}
          </p>
        </div>
        <span className="source-use-pill embeddable">Safe to Embed</span>
      </div>
      <p className="status-message success">{text.usageNote}</p>
      <div className="english-passage">
        {text.paragraphs.map((paragraph) => (
          <p key={paragraph.number}>
            <span>{paragraph.number}</span>
            {paragraph.text}
          </p>
        ))}
      </div>
    </article>
  );
}

function UnitOverview({ teacherMode = false }) {
  return (
    <section className="curriculum-library english-unit-panel">
      <div>
        <p className="eyebrow">English 1 Unit 1</p>
        <h3>{englishUnit1Pilot.title}</h3>
        <p>{englishUnit1Pilot.description}</p>
      </div>
      <dl className="detail-list assignment-detail-list">
        <div>
          <dt>Length</dt>
          <dd>{englishUnit1Pilot.suggestedWeeks} weeks</dd>
        </div>
        <div>
          <dt>Texts</dt>
          <dd>{englishUnit1Pilot.texts.length} original practice texts</dd>
        </div>
        <div>
          <dt>Lessons</dt>
          <dd>{englishUnit1Pilot.lessons.length}</dd>
        </div>
        <div>
          <dt>Assignments</dt>
          <dd>{englishUnit1Pilot.assignmentTemplates.length}</dd>
        </div>
      </dl>
      <div>
        <p className="eyebrow">Essential questions</p>
        <ul className="scope-list">
          {englishUnit1Pilot.essentialQuestions.map((question) => (
            <li key={question}>{question}</li>
          ))}
        </ul>
      </div>
      {teacherMode ? (
        <div className="tag-row">
          {englishUnit1Pilot.skills.map((skill) => (
            <span key={skill}>{skill}</span>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function TeacherAssignmentSetup({ role, school, section, user }) {
  const [templateId, setTemplateId] = useState(
    englishUnit1AssignmentTemplates[0].assignmentTemplateId,
  );
  const selectedTemplate = getTemplate(templateId);
  const [setup, setSetup] = useState({
    dueDate: "",
    feedbackSetting: "after-submit",
    maxAttempts: 1,
  });
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState("success");
  const [isSaving, setIsSaving] = useState(false);

  function updateSetup(field, value) {
    setSetup((current) => ({ ...current, [field]: value }));
  }

  async function handleAssign(event) {
    event.preventDefault();
    setMessage("");
    setIsSaving(true);

    try {
      await createEnglishSectionAssignment({
        assignmentTemplateId: templateId,
        dueDate: setup.dueDate,
        feedbackSetting: setup.feedbackSetting,
        maxAttempts: setup.maxAttempts,
        role,
        school,
        section,
        user,
      });
      setMessage(`${selectedTemplate.title} was assigned to ${section.sectionName}.`);
      setMessageTone("success");
    } catch (error) {
      console.error("English assignment creation failed", error);
      setMessage(error.message || "Unable to assign English work.");
      setMessageTone("danger");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="assignment-setup-panel">
      <div className="section-heading-row compact-heading">
        <div>
          <p className="eyebrow">Unit 1 assign work</p>
          <h3>{selectedTemplate.title}</h3>
          <p className="helper-copy">{selectedTemplate.purpose}</p>
        </div>
      </div>

      {message ? <p className={`status-message ${messageTone}`}>{message}</p> : null}

      <form className="assignment-setup-grid" onSubmit={handleAssign}>
        <label>
          Assignment
          <select onChange={(event) => setTemplateId(event.target.value)} value={templateId}>
            {englishUnit1AssignmentTemplates.map((template) => (
              <option key={template.assignmentTemplateId} value={template.assignmentTemplateId}>
                {template.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Due date
          <input
            onChange={(event) => updateSetup("dueDate", event.target.value)}
            type="date"
            value={setup.dueDate}
          />
        </label>
        <label>
          Max attempts
          <input
            max="10"
            min="1"
            onChange={(event) => updateSetup("maxAttempts", event.target.value)}
            type="number"
            value={setup.maxAttempts}
          />
        </label>
        <label>
          Feedback
          <select
            onChange={(event) => updateSetup("feedbackSetting", event.target.value)}
            value={setup.feedbackSetting}
          >
            <option value="after-submit">After submission</option>
            <option value="teacher-review">Teacher review</option>
          </select>
        </label>
        <button className="primary-button" disabled={isSaving} type="submit">
          {isSaving ? "Assigning..." : "Assign English Work"}
        </button>
      </form>

      <AssignmentPreview template={selectedTemplate} />
    </section>
  );
}

function AssignmentPreview({ template }) {
  const texts = template.textIds.map(getText).filter(Boolean);

  return (
    <section className="problem-preview-panel">
      <div>
        <p className="eyebrow">Assignment preview</p>
        <h4>{template.title}</h4>
        <p className="helper-copy">{template.instructions}</p>
      </div>
      <dl className="detail-list assignment-detail-list">
        <div>
          <dt>Type</dt>
          <dd>{template.assignmentType}</dd>
        </div>
        <div>
          <dt>Auto-grade</dt>
          <dd>{template.autoGrade ? "Partial" : "No"}</dd>
        </div>
        <div>
          <dt>Teacher Review</dt>
          <dd>{template.teacherReviewRequired ? "Required" : "No"}</dd>
        </div>
        <div>
          <dt>Questions</dt>
          <dd>{template.questions.length}</dd>
        </div>
      </dl>
      {texts.map((text) => (
        <p className="status-message success" key={text.textId}>
          {text.title}: Original Gamble-created practice text. Safe to embed.
        </p>
      ))}
      <div className="english-question-list">
        {template.questions.map((question) => (
          <article className="student-problem-card" key={question.questionId}>
            <p className="eyebrow">{question.type.replace(/_/g, " ")}</p>
            <h4>{question.prompt}</h4>
            {question.options ? (
              <ul className="scope-list">
                {question.options.map((option) => (
                  <li key={option}>{option}</li>
                ))}
              </ul>
            ) : null}
            {question.correctAnswer ? (
              <p className="answer-key">
                Answer key: <strong>{question.correctAnswer}</strong>
              </p>
            ) : (
              <p className="muted-message">Teacher reviewed written response.</p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function canSubmitAssignment(assignment, submission, previewMode = false) {
  if (previewMode || !submission) return true;
  const attemptNumber = Number(submission.attemptNumber) || 1;
  const maxAttempts = Math.max(Number(submission.maxAttempts) || 0, Number(assignment.maxAttempts) || 1, 1);
  return submission.resubmissionAllowed === true || attemptNumber < maxAttempts;
}

function EnglishQuestionInput({ answers, disabled, onAnswer, question }) {
  if (["multiple_choice", "select"].includes(question.type)) {
    return (
      <label>
        Answer
        <select
          disabled={disabled}
          onChange={(event) => onAnswer(question.questionId, event.target.value)}
          value={answers[question.questionId] || ""}
        >
          <option value="">Choose an answer</option>
          {question.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <label>
      {question.type === "annotation" ? `Note for paragraph ${question.paragraphNumber}` : "Response"}
      <textarea
        disabled={disabled}
        onChange={(event) => onAnswer(question.questionId, event.target.value)}
        placeholder="Type your response"
        value={answers[question.questionId] || ""}
      />
    </label>
  );
}

function EnglishAssignmentRunner({
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const texts = (assignment.textIds || []).map(getText).filter(Boolean);

  useEffect(() => {
    if (previewMode) {
      setSubmission(null);
      return undefined;
    }

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
    if (submission?.answers) setAnswers(submission.answers);
  }, [submission]);

  useEffect(() => {
    if (previewMode) return;
    recordEnglishAssignmentOpened({
      actorUser,
      assignment,
      role,
      school,
      section,
      testMode,
      user,
    }).catch((error) => console.warn("English assignment open progress failed", error));
  }, [actorUser, assignment, previewMode, role, school, section, testMode, user]);

  function updateAnswer(questionId, value) {
    setAnswers((current) => ({ ...current, [questionId]: value }));
  }

  useEffect(() => {
    if (previewMode || !assignment || !user || !Object.keys(answers).length) {
      return undefined;
    }

    if (submission && !canSubmitAssignment(assignment, submission, previewMode)) {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      recordEnglishAnswerProgress({
        actorUser,
        answers,
        assignment,
        role,
        school,
        section,
        testMode,
        user,
      }).catch((error) => console.warn("English answer progress failed", error));
    }, 1200);

    return () => window.clearTimeout(timeout);
  }, [
    actorUser,
    answers,
    assignment,
    previewMode,
    role,
    school,
    section,
    submission,
    testMode,
    user,
  ]);

  async function handleSubmit() {
    setMessage("");
    setMessageTone("success");
    setIsSubmitting(true);

    const grading = gradeEnglishAnswers(assignment, answers);

    if (previewMode) {
      setDemoResult(grading);
      setPreviewCheckCount((current) => current + 1);
      setMessage("Preview checked. Answers were scored locally and were not saved.");
      setMessageTone("success");
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
        setMessageTone("success");
      } else {
        await submitEnglishAssignmentWork({
          answers,
          assignment,
          role,
          school,
          section,
          user,
        });
        setMessage("Submitted. Your teacher will review any written responses.");
        setMessageTone("success");
      }
    } catch (error) {
      console.error("English submission failed", error);
      setMessage(
        error.message ||
          "Unable to submit English work. Please refresh the assignment and try again.",
      );
      setMessageTone("danger");
    } finally {
      setIsSubmitting(false);
    }
  }

  const canSubmit = canSubmitAssignment(assignment, submission, previewMode);
  const inputDisabled = !previewMode && Boolean(submission) && !canSubmit;

  return (
    <section className="student-work-runner english-runner">
      <div className="section-heading-row">
        <div>
          <p className="eyebrow">{assignment.assignmentType}</p>
          <h3>{assignment.title}</h3>
          <p className="helper-copy">{assignment.directions}</p>
        </div>
        <button className="secondary-button fit-button" onClick={onBack} type="button">
          Back to English work
        </button>
      </div>

      {previewMode ? (
        <p className="preview-mode-banner">
          Student Preview - answers are not saved. Use Test as Student from the
          demo roster when you want to save a demo submission.
        </p>
      ) : null}
      {testMode ? (
        <p className="test-mode-banner">
          Teacher Test Mode - Testing as {user.displayName}. Demo English submissions
          are saved as test data.
        </p>
      ) : null}
      {submission?.resubmissionAllowed ? (
        <p className="status-message success">Your teacher has allowed a resubmission.</p>
      ) : null}

      <dl className="detail-list assignment-detail-list">
        <div>
          <dt>Unit</dt>
          <dd>Close Reading Foundations</dd>
        </div>
        <div>
          <dt>Due</dt>
          <dd>{formatDate(assignment.dueDate)}</dd>
        </div>
        <div>
          <dt>Max attempts</dt>
          <dd>{assignment.maxAttempts || 1}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{submission?.status || (previewMode ? "Preview only" : "Assigned")}</dd>
        </div>
      </dl>

      {submission ? (
        <section className="grade-summary-panel">
          <p className="eyebrow">Submission result</p>
          <h4>
            {getSubmissionScore(submission)} / {submission.problemCount} (
            {getSubmissionPercent(submission)}%)
          </h4>
          <p className="helper-copy">
            {submission.teacherReviewRequired
              ? "This assignment includes written responses that need teacher review."
              : "Auto-graded score shown."}
          </p>
          <p className="muted-message">{submission.feedback || "No feedback yet."}</p>
        </section>
      ) : null}
      {texts.map((text) => (
        <TextPreview key={text.textId} text={text} />
      ))}

      <div className="english-question-list">
        {(assignment.questions || []).map((question, index) => (
          <article className="student-problem-card english-question-card" key={question.questionId}>
            <p className="eyebrow">Question {index + 1}</p>
            <h4>{question.prompt}</h4>
            <EnglishQuestionInput
              answers={answers}
              disabled={inputDisabled}
              onAnswer={updateAnswer}
              question={question}
            />
          </article>
        ))}
      </div>

      <div className="submission-action-panel">
        <button
          className="primary-button submit-work-button"
          disabled={isSubmitting || (!previewMode && Boolean(submission) && !canSubmit)}
          onClick={handleSubmit}
          type="button"
        >
          {isSubmitting
            ? "Submitting..."
            : previewMode
              ? "Check Preview Answers"
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
            Preview check {previewCheckCount}: auto-score {demoResult.autoScore} /{" "}
            {demoResult.autoPossible}. No Firestore submission was created.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function AssignedEnglishWork({ actorUser = null, previewMode = false, role, school, section, testMode = false, user }) {
  const [assignments, setAssignments] = useState([]);
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

  if (openAssignment) {
    return (
      <EnglishAssignmentRunner
        actorUser={actorUser}
        assignment={openAssignment}
        onBack={() => setOpenAssignment(null)}
        previewMode={previewMode}
        role={role}
        school={school}
        section={section}
        testMode={testMode}
        user={user}
      />
    );
  }

  return (
    <section className="assigned-work-panel">
      <div className="section-heading-row compact-heading">
        <div>
          <p className="eyebrow">{previewMode ? "Student Preview" : testMode ? "Teacher Test Mode" : "Assigned English work"}</p>
          <h3>Unit 1 Work</h3>
          <p className="helper-copy">
            {previewMode
              ? "Preview uses the same assigned work list students read. Answers are not saved."
              : "Students open Unit 1 assignments here when they are assigned."}
          </p>
        </div>
      </div>

      {error ? <p className="error-message">{error}</p> : null}
      {isLoading ? (
        <p className="muted-message">Loading English assignments...</p>
      ) : assignments.length ? (
        <div className="section-card-grid">
          {assignments.map((assignment) => (
            <article className="mini-card" key={assignment.assignmentId}>
              <p className="eyebrow">{assignment.assignmentType}</p>
              <h3>{assignment.title}</h3>
              <p>{assignment.directions}</p>
              <dl className="detail-list assignment-detail-list">
                <div>
                  <dt>Due</dt>
                  <dd>{formatDate(assignment.dueDate)}</dd>
                </div>
                <div>
                  <dt>Questions</dt>
                  <dd>{assignment.questions?.length || assignment.problemCount || "--"}</dd>
                </div>
              </dl>
              <button
                className="secondary-button fit-button"
                onClick={() => setOpenAssignment(assignment)}
                type="button"
              >
                {previewMode ? "Open Preview" : testMode ? "Open As Test Student" : "Open Assignment"}
              </button>
            </article>
          ))}
        </div>
      ) : (
        <p className="muted-message">
          No English 1 assignments have been assigned for this section yet.
        </p>
      )}
    </section>
  );
}

function TeacherAssignedEnglishWork({ onGrade, school, section }) {
  const [assignments, setAssignments] = useState([]);
  const [submissionsByAssignment, setSubmissionsByAssignment] = useState({});

  useEffect(() => {
    if (!school || !section) return undefined;
    return subscribeEnglishAssignments(
      school,
      section,
      setAssignments,
      (error) => console.error("Teacher English assignments failed to load", error),
    );
  }, [school, section]);

  useEffect(() => {
    if (!school || !section || !assignments.length) {
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
  }, [assignments, school, section]);

  return (
    <section className="assigned-work-panel">
      <div>
        <p className="eyebrow">Assigned work</p>
        <h3>Unit 1 English Assignments</h3>
      </div>

      {assignments.length ? (
        <div className="assigned-work-list">
          {assignments.map((assignment) => {
            const counts = submissionsByAssignment[assignment.assignmentId] || {};
            const doneCount = (counts.real || 0) + (counts.demo || 0);

            return (
              <article className="assigned-work-row" key={assignment.assignmentId}>
                <div>
                  <p className="eyebrow">{assignment.assignmentType}</p>
                  <h3>{assignment.title}</h3>
                </div>
                <div>
                  <span>Done</span>
                  <strong>{doneCount}</strong>
                </div>
                <button
                  className="secondary-button fit-button"
                  onClick={() => onGrade(assignment)}
                  type="button"
                >
                  Grade Assignment
                </button>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="muted-message">No English 1 assignments have been assigned for this section yet.</p>
      )}
    </section>
  );
}

function EnglishWorkDetail({ assignment, onClose, role, row, school, section, user }) {
  const submission = row.submission;
  const [feedback, setFeedback] = useState(submission?.feedback || "");
  const [score, setScore] = useState(submission?.score ?? submission?.autoScore ?? 0);
  const [resubmissionDueDate, setResubmissionDueDate] = useState(submission?.resubmissionDueDate || "");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const status = getRosterStatus(submission);

  useEffect(() => {
    setFeedback(submission?.feedback || "");
    setScore(submission?.score ?? submission?.autoScore ?? 0);
    setResubmissionDueDate(submission?.resubmissionDueDate || "");
  }, [submission]);

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
            <p className="eyebrow">{assignment.title}</p>
            <h2>
              {getStudentName(row)}
              {row.kind === "demo" ? <span className="inline-badge">Demo</span> : null}
            </h2>
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

        {!submission ? (
          <p className="muted-message">This student has not submitted this English assignment yet.</p>
        ) : (
          <>
            {submission.teacherReviewRequired ? (
              <p className="status-message danger">
                This assignment includes written responses that need teacher review.
              </p>
            ) : null}
            <section className="grading-controls">
              <label className="review-field">
                Score
                <input
                  max={submission.problemCount || 100}
                  min="0"
                  onChange={(event) => setScore(event.target.value)}
                  type="number"
                  value={score}
                />
              </label>
              <label className="review-field">
                Feedback
                <textarea
                  onChange={(event) => setFeedback(event.target.value)}
                  placeholder="Feedback for this student"
                  value={feedback}
                />
              </label>
              <label className="review-field">
                Resubmission due date
                <input
                  onChange={(event) => setResubmissionDueDate(event.target.value)}
                  type="date"
                  value={resubmissionDueDate}
                />
              </label>
              {message ? <p className="status-message success">{message}</p> : null}
              <div className="button-row">
                <button
                  className="secondary-button fit-button"
                  disabled={isSaving}
                  onClick={() => handleReview(false)}
                  type="button"
                >
                  Save Grade
                </button>
                <button
                  className="primary-button fit-button"
                  disabled={isSaving}
                  onClick={() => handleReview(true)}
                  type="button"
                >
                  Allow Resubmission
                </button>
              </div>
            </section>

            <div className="english-question-list">
              {(assignment.questions || []).map((question, index) => {
                const answer = submission.answers?.[question.questionId] || "";
                const isAuto = ["multiple_choice", "select"].includes(question.type);
                const isCorrect = isAuto && answer === question.correctAnswer;

                return (
                  <article className="student-problem-card" key={question.questionId}>
                    <p className="eyebrow">Question {index + 1}</p>
                    <h4>{question.prompt}</h4>
                    <p>
                      <strong>Student answer:</strong> {answer || "--"}
                    </p>
                    {isAuto ? (
                      <p className={`answer-result ${isCorrect ? "correct" : "incorrect"}`}>
                        Correct answer: {question.correctAnswer}
                      </p>
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
  const activeRow = rows.find(
    (row) => openStudent && row.kind === openStudent.kind && getStudentId(row) === openStudent.id,
  );

  async function handleClearAll() {
    const response = window.prompt(
      "Clear all submissions for this assignment? This cannot be undone.\n\nType CLEAR to continue.",
    );
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
                const total = row.submission?.problemCount || assignment.questions?.length || 0;
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
                      <button
                        className="secondary-button fit-button"
                        onClick={() => setOpenStudent({ id: getStudentId(row), kind: row.kind })}
                        type="button"
                      >
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

export default function EnglishUnit1PilotView({
  actorUser = null,
  canAssign = false,
  onExitTestMode,
  previewMode = false,
  role,
  school,
  section,
  studentMode = false,
  testMode = false,
  user,
}) {
  const [showSetup, setShowSetup] = useState(false);
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

  return (
    <>
      {testMode ? (
        <p className="test-mode-banner">
          Teacher Test Mode - Testing as {user.displayName}. Demo English activity
          is saved as test data.
          {onExitTestMode ? (
            <button className="secondary-button fit-button" onClick={onExitTestMode} type="button">
              Exit Test Mode
            </button>
          ) : null}
        </p>
      ) : null}

      <UnitOverview teacherMode={!studentMode || previewMode || testMode} />

      {!studentMode || previewMode || testMode ? (
        <section className="curriculum-library english-unit-panel">
          <div>
            <p className="eyebrow">Original texts</p>
            <h3>Copyright-Safe Practice Texts</h3>
          </div>
          <div className="english-text-list">
            {englishUnit1Texts.map((text) => (
              <TextPreview key={text.textId} text={text} />
            ))}
          </div>
        </section>
      ) : null}

      {canAssign && !previewMode && !testMode ? (
        <EnglishAssignmentEngine
          canAssign
          role={role}
          school={school}
          section={section}
          user={user}
        />
      ) : (
        <EnglishAssignmentEngine
          actorUser={actorUser}
          previewMode={previewMode}
          role={role}
          school={school}
          section={section}
          testMode={testMode}
          user={user}
        />
      )}

      {!studentMode && !previewMode && !testMode ? (
        <section className="curriculum-library english-unit-panel">
          <div>
            <p className="eyebrow">Pilot lessons</p>
            <h3>Five-Lesson Sequence</h3>
          </div>
          <div className="scope-lesson-list">
            {englishUnit1Pilot.lessons.map((lesson) => (
              <article className="scope-lesson-row" key={lesson.lessonId}>
                <h4>{lesson.title}</h4>
                <p>{lesson.objective}</p>
                <ul className="scope-list">
                  {lesson.activities.map((activity) => (
                    <li key={activity}>{activity}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
