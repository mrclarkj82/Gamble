import { useEffect, useState } from "react";
import { getAdminSections } from "../services/sections";

function formatDate(value) {
  if (!value || typeof value.toDate !== "function") {
    return "Just now";
  }

  return value.toDate().toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AdminSections({ school }) {
  const [sections, setSections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadSections() {
      setIsLoading(true);
      setError("");

      try {
        const adminSections = await getAdminSections(school.schoolId);

        if (isMounted) {
          setSections(adminSections);
        }
      } catch (loadError) {
        console.error("Unable to load admin sections", loadError);

        if (isMounted) {
          setError("Unable to load school sections.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadSections();

    return () => {
      isMounted = false;
    };
  }, [school.schoolId]);

  return (
    <section className="dashboard-panel">
      <div className="section-header">
        <div>
          <p className="eyebrow">Admin overview</p>
          <h2>School Sections</h2>
        </div>
        {isLoading ? <span className="subtle-badge">Loading...</span> : null}
      </div>

      {error ? <p className="error-message">{error}</p> : null}

      {!isLoading && sections.length === 0 ? (
        <p className="empty-state">No active sections have been created yet.</p>
      ) : null}

      <div className="admin-section-list">
        {sections.map((section) => (
          <article className="admin-section-row" key={section.sectionId}>
            <div>
              <p className="eyebrow">{section.classCode}</p>
              <h3>{section.sectionName}</h3>
              <p>{section.courseName}</p>
            </div>
            <dl className="admin-details">
              <div>
                <dt>Teacher</dt>
                <dd>{section.teacherName}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{section.teacherEmail}</dd>
              </div>
              <div>
                <dt>Period</dt>
                <dd>{section.period}</dd>
              </div>
              <div>
                <dt>Students</dt>
                <dd>{section.studentCount || 0}</dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{formatDate(section.createdAt)}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}
