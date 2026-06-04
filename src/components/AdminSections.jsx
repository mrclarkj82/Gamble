import { useEffect, useState } from "react";
import {
  getAvailableCurriculumPackages,
  getCurriculumLabel,
  isEnglishCurriculum,
} from "../services/curriculum";
import {
  subscribeActiveRosterCount,
  subscribeAdminSections,
} from "../services/sections";
import CurriculumView from "./CurriculumView";
import SourceLibrary from "./SourceLibrary";

function formatDate(value) {
  if (value && typeof value.toDate === "function") {
    return value.toDate().toLocaleDateString();
  }

  return "Pending";
}

export default function AdminSections({ role, school, user }) {
  const [sections, setSections] = useState([]);
  const [rosterCounts, setRosterCounts] = useState({});
  const [rosterCountErrors, setRosterCountErrors] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [inspectedCurriculum, setInspectedCurriculum] = useState(null);
  const curriculumPackages = getAvailableCurriculumPackages();

  useEffect(() => {
    if (!school) return undefined;

    setIsLoading(true);
    return subscribeAdminSections(
      school,
      (nextSections) => {
        setSections(nextSections);
        setError("");
        setIsLoading(false);
      },
      (loadError) => {
        console.error("Admin sections failed to load", loadError);
        setError("Unable to load school sections.");
        setIsLoading(false);
      },
    );
  }, [school]);

  useEffect(() => {
    if (!school || !sections.length) {
      setRosterCounts({});
      setRosterCountErrors({});
      return undefined;
    }

    setRosterCounts({});
    setRosterCountErrors({});

    const unsubscribes = sections.map((section) => {
      const sectionId = section.sectionId || section.id;

      return subscribeActiveRosterCount(
        school,
        section,
        (count) => {
          setRosterCounts((current) => ({ ...current, [sectionId]: count }));
          setRosterCountErrors((current) => {
            const next = { ...current };
            delete next[sectionId];
            return next;
          });
        },
        () => {
          setRosterCountErrors((current) => ({ ...current, [sectionId]: true }));
        },
      );
    });

    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [school, sections]);

  function getRosterCountLabel(section) {
    const sectionId = section.sectionId || section.id;

    if (rosterCountErrors[sectionId]) return "--";
    if (rosterCounts[sectionId] === undefined) return "...";
    return rosterCounts[sectionId];
  }

  if (inspectedCurriculum) {
    return (
      <CurriculumView
        role={role}
        school={school}
        section={{
          sectionId: "admin-english-1-preview",
          schoolId: school?.schoolId || school?.id || "doral-red-rock",
          sectionName: "English 1 Admin Preview",
          teacherName: user?.displayName || "Admin",
          curriculumId: inspectedCurriculum.curriculumId,
          curriculumTitle: inspectedCurriculum.title,
          curriculumSubject: inspectedCurriculum.subject,
        }}
        user={user}
        onBack={() => setInspectedCurriculum(null)}
      />
    );
  }

  return (
    <>
      <section className="card dashboard-card">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Admin overview</p>
            <h2>Available Curriculum</h2>
            <p className="helper-copy">
              Course packages currently available for teacher-created sections.
            </p>
          </div>
        </div>

        <div className="curriculum-grid">
          {curriculumPackages.map((curriculum) => (
            <article className="mini-card" key={curriculum.curriculumId}>
              <p className="eyebrow">{curriculum.subject}</p>
              <h3>{getCurriculumLabel(curriculum)}</h3>
              <p>{curriculum.description}</p>
              {isEnglishCurriculum(curriculum.curriculumId) ? (
                <button
                  className="secondary-button fit-button"
                  onClick={() => setInspectedCurriculum(curriculum)}
                  type="button"
                >
                  Scope & Sequence
                </button>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <SourceLibrary role={role} school={school} user={user} />

      <section className="card dashboard-card">
      <div className="section-heading-row">
        <div>
          <p className="eyebrow">Admin overview</p>
          <h2>School Sections</h2>
          <p className="helper-copy">
            Active class sections and their attached curriculum packages.
          </p>
        </div>
      </div>

      {error ? <p className="error-message">{error}</p> : null}

      {isLoading ? (
        <p className="muted-message">Loading sections...</p>
      ) : sections.length ? (
        <div className="admin-section-list">
          {sections.map((section) => (
            <article className="admin-section-row" key={section.sectionId || section.id}>
              <div>
                <p className="eyebrow">{section.classCode}</p>
                <h3>{section.sectionName}</h3>
                <p>{section.courseName}</p>
              </div>
              <div>
                <span>Teacher</span>
                <strong>{section.teacherName}</strong>
              </div>
              <div>
                <span>Email</span>
                <strong>{section.teacherEmail}</strong>
              </div>
              <div>
                <span>Period</span>
                <strong>{section.period}</strong>
              </div>
              <div>
                <span>Students</span>
                <strong>{getRosterCountLabel(section)}</strong>
              </div>
              <div>
                <span>Curriculum</span>
                <strong>{section.curriculumTitle || "None"}</strong>
              </div>
              <div>
                <span>Created</span>
                <strong>{formatDate(section.createdAt)}</strong>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="muted-message">No active sections have been created yet.</p>
      )}
      </section>
    </>
  );
}
