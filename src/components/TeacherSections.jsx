import { useEffect, useMemo, useState } from "react";
import {
  getAvailableCurriculumPackages,
  getCurriculumLabel,
  isMathCurriculum,
} from "../services/curriculum";
import {
  createSection,
  removeStudentFromSection,
  SectionError,
  subscribeSectionRoster,
  subscribeTeacherSections,
} from "../services/sections";
import CurriculumView from "./CurriculumView";
import DemoRosterPanel from "./DemoRosterPanel";
import MathCurriculumView from "./MathCurriculumView";

export default function TeacherSections({ role, school, user }) {
  const [sections, setSections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState("success");
  const [isSaving, setIsSaving] = useState(false);
  const [sectionForm, setSectionForm] = useState({
    courseName: "",
    period: "",
    curriculumId: "math",
  });
  const [selectedRosterSection, setSelectedRosterSection] = useState(null);
  const [showSelectedRoster, setShowSelectedRoster] = useState(false);
  const [roster, setRoster] = useState([]);
  const [rosterError, setRosterError] = useState("");
  const [removingStudentUid, setRemovingStudentUid] = useState("");
  const [previewSection, setPreviewSection] = useState(null);
  const [liveMonitorSection, setLiveMonitorSection] = useState(null);
  const [testSession, setTestSession] = useState(null);

  const curriculumPackages = useMemo(() => getAvailableCurriculumPackages(), []);
  const sortedSections = useMemo(
    () =>
      [...sections].sort((first, second) => {
        const firstPeriod = Number.parseInt(first.period, 10);
        const secondPeriod = Number.parseInt(second.period, 10);
        const firstPeriodIsNumber = Number.isFinite(firstPeriod);
        const secondPeriodIsNumber = Number.isFinite(secondPeriod);

        if (firstPeriodIsNumber && secondPeriodIsNumber && firstPeriod !== secondPeriod) {
          return firstPeriod - secondPeriod;
        }

        if (firstPeriodIsNumber !== secondPeriodIsNumber) {
          return firstPeriodIsNumber ? -1 : 1;
        }

        return (first.sectionName || "").localeCompare(second.sectionName || "");
      }),
    [sections],
  );

  useEffect(() => {
    if (!school || !user) return undefined;

    setIsLoading(true);
    return subscribeTeacherSections(
      school,
      user.uid,
      (nextSections) => {
        setSections(nextSections);
        setLoadError("");
        setIsLoading(false);
      },
      (error) => {
        console.error("Teacher sections failed to load", error);
        setLoadError("Unable to load your class sections.");
        setIsLoading(false);
      },
    );
  }, [school, user]);

  useEffect(() => {
    if (!selectedRosterSection) {
      setRoster([]);
      return undefined;
    }

    setRosterError("");
    return subscribeSectionRoster(
      school,
      selectedRosterSection.sectionId || selectedRosterSection.id,
      setRoster,
      (error) => {
        console.error("Roster failed to load", error);
        setRosterError("Unable to load roster.");
      },
    );
  }, [school, selectedRosterSection]);

  function updateSectionField(field, value) {
    setSectionForm((current) => ({ ...current, [field]: value }));
  }

  async function handleCreateSection(event) {
    event.preventDefault();
    setMessage("");

    const curriculumPackage = curriculumPackages.find(
      (curriculum) => curriculum.curriculumId === sectionForm.curriculumId,
    );

    setIsSaving(true);
    try {
      await createSection({
        courseName: sectionForm.courseName,
        curriculumPackage,
        period: sectionForm.period,
        role,
        school,
        user,
      });
      setSectionForm({ courseName: "", period: "", curriculumId: "math" });
      setMessage("Curriculum assigned successfully.");
      setMessageTone("success");
    } catch (error) {
      console.error("Section creation failed", error);
      setMessage(
        error instanceof SectionError ? error.message : "Unable to create section.",
      );
      setMessageTone("danger");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRemoveStudent(student) {
    if (!selectedRosterSection) return;

    const confirmed = window.confirm(
      `Remove ${student.studentName || student.studentEmail} from ${
        selectedRosterSection.sectionName
      }?`,
    );

    if (!confirmed) return;

    setRemovingStudentUid(student.studentUid);
    setRosterError("");

    try {
      await removeStudentFromSection({
        role,
        school,
        section: selectedRosterSection,
        student,
        user,
      });
      setMessage(`${student.studentName || "Student"} was removed from the roster.`);
      setMessageTone("success");
    } catch (error) {
      console.error("Roster removal failed", error);
      setRosterError("Unable to remove student from roster.");
    } finally {
      setRemovingStudentUid("");
    }
  }

  if (testSession) {
    return (
      <CurriculumView
        role={role}
        school={school}
        section={testSession.section}
        testStudent={testSession.student}
        user={user}
        onBack={() => setTestSession(null)}
        onExitTestMode={() => setTestSession(null)}
      />
    );
  }

  if (previewSection) {
    return (
      <CurriculumView
        role={role}
        school={school}
        section={previewSection}
        user={user}
        onBack={() => setPreviewSection(null)}
      />
    );
  }

  if (liveMonitorSection) {
    return (
      <MathCurriculumView
        role={role}
        school={school}
        section={liveMonitorSection}
        startInLiveMonitor
        user={user}
        onBack={() => setLiveMonitorSection(null)}
      />
    );
  }

  function selectSection(section) {
    setSelectedRosterSection(section);
    setShowSelectedRoster(false);

    if (section.curriculumId) {
      setPreviewSection(section);
    }
  }

  function closeSelectedSection() {
    setSelectedRosterSection(null);
    setShowSelectedRoster(false);
  }

  return (
    <>
      <section className="card dashboard-card">
        <div className="section-heading-row">
          <div>
            <h2>Create Section</h2>
            <p className="helper-copy">
              Create a period, attach a course package, and share the generated class code.
            </p>
          </div>
        </div>

        {message ? (
          <p className={`status-message ${messageTone}`}>{message}</p>
        ) : null}

        <form className="section-form" onSubmit={handleCreateSection}>
          <label>
            Course Name
              <input
                autoComplete="off"
                onChange={(event) => updateSectionField("courseName", event.target.value)}
                placeholder="Algebra 1 or English 1"
                value={sectionForm.courseName}
              />
          </label>
          <label>
            Period
            <input
              autoComplete="off"
              onChange={(event) => updateSectionField("period", event.target.value)}
              placeholder="2"
              value={sectionForm.period}
            />
          </label>
          <label>
            Curriculum Package
            <select
              onChange={(event) => updateSectionField("curriculumId", event.target.value)}
              value={sectionForm.curriculumId}
            >
              <option value="">Select curriculum</option>
              {curriculumPackages.map((curriculum) => (
                <option key={curriculum.curriculumId} value={curriculum.curriculumId}>
                  {getCurriculumLabel(curriculum)}
                </option>
              ))}
            </select>
          </label>
          <button className="primary-button" disabled={isSaving} type="submit">
            {isSaving ? "Creating..." : "Create Section"}
          </button>
        </form>
      </section>

      <section className="card dashboard-card">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Class codes & rosters</p>
            <h2>Active Sections</h2>
          </div>
        </div>

        {loadError ? <p className="error-message">{loadError}</p> : null}

        {isLoading ? (
          <p className="muted-message">Loading sections...</p>
        ) : sortedSections.length ? (
          <div className="teacher-section-grid">
            {sortedSections.map((section) => {
              const sectionId = section.sectionId || section.id;
              const isActive =
                (selectedRosterSection?.sectionId || selectedRosterSection?.id) === sectionId;
              const period = String(section.period || "").trim();
              const periodLabel = period.toLowerCase().startsWith("period")
                ? period
                : `Period ${period || "--"}`;

              return (
                <button
                  className={`teacher-section-card ${isActive ? "active" : ""}`}
                  key={sectionId}
                  onClick={() => selectSection(section)}
                  type="button"
                >
                  <div className="teacher-section-card-banner">
                    <span>{periodLabel}</span>
                  </div>
                  <div className="teacher-section-card-body">
                    <h3>{section.sectionName}</h3>
                    <p>{section.courseName || "Course not named"}</p>
                    <dl className="teacher-section-card-details">
                      <div>
                        <dt>Curriculum</dt>
                        <dd>{section.curriculumTitle || "Not assigned"}</dd>
                      </div>
                      <div>
                        <dt>Code</dt>
                        <dd>{section.classCode || "--"}</dd>
                      </div>
                    </dl>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="muted-message">No active sections yet.</p>
        )}
      </section>

      {selectedRosterSection ? (
        <section className="card dashboard-card">
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">Selected section</p>
              <h2>Selected Section: {selectedRosterSection.sectionName}</h2>
              <p className="helper-copy">
                {selectedRosterSection.curriculumTitle || "No curriculum assigned"}
              </p>
            </div>
            <button
              className="secondary-button fit-button"
              onClick={closeSelectedSection}
              type="button"
            >
              Close section
            </button>
          </div>

          <div className="button-row selected-section-actions">
            {selectedRosterSection.curriculumId ? (
              <button
                className="secondary-button fit-button"
                onClick={() => setPreviewSection(selectedRosterSection)}
                type="button"
              >
                Curriculum
              </button>
            ) : null}
            {isMathCurriculum(selectedRosterSection.curriculumId) ? (
              <button
                className="secondary-button fit-button"
                onClick={() => setLiveMonitorSection(selectedRosterSection)}
                type="button"
              >
                Live Monitor
              </button>
            ) : null}
            <button
              className="secondary-button fit-button"
              onClick={() => setShowSelectedRoster((current) => !current)}
              type="button"
            >
              {showSelectedRoster ? "Hide roster" : "View roster"}
            </button>
          </div>

          {showSelectedRoster ? (
            <div className="selected-roster-panel">
              {rosterError ? <p className="error-message">{rosterError}</p> : null}

              {roster.length ? (
                <div className="roster-list">
                  {roster.map((student) => (
                    <article className="roster-row" key={student.studentUid}>
                      <div>
                        <strong>{student.studentName || "Student"}</strong>
                        <span>{student.studentEmail || student.studentUid}</span>
                      </div>
                      <button
                        className="danger-button fit-button"
                        disabled={removingStudentUid === student.studentUid}
                        onClick={() => handleRemoveStudent(student)}
                        type="button"
                      >
                        {removingStudentUid === student.studentUid
                          ? "Removing..."
                          : "Remove"}
                      </button>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="muted-message">No students have joined this section yet.</p>
              )}

              <DemoRosterPanel
                role={role}
                school={school}
                section={selectedRosterSection}
                user={user}
                onTestAsStudent={(student) =>
                  setTestSession({ section: selectedRosterSection, student })
                }
              />
            </div>
          ) : null}
        </section>
      ) : null}
    </>
  );
}
