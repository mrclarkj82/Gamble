import { useEffect, useState } from "react";
import {
  joinSectionByCode,
  SectionError,
  subscribeStudentSections,
} from "../services/sections";
import CurriculumView from "./CurriculumView";

export default function StudentClasses({ role, school, user }) {
  const [sections, setSections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [classCode, setClassCode] = useState("");
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState("success");
  const [isJoining, setIsJoining] = useState(false);
  const [openSection, setOpenSection] = useState(null);

  useEffect(() => {
    if (!user) return undefined;

    setIsLoading(true);
    return subscribeStudentSections(
      user.uid,
      (nextSections) => {
        setSections(nextSections);
        setLoadError("");
        setIsLoading(false);
      },
      (error) => {
        console.error("Student classes failed to load", error);
        setLoadError("Unable to load your classes.");
        setIsLoading(false);
      },
    );
  }, [user]);

  async function handleJoinClass(event) {
    event.preventDefault();
    setMessage("");

    setIsJoining(true);
    try {
      await joinSectionByCode({
        classCode,
        role,
        school,
        user,
      });
      setClassCode("");
      setMessage("Class joined successfully.");
      setMessageTone("success");
    } catch (error) {
      setMessage(error instanceof SectionError ? error.message : "Invalid class code.");
      setMessageTone("danger");
    } finally {
      setIsJoining(false);
    }
  }

  if (openSection) {
    return (
      <CurriculumView
        role={role}
        school={school}
        section={openSection}
        user={user}
        onBack={() => setOpenSection(null)}
      />
    );
  }

  return (
    <section className="card dashboard-card">
      <div className="section-heading-row">
        <div>
          <p className="eyebrow">Student classes</p>
          <h2>My Classes</h2>
          <p className="helper-copy">
            Join a teacher section with its class code to see the assigned curriculum.
          </p>
        </div>
      </div>

      <form className="join-form" onSubmit={handleJoinClass}>
        <label>
          Class code
          <input
            autoComplete="off"
            onChange={(event) => setClassCode(event.target.value.toUpperCase())}
            placeholder="CLARK-M-P2-7K2"
            value={classCode}
          />
        </label>
        <button
          className="primary-button"
          disabled={isJoining || !classCode.trim()}
          type="submit"
        >
          {isJoining ? "Joining..." : "Join Class"}
        </button>
      </form>

      {message ? <p className={`status-message ${messageTone}`}>{message}</p> : null}
      {loadError ? <p className="error-message">{loadError}</p> : null}

      {isLoading ? (
        <p className="muted-message">Loading classes...</p>
      ) : sections.length ? (
        <div className="section-card-grid">
          {sections.map((section) => (
            <article className="mini-card" key={section.sectionId || section.id}>
              <p className="eyebrow">{section.curriculumTitle || "No curriculum"}</p>
              <h3>{section.sectionName}</h3>
              <dl className="detail-list">
                <div>
                  <dt>Teacher</dt>
                  <dd>{section.teacherName}</dd>
                </div>
                <div>
                  <dt>Period</dt>
                  <dd>{section.period}</dd>
                </div>
                <div>
                  <dt>Course</dt>
                  <dd>{section.courseName}</dd>
                </div>
              </dl>
              <button
                className="secondary-button fit-button"
                disabled={!section.curriculumId}
                onClick={() => setOpenSection(section)}
                type="button"
              >
                Open Curriculum
              </button>
            </article>
          ))}
        </div>
      ) : (
        <p className="muted-message">No classes joined yet.</p>
      )}
    </section>
  );
}
