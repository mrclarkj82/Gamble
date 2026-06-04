import { useEffect, useState } from "react";
import {
  addDemoStudent,
  clearDemoRoster,
  clearDemoSubmissions,
  DemoRosterError,
  generateDemoRoster,
  subscribeDemoStudents,
} from "../services/demoRoster";

export default function DemoRosterPanel({
  onTestAsStudent,
  role,
  school,
  section,
  user,
}) {
  const [demoStudents, setDemoStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ firstName: "", lastName: "" });

  useEffect(() => {
    if (!school || !section) {
      setDemoStudents([]);
      setIsLoading(false);
      return undefined;
    }

    setIsLoading(true);
    return subscribeDemoStudents(
      school,
      section,
      (students) => {
        setDemoStudents(students);
        setError("");
        setIsLoading(false);
      },
      (loadError) => {
        console.error("Demo students failed to load", loadError);
        setError("Unable to load demo roster.");
        setIsLoading(false);
      },
    );
  }, [school, section]);

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function runDemoAction(action, successMessage) {
    setError("");
    setMessage("");
    setIsWorking(true);

    try {
      await action();
      setMessage(successMessage);
    } catch (actionError) {
      console.error("Demo roster action failed", actionError);
      setError(
        actionError instanceof DemoRosterError
          ? actionError.message
          : "Unable to update demo roster.",
      );
    } finally {
      setIsWorking(false);
    }
  }

  async function handleGenerateRoster() {
    await runDemoAction(
      () => generateDemoRoster({ role, school, section, user }),
      "Demo roster generated.",
    );
  }

  async function handleAddDemoStudent(event) {
    event.preventDefault();
    await runDemoAction(
      async () => {
        await addDemoStudent({
          firstName: form.firstName,
          lastName: form.lastName,
          role,
          school,
          section,
          user,
        });
        setForm({ firstName: "", lastName: "" });
      },
      "Demo student added.",
    );
  }

  async function handleResetSubmissions() {
    const confirmed = window.confirm(
      "Reset demo submissions for this section? Real student submissions will not be touched.",
    );

    if (!confirmed) return;

    await runDemoAction(
      () => clearDemoSubmissions({ role, school, section, user }),
      "Demo submissions reset.",
    );
  }

  async function handleClearRoster() {
    const confirmed = window.confirm(
      "Clear this demo roster and all demo submissions for this section? Real students will not be touched.",
    );

    if (!confirmed) return;

    await runDemoAction(
      () => clearDemoRoster({ role, school, section, user }),
      "Demo roster and demo submissions cleared.",
    );
  }

  return (
    <section className="demo-roster-panel">
      <div className="section-heading-row compact-heading">
        <div>
          <p className="eyebrow">Demo roster</p>
          <h3>Test Students</h3>
          <p className="helper-copy">
            Generate demo students, then test this section as one selected
            student. Demo activity is saved separately from real student data.
          </p>
        </div>
        <div className="button-row">
          <button
            className="secondary-button fit-button"
            disabled={isWorking}
            onClick={handleGenerateRoster}
            type="button"
          >
            Generate Demo Roster
          </button>
          <button
            className="secondary-button fit-button"
            disabled={isWorking}
            onClick={handleResetSubmissions}
            type="button"
          >
            Reset Demo Submissions
          </button>
          <button
            className="danger-button fit-button"
            disabled={isWorking}
            onClick={handleClearRoster}
            type="button"
          >
            Clear Demo Roster
          </button>
        </div>
      </div>

      {message ? <p className="status-message success">{message}</p> : null}
      {error ? <p className="error-message">{error}</p> : null}

      <form className="demo-student-form" onSubmit={handleAddDemoStudent}>
        <label>
          First Name
          <input
            autoComplete="off"
            onChange={(event) => updateForm("firstName", event.target.value)}
            placeholder="Jordan"
            value={form.firstName}
          />
        </label>
        <label>
          Last Name
          <input
            autoComplete="off"
            onChange={(event) => updateForm("lastName", event.target.value)}
            placeholder="Lee"
            value={form.lastName}
          />
        </label>
        <button className="primary-button" disabled={isWorking} type="submit">
          Add Demo Student
        </button>
      </form>

      {isLoading ? (
        <p className="muted-message">Loading demo roster...</p>
      ) : demoStudents.length ? (
        <div className="demo-student-list">
          {demoStudents.map((student) => (
            <article className="roster-row demo-roster-row" key={student.demoStudentId}>
              <div>
                <strong>
                  {student.displayName}
                  <span className="inline-badge">Demo</span>
                </strong>
                <span>{student.email}</span>
              </div>
              <button
                className="primary-button fit-button"
                onClick={() => onTestAsStudent(student)}
                type="button"
              >
                Test as Student
              </button>
            </article>
          ))}
        </div>
      ) : (
        <p className="muted-message">
          No demo students yet. Generate a demo roster to test assignments,
          grades, and resubmissions.
        </p>
      )}
    </section>
  );
}
