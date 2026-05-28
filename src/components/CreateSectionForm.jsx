import { useState } from "react";
import { generateSectionName } from "../services/sections";

export default function CreateSectionForm({ isSaving, onCreate }) {
  const [courseName, setCourseName] = useState("");
  const [period, setPeriod] = useState("");

  const canSubmit = courseName.trim() && period.trim() && !isSaving;
  const sectionPreview =
    courseName.trim() && period.trim()
      ? generateSectionName(courseName, period)
      : "Course Name - Period";

  async function handleSubmit(event) {
    event.preventDefault();

    if (!canSubmit) return;

    await onCreate({ courseName, period });
    setCourseName("");
    setPeriod("");
  }

  return (
    <form className="stacked-form" onSubmit={handleSubmit}>
      <div className="form-grid">
        <label>
          Course Name
          <input
            onChange={(event) => setCourseName(event.target.value)}
            placeholder="Digital Game Development"
            value={courseName}
          />
        </label>
        <label>
          Period
          <input
            onChange={(event) => setPeriod(event.target.value)}
            placeholder="3"
            value={period}
          />
        </label>
      </div>

      <p className="helper-text neutral-helper">Section: {sectionPreview}</p>

      <button className="primary-button button-fit" disabled={!canSubmit} type="submit">
        {isSaving ? "Creating section..." : "Create section"}
      </button>
    </form>
  );
}
