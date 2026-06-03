import { useEffect, useMemo, useState } from "react";
import {
  clearAssignmentSubmissions,
  createSectionAssignment,
  recordAssignmentAnswerProgress,
  recordAssignmentOpened,
  reviewAssignmentSubmission,
  resetAssignmentSubmission,
  submitDemoAssignmentWork,
  submitAssignmentWork,
  subscribeDemoAssignmentSubmissions,
  subscribeDemoStudentSubmission,
  subscribeAssignmentSubmissions,
  subscribeAssignmentProgress,
  subscribeSectionAssignments,
  subscribeStudentSubmission,
} from "../services/assignments";
import { subscribeDemoStudents } from "../services/demoRoster";
import { subscribeSectionRoster } from "../services/sections";
import {
  formatExpectedAnswer,
  formatProblemPrompt,
  generateProblemSet,
  getMathAssignmentType,
  gradeAnswer,
  mathAssignmentTypes,
} from "../services/mathProblems";

function formatDate(value) {
  if (value && typeof value.toDate === "function") {
    return value.toDate().toLocaleDateString();
  }

  return value || "No due date";
}

function formatFeedback(value) {
  return value === "immediate" ? "Immediate" : "After submit";
}

function formatTimeLimit(value) {
  const minutes = Number(value) || 0;
  return minutes > 0 ? `${minutes} minutes` : "None";
}

function getAssignmentStatus(assignment, submission, previewMode = false) {
  if (previewMode) return "Preview only";
  if (submission?.resubmissionAllowed) return "Resubmission open";
  if (submission) return "Submitted";
  return assignment.active === false ? "Inactive" : "Assigned";
}

function getSubmissionScore(submission) {
  return submission?.score ?? submission?.correctCount ?? 0;
}

function getSubmissionPercent(submission) {
  return submission?.gradePercent ?? submission?.percent ?? 0;
}

function canSubmitAssignment(assignment, submission, previewMode = false) {
  if (previewMode || !submission) return true;

  const attemptNumber = Number(submission.attemptNumber) || 1;
  const maxAttempts = Math.max(
    Number(submission.maxAttempts) || 0,
    Number(assignment.maxAttempts) || 1,
    1,
  );

  return submission.resubmissionAllowed === true || attemptNumber < maxAttempts;
}

function ProblemPrompt({ problem }) {
  if (Array.isArray(problem.prompt)) {
    return (
      <div className="stacked-equations">
        {problem.prompt.map((line) => (
          <span key={line}>{line}</span>
        ))}
      </div>
    );
  }

  return <span>{formatProblemPrompt(problem)}</span>;
}

function AssignmentMeta({ assignment, previewMode = false, submission = null }) {
  return (
    <dl className="detail-list assignment-detail-list">
      {assignment.courseName || assignment.course ? (
        <div>
          <dt>Course</dt>
          <dd>{assignment.courseName || assignment.course}</dd>
        </div>
      ) : null}
      {assignment.curriculumSubject || assignment.subject ? (
        <div>
          <dt>Subject</dt>
          <dd>{assignment.curriculumSubject || assignment.subject}</dd>
        </div>
      ) : null}
      <div>
        <dt>Work type</dt>
        <dd>{getMathAssignmentType(assignment.assignmentType).title}</dd>
      </div>
      <div>
        <dt>Due</dt>
        <dd>{formatDate(assignment.dueDate)}</dd>
      </div>
      <div>
        <dt>Problems</dt>
        <dd>{assignment.problemCount}</dd>
      </div>
      <div>
        <dt>Max attempts</dt>
        <dd>{assignment.maxAttempts || 1}</dd>
      </div>
      <div>
        <dt>Feedback</dt>
        <dd>{formatFeedback(assignment.feedbackMode)}</dd>
      </div>
      <div>
        <dt>Time limit</dt>
        <dd>{formatTimeLimit(assignment.timeLimitMinutes)}</dd>
      </div>
      <div>
        <dt>Status</dt>
        <dd>{getAssignmentStatus(assignment, submission, previewMode)}</dd>
      </div>
    </dl>
  );
}

function TeacherAssignmentSetup({ role, school, section, user }) {
  const [selectedTypeId, setSelectedTypeId] = useState(mathAssignmentTypes[0].assignmentType);
  const selectedType = useMemo(() => getMathAssignmentType(selectedTypeId), [selectedTypeId]);
  const [setup, setSetup] = useState({
    title: selectedType.title,
    problemCount: selectedType.defaultProblemCount,
    dueDate: "",
    feedbackMode: "after-submit",
    maxAttempts: 1,
    timeLimitMinutes: 0,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState("success");
  const previewProblems = useMemo(
    () =>
      generateProblemSet({
        assignmentType: selectedType.assignmentType,
        problemCount: Math.min(Number(setup.problemCount) || 5, 5),
        seed: `${section?.sectionId || section?.id}:${selectedType.assignmentType}:preview`,
      }),
    [section, selectedType, setup.problemCount],
  );

  useEffect(() => {
    setSetup((current) => ({
      ...current,
      title: current.title === selectedType.title ? current.title : selectedType.title,
      problemCount: selectedType.defaultProblemCount,
    }));
  }, [selectedType]);

  function updateSetup(field, value) {
    setSetup((current) => ({ ...current, [field]: value }));
  }

  async function handleAssign(event) {
    event.preventDefault();
    setMessage("");
    setIsSaving(true);

    try {
      await createSectionAssignment({
        assignmentType: selectedType.assignmentType,
        directions: selectedType.directions,
        dueDate: setup.dueDate,
        feedbackMode: setup.feedbackMode,
        maxAttempts: setup.maxAttempts,
        problemCount: setup.problemCount,
        role,
        school,
        section,
        timeLimitMinutes: setup.timeLimitMinutes,
        title: setup.title,
        user,
      });
      setMessage(`${setup.title} was assigned to ${section.sectionName}.`);
      setMessageTone("success");
    } catch (error) {
      console.error("Assignment creation failed", error);
      setMessage(error.message || "Unable to assign work.");
      setMessageTone("danger");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="assignment-setup-panel">
      <div className="section-heading-row compact-heading">
        <div>
          <p className="eyebrow">Assignment setup</p>
          <h3>{selectedType.title}</h3>
          <p className="helper-copy">{selectedType.directions}</p>
        </div>
      </div>

      {message ? <p className={`status-message ${messageTone}`}>{message}</p> : null}

      <form className="assignment-setup-grid" onSubmit={handleAssign}>
        <label>
          Work type
          <select
            onChange={(event) => setSelectedTypeId(event.target.value)}
            value={selectedTypeId}
          >
            {mathAssignmentTypes.map((type) => (
              <option key={type.assignmentType} value={type.assignmentType}>
                {type.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Assignment title
          <input
            onChange={(event) => updateSetup("title", event.target.value)}
            value={setup.title}
          />
        </label>
        <label>
          Problems
          <input
            max="60"
            min="1"
            onChange={(event) => updateSetup("problemCount", event.target.value)}
            type="number"
            value={setup.problemCount}
          />
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
          Feedback
          <select
            onChange={(event) => updateSetup("feedbackMode", event.target.value)}
            value={setup.feedbackMode}
          >
            <option value="after-submit">After submission</option>
            <option value="immediate">Immediate</option>
          </select>
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
          Time limit minutes
          <input
            max="180"
            min="0"
            onChange={(event) => updateSetup("timeLimitMinutes", event.target.value)}
            type="number"
            value={setup.timeLimitMinutes}
          />
        </label>
        <button className="primary-button" disabled={isSaving} type="submit">
          {isSaving ? "Assigning..." : "Assign Work To Section"}
        </button>
      </form>

      <section className="problem-preview-panel">
        <div>
          <p className="eyebrow">Problem preview</p>
          <h4>First {previewProblems.length} generated problems</h4>
        </div>
        <div className="problem-preview-list">
          {previewProblems.map((problem) => (
            <article className="problem-preview-card" key={problem.id}>
              <p className="eyebrow">Problem {problem.number}</p>
              <div className="problem-prompt">
                <ProblemPrompt problem={problem} />
              </div>
              <p className="answer-key">
                Answer: <strong>{formatExpectedAnswer(problem)}</strong>
              </p>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

function formatDateTime(value) {
  if (!value) return "--";
  if (value && typeof value.toDate === "function") {
    return value.toDate().toLocaleString();
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "--" : date.toLocaleString();
}

function timestampToDate(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatRelativeTime(value, now = Date.now()) {
  const date = timestampToDate(value);
  if (!date) return "--";

  const diffMs = Math.max(0, now - date.getTime());
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes === 1) return "1 min ago";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours === 1) return "1 hr ago";
  if (diffHours < 24) return `${diffHours} hr ago`;

  return date.toLocaleDateString();
}

function getLatestSubmittedAt(submission) {
  const attempts = Array.isArray(submission?.attempts) ? submission.attempts : [];
  return attempts.at(-1)?.submittedAt || submission?.submittedAt;
}

function getAnsweredCount(submission) {
  if (!submission?.answers) return 0;
  return Object.values(submission.answers).filter((answer) => String(answer || "").trim())
    .length;
}

function getRosterStatus(submission) {
  if (!submission) return { className: "waiting", label: "Waiting" };
  if (submission.resubmissionAllowed || submission.status === "needs_revision") {
    return { className: "needs-resubmission", label: "Needs Resubmission" };
  }
  if (submission.status === "resubmitted") {
    return { className: "resubmitted", label: "Resubmitted" };
  }
  if (submission.status === "graded" || submission.gradedAt) {
    return { className: "graded", label: "Graded" };
  }
  if (submission.status === "submitted") {
    return { className: "submitted", label: "Submitted" };
  }
  return { className: "started", label: "Started" };
}

function getStudentId(row) {
  return row.kind === "demo" ? row.student.demoStudentId : row.student.studentUid;
}

function getStudentName(row) {
  return row.kind === "demo"
    ? row.student.displayName || "Demo Student"
    : row.student.studentName || row.student.studentEmail || "Student";
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

const INACTIVE_THRESHOLD_MS = 5 * 60 * 1000;
const LIVE_STATUS_FILTERS = [
  "All",
  "Waiting",
  "Started",
  "Working",
  "Nearly Done",
  "Inactive",
  "Submitted",
  "Graded",
  "Needs Resubmission",
  "Resubmitted",
];

function getProgressStudentId(progress) {
  return progress?.isDemo ? progress.demoStudentId : progress?.studentUid;
}

function clampPercent(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return 0;
  return Math.max(0, Math.min(100, Math.round(numericValue)));
}

function getAnsweredProgressPercent(answeredCount, problemCount, fallbackPercent = 0) {
  const totalProblems = Number(problemCount) || 0;
  if (totalProblems > 0) {
    return clampPercent((Number(answeredCount) / totalProblems) * 100);
  }

  return clampPercent(fallbackPercent);
}

function getMonitorTileStyle(progressPercent) {
  const percent = clampPercent(progressPercent);
  const hue = Math.round(percent * 1.2);

  return {
    "--monitor-bg": `hsl(${hue} 88% 94%)`,
    "--monitor-border": `hsl(${hue} 82% 78%)`,
    "--monitor-fill": `hsl(${hue} 76% 39%)`,
  };
}

function getLiveStatus({ now, progress, submission }) {
  if (submission?.resubmissionAllowed || submission?.status === "needs_revision") {
    return { className: "needs-resubmission", label: "Needs Resubmission" };
  }

  if (
    submission?.status === "resubmitted" ||
    (Number(submission?.attemptNumber) || 0) > 1
  ) {
    return { className: "resubmitted", label: "Resubmitted" };
  }

  if (submission?.status === "graded" || submission?.gradedAt) {
    return { className: "graded", label: "Graded" };
  }

  if (submission?.status === "submitted" || submission?.submittedAt) {
    return { className: "submitted", label: "Submitted" };
  }

  if (progress?.needsResubmission || progress?.status === "needs_resubmission") {
    return { className: "needs-resubmission", label: "Needs Resubmission" };
  }

  if (progress?.status === "resubmitted") {
    return { className: "resubmitted", label: "Resubmitted" };
  }

  if (progress?.status === "submitted" || progress?.submittedAt) {
    return { className: "submitted", label: "Submitted" };
  }

  const lastActivity = timestampToDate(progress?.lastActivityAt);
  const hasStarted = Boolean(progress?.openedAt || (Number(progress?.answeredCount) || 0) > 0);

  if (
    hasStarted &&
    lastActivity &&
    now - lastActivity.getTime() > INACTIVE_THRESHOLD_MS
  ) {
    return { className: "inactive", label: "Inactive" };
  }

  const answeredCount = Number(progress?.answeredCount) || 0;
  const progressPercent = Number(progress?.progressPercent) || 0;

  if (progressPercent >= 80 && answeredCount > 0) {
    return { className: "nearly-done", label: "Nearly Done" };
  }

  if (answeredCount > 0 || progress?.status === "working") {
    return { className: "working", label: "Working" };
  }

  if (progress?.openedAt || progress?.status === "started") {
    return { className: "started", label: "Started" };
  }

  return { className: "waiting", label: "Waiting" };
}

function buildLiveMonitorRows({
  demoRoster,
  demoSubmissions,
  includeDemoStudents,
  now,
  progressItems,
  roster,
  submissions,
}) {
  const activeRoster = roster.filter((student) => student.status !== "inactive");
  const activeDemoRoster = includeDemoStudents
    ? demoRoster.filter((student) => student.status !== "inactive")
    : [];
  const rows = buildRosterRows({
    demoRoster: activeDemoRoster,
    demoSubmissions,
    roster: activeRoster,
    submissions,
  });

  return rows.map((row) => {
    const studentId = getStudentId(row);
    const progress =
      progressItems.find(
        (item) => item.isDemo === (row.kind === "demo") && getProgressStudentId(item) === studentId,
      ) || null;
    const status = getLiveStatus({ now, progress, submission: row.submission });
    const problemCount =
      row.submission?.problemCount ||
      progress?.totalProblems ||
      Number(progress?.problemCount) ||
      0;
    const answeredCount = row.submission
      ? getAnsweredCount(row.submission)
      : Number(progress?.answeredCount) || 0;
    const progressPercent = getAnsweredProgressPercent(
      answeredCount,
      problemCount,
      Number(progress?.progressPercent) || 0,
    );

    return {
      ...row,
      answeredCount,
      lastActivityAt: progress?.lastActivityAt || row.submission?.updatedAt,
      problemCount,
      progress,
      progressPercent,
      status,
      submittedAt: getLatestSubmittedAt(row.submission) || progress?.submittedAt,
    };
  });
}

function StudentWorkDetail({
  assignment,
  onClose,
  role,
  row,
  school,
  section,
  user,
}) {
  const submission = row.submission;
  const [feedback, setFeedback] = useState(submission?.feedback || "");
  const [resubmissionDueDate, setResubmissionDueDate] = useState(
    submission?.resubmissionDueDate || "",
  );
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const studentName = getStudentName(row);
  const problemSeed = `${assignment.assignmentId}:${getStudentId(row)}`;
  const problems = useMemo(
    () =>
      generateProblemSet({
        assignmentType: assignment.assignmentType,
        problemCount: assignment.problemCount,
        seed: problemSeed,
      }),
    [assignment, problemSeed],
  );
  const status = getRosterStatus(submission);

  useEffect(() => {
    setFeedback(submission?.feedback || "");
    setResubmissionDueDate(submission?.resubmissionDueDate || "");
  }, [submission]);

  async function handleReview(resubmissionAllowed) {
    if (!submission) return;

    setMessage("");
    setIsSaving(true);

    try {
      await reviewAssignmentSubmission({
        actorUser: user,
        assignment,
        feedback,
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
      console.error("Submission review failed", error);
      setMessage(error.message || "Unable to update this work.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="preview-modal-backdrop" role="presentation">
      <section aria-label="Student work" className="work-detail-modal" role="dialog">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">{assignment.title}</p>
            <h2>
              {studentName}
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
            <dt>Score</dt>
            <dd>
              {submission
                ? `${getSubmissionScore(submission)} / ${
                    submission.problemCount || assignment.problemCount
                  }`
                : "--"}
            </dd>
          </div>
          <div>
            <dt>Grade</dt>
            <dd>{submission ? `${getSubmissionPercent(submission)}%` : "--"}</dd>
          </div>
          <div>
            <dt>Resubmission</dt>
            <dd>
              {submission?.resubmissionAllowed
                ? "Allowed"
                : "Not currently allowed"}
            </dd>
          </div>
        </dl>

        {!submission ? (
          <p className="muted-message">This student has not submitted this assignment yet.</p>
        ) : null}

        {submission ? (
          <section className="grading-controls">
            <label className="review-field">
              Feedback
              <textarea
                onChange={(event) => setFeedback(event.target.value)}
                placeholder="Optional feedback"
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
        ) : null}

        <div className="work-problem-table-wrap">
          <table className="work-problem-table">
            <thead>
              <tr>
                <th>Problem</th>
                <th>Student Answer</th>
                <th>Correct Answer</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {problems.map((problem) => {
                const answer = submission?.answers?.[problem.id] || "";
                const hasAnswer = Boolean(String(answer).trim());
                const isCorrect = hasAnswer && gradeAnswer(problem, answer);

                return (
                  <tr key={problem.id}>
                    <td>
                      <span className="problem-number">#{problem.number}</span>
                      <div className="problem-prompt">
                        <ProblemPrompt problem={problem} />
                      </div>
                    </td>
                    <td>{hasAnswer ? answer : "--"}</td>
                    <td>{formatExpectedAnswer(problem)}</td>
                    <td>
                      {hasAnswer ? (
                        <span
                          className={`answer-result ${isCorrect ? "correct" : "incorrect"}`}
                        >
                          {isCorrect ? "Correct" : "Incorrect"}
                        </span>
                      ) : (
                        "--"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function AssignmentRosterGradingView({ assignment, onBack, role, school, section, user }) {
  const [roster, setRoster] = useState([]);
  const [demoRoster, setDemoRoster] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [demoSubmissions, setDemoSubmissions] = useState([]);
  const [openStudent, setOpenStudent] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isWorking, setIsWorking] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const sectionId = section?.sectionId || section?.id;

  useEffect(() => {
    if (!school || !sectionId) return undefined;

    return subscribeSectionRoster(
      school,
      sectionId,
      (students) => {
        setRoster(students);
        setError("");
      },
      (loadError) => {
        console.error("Roster failed to load", loadError);
        setError("Unable to load roster.");
      },
    );
  }, [reloadKey, school, sectionId]);

  useEffect(() => {
    if (!school || !section) return undefined;

    return subscribeDemoStudents(
      school,
      section,
      (students) => {
        setDemoRoster(students);
        setError("");
      },
      (loadError) => {
        console.error("Demo roster failed to load", loadError);
        setError("Unable to load demo roster.");
      },
    );
  }, [reloadKey, school, section]);

  useEffect(() => {
    if (!school || !section || !assignment?.assignmentId) return undefined;

    return subscribeAssignmentSubmissions(
      school,
      section,
      assignment.assignmentId,
      (nextSubmissions) => {
        setSubmissions(nextSubmissions);
        setError("");
      },
      (loadError) => {
        console.error("Submissions failed to load", loadError);
        setError("Unable to load submissions.");
      },
    );
  }, [assignment, reloadKey, school, section]);

  useEffect(() => {
    if (!school || !section || !assignment?.assignmentId) return undefined;

    return subscribeDemoAssignmentSubmissions(
      school,
      section,
      assignment.assignmentId,
      (nextSubmissions) => {
        setDemoSubmissions(nextSubmissions);
        setError("");
      },
      (loadError) => {
        console.error("Demo submissions failed to load", loadError);
        setError("Unable to load demo submissions.");
      },
    );
  }, [assignment, reloadKey, school, section]);

  const rows = useMemo(
    () => buildRosterRows({ demoRoster, demoSubmissions, roster, submissions }),
    [demoRoster, demoSubmissions, roster, submissions],
  );
  const activeRow = rows.find(
    (row) => openStudent && row.kind === openStudent.kind && getStudentId(row) === openStudent.id,
  );

  function handleRefresh() {
    setMessage("");
    setReloadKey((current) => current + 1);
  }

  async function handleClearAll() {
    const response = window.prompt(
      "Clear all submissions for this assignment? This cannot be undone.\n\nType CLEAR to continue.",
    );

    if (response !== "CLEAR") return;

    setIsWorking(true);
    setMessage("");
    setError("");

    try {
      await clearAssignmentSubmissions({
        actorUser: user,
        assignment,
        role,
        school,
        section,
      });
      setMessage("All submissions for this assignment were cleared.");
      setReloadKey((current) => current + 1);
    } catch (clearError) {
      console.error("Clear submissions failed", clearError);
      setError(clearError.message || "Unable to clear submissions.");
    } finally {
      setIsWorking(false);
    }
  }

  async function handleReset(row) {
    const confirmed = window.confirm(`Reset ${getStudentName(row)} for this assignment?`);
    if (!confirmed) return;

    setIsWorking(true);
    setMessage("");
    setError("");

    try {
      await resetAssignmentSubmission({
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
      console.error("Reset submission failed", resetError);
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
          <button className="secondary-button fit-button" onClick={handleRefresh} type="button">
            Refresh
          </button>
          <button
            className="secondary-button fit-button"
            disabled={isWorking}
            onClick={handleClearAll}
            type="button"
          >
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
                const problemCount =
                  row.submission?.problemCount || assignment.problemCount || 0;
                const answered = row.submission
                  ? `${getAnsweredCount(row.submission)} / ${problemCount}`
                  : "--";

                return (
                  <tr key={`${row.kind}-${getStudentId(row)}`}>
                    <td>
                      {getStudentName(row)}
                      {row.kind === "demo" ? <span className="inline-badge">Demo</span> : null}
                    </td>
                    <td>
                      <span className={`status-pill ${status.className}`}>
                        {status.label}
                      </span>
                    </td>
                    <td>
                      {row.submission
                        ? `${getSubmissionScore(row.submission)} / ${problemCount}`
                        : "--"}
                    </td>
                    <td>{row.submission ? `${getSubmissionPercent(row.submission)}%` : "--"}</td>
                    <td>{answered}</td>
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
                        <button
                          className="danger-button fit-button"
                          disabled={isWorking}
                          onClick={() => handleReset(row)}
                          type="button"
                        >
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
        <StudentWorkDetail
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

function LiveMonitorView({ onBack, role, school, section, user }) {
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [roster, setRoster] = useState([]);
  const [demoRoster, setDemoRoster] = useState([]);
  const [progressItems, setProgressItems] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [demoSubmissions, setDemoSubmissions] = useState([]);
  const [includeDemoStudents, setIncludeDemoStudents] = useState(true);
  const [statusFilter, setStatusFilter] = useState("All");
  const [openStudent, setOpenStudent] = useState(null);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [now, setNow] = useState(Date.now());
  const sectionId = section?.sectionId || section?.id;
  const selectedAssignment = assignments.find(
    (assignment) => assignment.assignmentId === selectedAssignmentId,
  );

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!school || !section) return undefined;

    return subscribeSectionAssignments(
      school,
      section,
      (nextAssignments) => {
        setAssignments(nextAssignments);
        setError("");
      },
      (loadError) => {
        console.error("Live monitor assignments failed to load", loadError);
        setError("Live Monitor unavailable: you do not have access to this section.");
      },
    );
  }, [reloadKey, school, section]);

  useEffect(() => {
    if (!school || !sectionId) return undefined;

    return subscribeSectionRoster(
      school,
      sectionId,
      (students) => {
        setRoster(students);
        setError("");
      },
      (loadError) => {
        console.error("Live monitor roster failed to load", loadError);
        setError("Live Monitor unavailable: you do not have access to this section.");
      },
    );
  }, [reloadKey, school, sectionId]);

  useEffect(() => {
    if (!school || !section) return undefined;

    return subscribeDemoStudents(
      school,
      section,
      (students) => {
        setDemoRoster(students);
        setError("");
      },
      (loadError) => {
        console.error("Live monitor demo roster failed to load", loadError);
        setError("Live Monitor unavailable: you do not have access to this section.");
      },
    );
  }, [reloadKey, school, section]);

  useEffect(() => {
    setOpenStudent(null);
    setProgressItems([]);
    setSubmissions([]);
    setDemoSubmissions([]);
  }, [selectedAssignmentId]);

  useEffect(() => {
    if (!school || !section || !selectedAssignmentId) return undefined;

    return subscribeAssignmentProgress(
      school,
      section,
      selectedAssignmentId,
      (items) => {
        setProgressItems(items);
        setError("");
      },
      (loadError) => {
        console.error("Live monitor progress failed to load", loadError);
        setError("Live Monitor unavailable: you do not have access to this section.");
      },
    );
  }, [reloadKey, school, section, selectedAssignmentId]);

  useEffect(() => {
    if (!school || !section || !selectedAssignmentId) return undefined;

    return subscribeAssignmentSubmissions(
      school,
      section,
      selectedAssignmentId,
      (items) => {
        setSubmissions(items);
        setError("");
      },
      (loadError) => {
        console.error("Live monitor submissions failed to load", loadError);
        setError("Live Monitor unavailable: you do not have access to this section.");
      },
    );
  }, [reloadKey, school, section, selectedAssignmentId]);

  useEffect(() => {
    if (!school || !section || !selectedAssignmentId) return undefined;

    return subscribeDemoAssignmentSubmissions(
      school,
      section,
      selectedAssignmentId,
      (items) => {
        setDemoSubmissions(items);
        setError("");
      },
      (loadError) => {
        console.error("Live monitor demo submissions failed to load", loadError);
        setError("Live Monitor unavailable: you do not have access to this section.");
      },
    );
  }, [reloadKey, school, section, selectedAssignmentId]);

  const rows = useMemo(
    () =>
      selectedAssignment
        ? buildLiveMonitorRows({
            demoRoster,
            demoSubmissions,
            includeDemoStudents,
            now,
            progressItems,
            roster,
            submissions,
          })
        : [],
    [
      demoRoster,
      demoSubmissions,
      includeDemoStudents,
      now,
      progressItems,
      roster,
      selectedAssignment,
      submissions,
    ],
  );
  const filteredRows = useMemo(
    () =>
      statusFilter === "All"
        ? rows
        : rows.filter((row) => row.status.label === statusFilter),
    [rows, statusFilter],
  );
  const summaryCounts = useMemo(
    () =>
      rows.reduce((counts, row) => {
        counts[row.status.label] = (counts[row.status.label] || 0) + 1;
        return counts;
      }, {}),
    [rows],
  );
  const activeRow = rows.find(
    (row) => openStudent && row.kind === openStudent.kind && getStudentId(row) === openStudent.id,
  );

  function handleRefresh() {
    setNow(Date.now());
    setReloadKey((current) => current + 1);
  }

  return (
    <section className="grading-roster-card live-monitor-card">
      <header className="grading-roster-header">
        <div>
          <button className="grading-back-button" onClick={onBack} type="button">
            Back to section
          </button>
          <p className="eyebrow">{section.sectionName}</p>
          <h2>Live Monitor</h2>
        </div>
        <div className="button-row">
          <button className="secondary-button fit-button" onClick={handleRefresh} type="button">
            Refresh
          </button>
        </div>
      </header>

      {error ? <p className="error-message">{error}</p> : null}

      <section className="live-monitor-toolbar">
        <label>
          Assignment
          <select
            onChange={(event) => setSelectedAssignmentId(event.target.value)}
            value={selectedAssignmentId}
          >
            <option value="">Choose assignment</option>
            {assignments.map((assignment) => (
              <option key={assignment.assignmentId} value={assignment.assignmentId}>
                {assignment.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select
            onChange={(event) => setStatusFilter(event.target.value)}
            value={statusFilter}
          >
            {LIVE_STATUS_FILTERS.map((filter) => (
              <option key={filter} value={filter}>
                {filter}
              </option>
            ))}
          </select>
        </label>
        <label className="monitor-toggle">
          <input
            checked={includeDemoStudents}
            onChange={(event) => setIncludeDemoStudents(event.target.checked)}
            type="checkbox"
          />
          Show Demo Students
        </label>
      </section>

      {!assignments.length ? (
        <p className="muted-message">
          No Math assignments have been assigned to this section yet.
        </p>
      ) : null}

      {selectedAssignment ? (
        <>
          <dl className="detail-list assignment-detail-list live-assignment-meta">
            <div>
              <dt>Work type</dt>
              <dd>{getMathAssignmentType(selectedAssignment.assignmentType).title}</dd>
            </div>
            <div>
              <dt>Due</dt>
              <dd>{formatDate(selectedAssignment.dueDate)}</dd>
            </div>
            <div>
              <dt>Problems</dt>
              <dd>{selectedAssignment.problemCount}</dd>
            </div>
            <div>
              <dt>Section</dt>
              <dd>{selectedAssignment.sectionName || section.sectionName}</dd>
            </div>
          </dl>

          {rows.length ? (
            <div className="summary-pill-row">
              {["Waiting", "Started", "Working", "Nearly Done", "Inactive", "Submitted", "Graded", "Needs Resubmission", "Resubmitted"].map(
                (label) =>
                  summaryCounts[label] ? (
                    <span key={label}>
                      {label}: {summaryCounts[label]}
                    </span>
                  ) : null,
              )}
            </div>
          ) : (
            <p className="muted-message">No students are currently in this section.</p>
          )}

          {rows.length && !progressItems.length && !submissions.length && !demoSubmissions.length ? (
            <p className="muted-message">No students have opened this assignment yet.</p>
          ) : null}

          <div className="monitor-grid" aria-label="Live student progress tiles">
            {filteredRows.length ? (
              filteredRows.map((row) => {
                const hasActivity = Boolean(row.progress || row.submission);
                const totalProblems = row.problemCount || selectedAssignment.problemCount || 0;
                const displayProgressPercent = getAnsweredProgressPercent(
                  row.answeredCount,
                  totalProblems,
                  row.progressPercent,
                );
                const progressLabel = hasActivity ? `${displayProgressPercent}%` : "0%";
                const answeredLabel = hasActivity
                  ? `${row.answeredCount} / ${totalProblems}`
                  : `0 / ${totalProblems}`;

                return (
                  <article
                    className="monitor-tile"
                    key={`${row.kind}-${getStudentId(row)}`}
                    style={getMonitorTileStyle(displayProgressPercent)}
                  >
                    <div className="monitor-tile-top">
                      <div>
                        <strong>{getStudentName(row)}</strong>
                        {row.kind === "demo" ? <span className="inline-badge">Demo</span> : null}
                      </div>
                      <span className={`status-pill ${row.status.className}`}>
                        {row.status.label}
                      </span>
                    </div>

                    <div
                      className="monitor-progress-bar"
                      aria-label={`${progressLabel} complete`}
                    >
                      <span style={{ width: `${displayProgressPercent}%` }} />
                    </div>

                    <div className="monitor-tile-meta">
                      <div>
                        <span>Progress</span>
                        <strong>{progressLabel}</strong>
                      </div>
                      <div>
                        <span>Answered</span>
                        <strong>{answeredLabel}</strong>
                      </div>
                      <div>
                        <span>Activity</span>
                        <strong>{formatRelativeTime(row.lastActivityAt, now)}</strong>
                      </div>
                    </div>

                    <div className="monitor-tile-footer">
                      <div>
                        <span>Grade</span>
                        <strong>
                          {row.submission ? `${getSubmissionPercent(row.submission)}%` : "--"}
                        </strong>
                      </div>
                      <button
                        className="secondary-button fit-button"
                        onClick={() =>
                          setOpenStudent({ id: getStudentId(row), kind: row.kind })
                        }
                        type="button"
                      >
                        View Work
                      </button>
                    </div>
                  </article>
                );
              })
            ) : (
              <p className="muted-message">
                {rows.length
                  ? "No students match this status filter."
                  : "No students are currently in this section."}
              </p>
            )}
          </div>
        </>
      ) : assignments.length ? (
        <p className="muted-message">Choose an assignment to start monitoring.</p>
      ) : null}

      {activeRow && selectedAssignment ? (
        <StudentWorkDetail
          assignment={selectedAssignment}
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

function TeacherAssignedWorkCard({ assignment, onOpenGrading, school, section }) {
  const [completedCount, setCompletedCount] = useState(0);

  useEffect(() => {
    if (!school || !section || !assignment?.assignmentId) {
      setCompletedCount(0);
      return undefined;
    }

    let realCount = 0;
    let demoCount = 0;

    function updateCount() {
      setCompletedCount(realCount + demoCount);
    }

    const unsubscribeSubmissions = subscribeAssignmentSubmissions(
      school,
      section,
      assignment.assignmentId,
      (submissions) => {
        realCount = submissions.length;
        updateCount();
      },
      (loadError) => {
        console.error("Assignment completion count failed to load", loadError);
      },
    );
    const unsubscribeDemoSubmissions = subscribeDemoAssignmentSubmissions(
      school,
      section,
      assignment.assignmentId,
      (submissions) => {
        demoCount = submissions.length;
        updateCount();
      },
      (loadError) => {
        console.error("Demo assignment completion count failed to load", loadError);
      },
    );

    return () => {
      unsubscribeSubmissions();
      unsubscribeDemoSubmissions();
    };
  }, [assignment, school, section]);

  return (
    <article className="mini-card assigned-work-card">
      <h3>{assignment.title}</h3>
      <p className="assigned-work-count">{completedCount} completed</p>
      <button
        className="primary-button fit-button"
        onClick={() => onOpenGrading(assignment)}
        type="button"
      >
        Grade Assignment
      </button>
    </article>
  );
}

function TeacherAssignedWork({ onOpenGrading, school, section }) {
  const [assignments, setAssignments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!school || !section) {
      setAssignments([]);
      setIsLoading(false);
      setError("Preview unavailable: section not selected.");
      return undefined;
    }

    setIsLoading(true);
    return subscribeSectionAssignments(
      school,
      section,
      (nextAssignments) => {
        setAssignments(nextAssignments);
        setError("");
        setIsLoading(false);
      },
      (loadError) => {
        console.error("Assignments failed to load", loadError);
        setError("Preview unavailable: assignment data could not be loaded.");
        setIsLoading(false);
      },
    );
  }, [school, section]);

  return (
    <section className="assigned-work-panel">
      <div>
        <p className="eyebrow">Assigned work</p>
        <h3>Work Published To This Section</h3>
      </div>

      {error ? <p className="error-message">{error}</p> : null}

      {isLoading ? (
        <p className="muted-message">Loading assigned work...</p>
      ) : assignments.length ? (
        <div className="section-card-grid">
          {assignments.map((assignment) => (
            <TeacherAssignedWorkCard
              assignment={assignment}
              key={assignment.assignmentId}
              onOpenGrading={onOpenGrading}
              school={school}
              section={section}
            />
          ))}
        </div>
      ) : (
        <p className="muted-message">No work has been assigned to this section yet.</p>
      )}
    </section>
  );
}

function StudentWorkRunner({
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
  const [answers, setAnswers] = useState({});
  const [submission, setSubmission] = useState(null);
  const [demoResult, setDemoResult] = useState(null);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const problems = useMemo(
    () =>
      generateProblemSet({
        assignmentType: assignment.assignmentType,
        problemCount: assignment.problemCount,
        seed: `${assignment.assignmentId}:${user.demoStudentId || user.uid}`,
      }),
    [assignment, user],
  );

  useEffect(() => {
    if (previewMode) return undefined;

    if (testMode) {
      return subscribeDemoStudentSubmission(
        school,
        section,
        assignment.assignmentId,
        user.demoStudentId,
        setSubmission,
        (error) => console.error("Demo student submission failed to load", error),
      );
    }

    return subscribeStudentSubmission(
      school,
      section,
      assignment.assignmentId,
      user.uid,
      setSubmission,
      (error) => console.error("Student submission failed to load", error),
    );
  }, [assignment, previewMode, school, section, testMode, user]);

  useEffect(() => {
    if (submission?.answers) {
      setAnswers(submission.answers);
    }
  }, [submission]);

  useEffect(() => {
    if (previewMode || !assignment || !user) return undefined;

    recordAssignmentOpened({
      actorUser,
      assignment,
      role,
      school,
      section,
      testMode,
      user,
    }).catch((error) => console.warn("Assignment open progress failed", error));

    return undefined;
  }, [actorUser, assignment, previewMode, role, school, section, testMode, user]);

  useEffect(() => {
    if (previewMode || !assignment || !user || !Object.keys(answers).length) {
      return undefined;
    }

    if (submission && !canSubmitAssignment(assignment, submission, previewMode)) {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      recordAssignmentAnswerProgress({
        actorUser,
        answers,
        assignment,
        role,
        school,
        section,
        testMode,
        user,
      }).catch((error) => console.warn("Assignment answer progress failed", error));
    }, 1400);

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

  function updateAnswer(problemId, value) {
    setAnswers((current) => ({ ...current, [problemId]: value }));
  }

  async function handleSubmit() {
    setMessage("");
    setIsSubmitting(true);

    const correctCount = problems.filter((problem) =>
      gradeAnswer(problem, answers[problem.id]),
    ).length;

    if (previewMode) {
      setDemoResult({
        correctCount,
        percent: problems.length ? Math.round((correctCount / problems.length) * 100) : 0,
        problemCount: problems.length,
      });
      setMessage(
        `Demo Submit: ${correctCount} out of ${problems.length}. Preview mode does not create submissions.`,
      );
      setIsSubmitting(false);
      return;
    }

    try {
      if (testMode) {
        await submitDemoAssignmentWork({
          actorUser,
          answers,
          assignment,
          correctCount,
          demoStudent: user,
          problemCount: problems.length,
          role,
          school,
          section,
        });
        setMessage(
          `Demo submission saved: ${correctCount} out of ${problems.length}.`,
        );
      } else {
        await submitAssignmentWork({
          answers,
          assignment,
          correctCount,
          problemCount: problems.length,
          school,
          section,
          user,
        });
        setMessage(`Submitted: ${correctCount} out of ${problems.length}.`);
      }
    } catch (error) {
      console.error("Assignment submission failed", error);
      setMessage(error.message || "Unable to submit assignment.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const canSubmit = canSubmitAssignment(assignment, submission, previewMode);
  const inputDisabled = !previewMode && Boolean(submission) && !canSubmit;

  return (
    <section className="student-work-runner">
      <div className="section-heading-row">
        <div>
          <p className="eyebrow">{section.sectionName}</p>
          <h3>{assignment.title}</h3>
          <p className="helper-copy">
            {assignment.directions} {assignment.dueDate ? `Due ${assignment.dueDate}.` : ""}
          </p>
        </div>
        <button className="secondary-button fit-button" onClick={onBack} type="button">
          {previewMode
            ? "Back to preview list"
            : testMode
              ? "Back to test list"
              : "Back to assigned work"}
        </button>
      </div>

      {testMode ? (
        <p className="test-mode-banner">
          Teacher Test Mode - Testing as {user.displayName}. Demo activity is saved as
          test data and is not connected to a Firebase Auth student account.
        </p>
      ) : null}

      {previewMode ? (
        <p className="preview-mode-banner">
          Demo Student Preview. Answers typed here stay local and do not create
          Firestore submissions.
        </p>
      ) : null}

      <AssignmentMeta
        assignment={assignment}
        previewMode={previewMode}
        submission={submission}
      />

      {submission ? (
        <section className="grade-summary-panel">
          <p className="eyebrow">Grade result</p>
          <h4>
            {getSubmissionScore(submission)} / {submission.problemCount} (
            {getSubmissionPercent(submission)}%)
          </h4>
          <dl className="detail-list assignment-detail-list">
            <div>
              <dt>Attempt</dt>
              <dd>{submission.attemptNumber || 1}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{submission.status || "submitted"}</dd>
            </div>
            <div>
              <dt>Resubmission</dt>
              <dd>
                {submission.resubmissionAllowed
                  ? "Allowed"
                  : "Not currently allowed"}
              </dd>
            </div>
            <div>
              <dt>Feedback</dt>
              <dd>{submission.feedback || "No feedback yet."}</dd>
            </div>
          </dl>
          {submission.resubmissionAllowed ? (
            <p className="status-message success">
              Resubmission is open
              {submission.resubmissionDueDate
                ? ` until ${submission.resubmissionDueDate}`
                : ""}
              .
            </p>
          ) : null}
        </section>
      ) : null}
      {demoResult ? (
        <p className="status-message success">
          Demo result: {demoResult.correctCount} / {demoResult.problemCount} (
          {demoResult.percent}%)
        </p>
      ) : null}
      {message ? <p className="status-message success">{message}</p> : null}

      <div className="student-problem-list">
        {problems.map((problem) => (
          <article className="student-problem-card" key={problem.id}>
            <p className="eyebrow">Problem {problem.number}</p>
            <div className="problem-prompt">
              <ProblemPrompt problem={problem} />
            </div>
            <label>
              Answer
              <input
                disabled={inputDisabled}
                onChange={(event) => updateAnswer(problem.id, event.target.value)}
                placeholder="Type your answer"
                value={answers[problem.id] || ""}
              />
            </label>
          </article>
        ))}
      </div>

      <button
        className="primary-button submit-work-button"
        disabled={isSubmitting || (!previewMode && Boolean(submission) && !canSubmit)}
        onClick={handleSubmit}
        type="button"
      >
        {isSubmitting
          ? "Submitting..."
          : previewMode
            ? "Demo Submit"
            : submission && canSubmit
              ? "Resubmit Assignment"
              : submission
              ? "Already Submitted"
              : testMode
                ? "Submit As Demo Student"
                : "Submit Assignment"}
      </button>
    </section>
  );
}

function StudentAssignmentCard({
  actorUser,
  assignment,
  onOpen,
  previewMode,
  role,
  school,
  section,
  testMode,
  user,
}) {
  const [submission, setSubmission] = useState(null);

  useEffect(() => {
    if (previewMode) {
      setSubmission(null);
      return undefined;
    }

    if (testMode) {
      return subscribeDemoStudentSubmission(
        school,
        section,
        assignment.assignmentId,
        user.demoStudentId,
        setSubmission,
        (error) => console.error("Demo list submission failed to load", error),
      );
    }

    return subscribeStudentSubmission(
      school,
      section,
      assignment.assignmentId,
      user.uid,
      setSubmission,
      (error) => console.error("Student list submission failed to load", error),
    );
  }, [assignment, previewMode, school, section, testMode, user]);

  return (
    <article className="mini-card">
      <p className="eyebrow">{assignment.problemCount} problems</p>
      <h3>{assignment.title}</h3>
      <p>{assignment.directions}</p>
      <AssignmentMeta
        assignment={assignment}
        previewMode={previewMode}
        submission={submission}
      />
      {submission ? (
        <p className="status-message success">
          Grade: {getSubmissionScore(submission)} / {submission.problemCount} (
          {getSubmissionPercent(submission)}%) - Attempt {submission.attemptNumber || 1}
        </p>
      ) : (
        <p className="muted-message">
          {testMode
            ? "This demo student has not submitted this work yet."
            : previewMode
              ? "Preview mode does not load saved submissions."
              : "No grades yet."}
        </p>
      )}
      <button
        className="secondary-button fit-button"
        onClick={() => onOpen(assignment)}
        type="button"
      >
        {previewMode
          ? "Open As Demo Student"
          : testMode
            ? "Open As Test Student"
            : submission
              ? "View Work"
              : "Start Work"}
      </button>
    </article>
  );
}

function StudentAssignedWork({
  actorUser = null,
  previewMode = false,
  role,
  school,
  section,
  testMode = false,
  user,
}) {
  const [assignments, setAssignments] = useState([]);
  const [openAssignment, setOpenAssignment] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const sectionId = section?.sectionId || section?.id;
  const activeStudentId = user?.demoStudentId || user?.uid;

  useEffect(() => {
    setOpenAssignment(null);
  }, [sectionId, activeStudentId]);

  useEffect(() => {
    if (!school || !sectionId) {
      setAssignments([]);
      setIsLoading(false);
      setError("Preview unavailable: section not selected.");
      return undefined;
    }

    setIsLoading(true);
    return subscribeSectionAssignments(
      school,
      section,
      (nextAssignments) => {
        setAssignments(nextAssignments);
        setError("");
        setIsLoading(false);
      },
      (loadError) => {
        console.error("Student assignments failed to load", loadError);
        setError(
          "Permission issue: this teacher/admin cannot read assignments for this section, or the section assignment path could not be loaded.",
        );
        setIsLoading(false);
      },
    );
  }, [reloadKey, school, section, sectionId]);

  if (openAssignment) {
    return (
      <StudentWorkRunner
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
          <p className="eyebrow">
            {previewMode
              ? "Demo Student Preview"
              : testMode
                ? "Teacher Test Mode"
                : "Assigned work"}
          </p>
          <h3>
            {previewMode || testMode ? "What Students See" : "Math Work For This Class"}
          </h3>
          {previewMode ? (
            <p className="helper-copy">
              Viewing {section.sectionName} as Demo Student. No preview action
              writes to student records.
            </p>
          ) : null}
          {testMode ? (
            <p className="helper-copy">
              Testing as {user.displayName}. Demo submissions are saved as test
              data for this section only.
            </p>
          ) : null}
        </div>
        <button
          className="secondary-button fit-button"
          onClick={() => setReloadKey((current) => current + 1)}
          type="button"
        >
          Refresh list
        </button>
      </div>

      {error ? <p className="error-message">{error}</p> : null}

      {isLoading ? (
        <p className="muted-message">Loading assigned work...</p>
      ) : assignments.length ? (
        <div className="section-card-grid">
          {assignments.map((assignment) => (
            <StudentAssignmentCard
              actorUser={actorUser}
              assignment={assignment}
              key={assignment.assignmentId}
              onOpen={setOpenAssignment}
              previewMode={previewMode}
              role={role}
              school={school}
              section={section}
              testMode={testMode}
              user={user}
            />
          ))}
        </div>
      ) : (
        <p className="muted-message">
          {previewMode
            ? "No assigned work yet for this section."
            : testMode
              ? "No assigned Math work for this section yet."
              : "No assigned work yet for this section. Your teacher can publish work from this curriculum page."}
        </p>
      )}
    </section>
  );
}

export default function MathCurriculumView({
  onBack,
  onExitTestMode,
  role,
  school,
  startInLiveMonitor = false,
  section,
  testStudent = null,
  user,
}) {
  const canAssign = role === "teacher" || role === "admin";
  const [showStudentPreview, setShowStudentPreview] = useState(false);
  const [showAssignmentSetup, setShowAssignmentSetup] = useState(false);
  const [gradingAssignment, setGradingAssignment] = useState(null);
  const [liveMonitorOpen, setLiveMonitorOpen] = useState(startInLiveMonitor);
  const activeTestStudent = testStudent;
  const isTestMode = Boolean(activeTestStudent);
  const sectionId = section?.sectionId || section?.id;
  const demoStudent = useMemo(
    () => ({
      uid: `demo-student-${section?.sectionId || section?.id || "section"}`,
      displayName: "Demo Student",
      email: "demo.student@student.doralacademynv.org",
    }),
    [section],
  );

  useEffect(() => {
    setGradingAssignment(null);
    setShowAssignmentSetup(false);
    setLiveMonitorOpen(startInLiveMonitor);
  }, [sectionId, startInLiveMonitor]);

  function exitTestMode() {
    if (onExitTestMode) onExitTestMode();
  }

  if (!school || !section) {
    return (
      <section className="card dashboard-card curriculum-view">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Math Curriculum</p>
            <h2>Preview unavailable: section not selected.</h2>
            <p className="helper-copy">
              Choose a class section before opening the Math curriculum preview.
            </p>
          </div>
          <button className="secondary-button fit-button" onClick={onBack} type="button">
            Back
          </button>
        </div>
      </section>
    );
  }

  if (canAssign && gradingAssignment && !isTestMode) {
    return (
      <section className="card dashboard-card curriculum-view grading-page">
        <AssignmentRosterGradingView
          assignment={gradingAssignment}
          onBack={() => setGradingAssignment(null)}
          role={role}
          school={school}
          section={section}
          user={user}
        />
      </section>
    );
  }

  if (canAssign && liveMonitorOpen && !isTestMode) {
    return (
      <section className="card dashboard-card curriculum-view grading-page">
        <LiveMonitorView
          onBack={() => (startInLiveMonitor ? onBack() : setLiveMonitorOpen(false))}
          role={role}
          school={school}
          section={section}
          user={user}
        />
      </section>
    );
  }

  return (
    <section className="card dashboard-card curriculum-view">
      <div className="section-heading-row">
        <div>
          <p className="eyebrow">{section?.sectionName || "Math"}</p>
          <h2>{isTestMode ? "Testing as Demo Student" : "Math Curriculum"}</h2>
          <p className="helper-copy">
            {isTestMode
              ? `Teacher Test Mode - Viewing as ${activeTestStudent.displayName}.`
              : "Pre-built Mathematics content attached to this class section."}
          </p>
        </div>
        <div className="button-row">
          {isTestMode ? (
            <button
              className="primary-button fit-button"
              onClick={exitTestMode}
              type="button"
            >
              Exit Test Mode
            </button>
          ) : null}
          {canAssign && !isTestMode ? (
            <button
              className="primary-button fit-button"
              onClick={() => setShowStudentPreview(true)}
              type="button"
            >
              Student Preview
            </button>
          ) : null}
          {canAssign && !isTestMode ? (
            <button
              className="secondary-button fit-button"
              onClick={() => setLiveMonitorOpen(true)}
              type="button"
            >
              Live Monitor
            </button>
          ) : null}
          <button className="secondary-button fit-button" onClick={onBack} type="button">
            {isTestMode ? "Back" : "Back"}
          </button>
        </div>
      </div>

      <dl className="detail-list section-preview-details">
        <div>
          <dt>Course</dt>
          <dd>{section.courseName || "Math"}</dd>
        </div>
        <div>
          <dt>Period</dt>
          <dd>{section.period || "--"}</dd>
        </div>
        <div>
          <dt>Section</dt>
          <dd>{section.sectionName}</dd>
        </div>
        <div>
          <dt>Teacher</dt>
          <dd>{section.teacherName || "Teacher"}</dd>
        </div>
      </dl>

      {isTestMode ? (
        <>
          <p className="test-mode-banner">
            Teacher Test Mode - Testing as {activeTestStudent.displayName}. Demo
            submissions are saved as test data and never use a real student UID.
          </p>
          <StudentAssignedWork
            actorUser={user}
            role={role}
            school={school}
            section={section}
            testMode
            user={activeTestStudent}
          />
        </>
      ) : canAssign ? (
        <>
          <section className="assignment-setup-launch">
            <button
              className="primary-button fit-button"
              onClick={() => setShowAssignmentSetup((current) => !current)}
              type="button"
            >
              {showAssignmentSetup ? "Hide Assignment Setup" : "Assignment Setup"}
            </button>
          </section>
          {showAssignmentSetup ? (
            <TeacherAssignmentSetup
              role={role}
              school={school}
              section={section}
              user={user}
            />
          ) : null}
          <TeacherAssignedWork
            school={school}
            section={section}
            onOpenGrading={setGradingAssignment}
          />
        </>
      ) : (
        <StudentAssignedWork role={role} school={school} section={section} user={user} />
      )}

      {showStudentPreview && !isTestMode ? (
        <div className="preview-modal-backdrop" role="presentation">
          <section
            aria-label="Demo Student Preview"
            className="preview-modal"
            role="dialog"
          >
            <div className="section-heading-row">
              <div>
                <p className="eyebrow">Demo Student Preview</p>
                <h2>Demo Student Preview - {section.sectionName}</h2>
                <p className="helper-copy">
                  This preview uses the same assignments path students read, but
                  Demo Submit stays local and never creates a Firestore submission.
                </p>
              </div>
              <button
                className="secondary-button fit-button"
                onClick={() => setShowStudentPreview(false)}
                type="button"
              >
                Close preview
              </button>
            </div>

            <dl className="detail-list section-preview-details">
              <div>
                <dt>Course</dt>
                <dd>{section.courseName || "Math"}</dd>
              </div>
              <div>
                <dt>Period</dt>
                <dd>{section.period || "--"}</dd>
              </div>
              <div>
                <dt>Teacher</dt>
                <dd>{section.teacherName || "Teacher"}</dd>
              </div>
              <div>
                <dt>Demo student</dt>
                <dd>{demoStudent.displayName}</dd>
              </div>
            </dl>

            <StudentAssignedWork
              previewMode
              role={role}
              school={school}
              section={section}
              user={demoStudent}
            />
          </section>
        </div>
      ) : null}

      <section className="curriculum-library">
        <div>
          <p className="eyebrow">Curriculum library</p>
          <h3>Pre-built Math Topics</h3>
        </div>
        <div className="curriculum-grid">
          {mathAssignmentTypes.map((unit) => (
            <article className="mini-card" key={unit.assignmentType}>
              <p className="eyebrow">{unit.defaultProblemCount} problems</p>
              <h3>{unit.title}</h3>
              <p>{unit.directions}</p>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
