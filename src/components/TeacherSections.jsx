import { useEffect, useState } from "react";
import {
  createSection,
  getSectionRoster,
  getTeacherSections,
  SectionError,
} from "../services/sections";
import CreateSectionForm from "./CreateSectionForm";
import SectionRoster from "./SectionRoster";
import TeacherSectionCard from "./TeacherSectionCard";

export default function TeacherSections({ role, school, user }) {
  const [sections, setSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState(null);
  const [roster, setRoster] = useState([]);
  const [isLoadingSections, setIsLoadingSections] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingRoster, setIsLoadingRoster] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [rosterError, setRosterError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadSections() {
      setIsLoadingSections(true);
      setError("");

      try {
        const teacherSections = await getTeacherSections(school.schoolId, user.uid);

        if (isMounted) {
          setSections(teacherSections);
        }
      } catch (loadError) {
        console.error("Unable to load teacher sections", loadError);

        if (isMounted) {
          setError("Unable to load class sections.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingSections(false);
        }
      }
    }

    loadSections();

    return () => {
      isMounted = false;
    };
  }, [school.schoolId, user.uid]);

  async function handleCreateSection(sectionData) {
    setMessage("");
    setError("");
    setIsSaving(true);

    try {
      const newSection = await createSection({
        ...sectionData,
        role,
        schoolId: school.schoolId,
        teacherUser: user,
      });

      setSections((currentSections) => [newSection, ...currentSections]);
      setMessage("Section created successfully.");
    } catch (createError) {
      console.error("Unable to create section", createError);
      setError(
        createError instanceof SectionError
          ? createError.message
          : "Unable to create section.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleViewRoster(section) {
    setSelectedSection(section);
    setRoster([]);
    setRosterError("");
    setIsLoadingRoster(true);

    try {
      const nextRoster = await getSectionRoster(school.schoolId, section.sectionId);
      setRoster(nextRoster);
    } catch (loadError) {
      console.error("Unable to load roster", loadError);
      setRosterError("Unable to load roster.");
    } finally {
      setIsLoadingRoster(false);
    }
  }

  return (
    <section className="dashboard-panel">
      <div className="section-header">
        <div>
          <p className="eyebrow">Teacher tools</p>
          <h2>My Class Sections</h2>
        </div>
      </div>

      {message ? <p className="success-message">{message}</p> : null}
      {error ? <p className="error-message">{error}</p> : null}

      <CreateSectionForm isSaving={isSaving} onCreate={handleCreateSection} />

      <div className="split-layout">
        <div>
          <div className="section-subheader">
            <h3>Created sections</h3>
            {isLoadingSections ? <span>Loading...</span> : null}
          </div>

          {!isLoadingSections && sections.length === 0 ? (
            <p className="empty-state">No class sections created yet.</p>
          ) : null}

          <div className="item-grid">
            {sections.map((section) => (
              <TeacherSectionCard
                isSelected={selectedSection?.sectionId === section.sectionId}
                key={section.sectionId}
                onViewRoster={handleViewRoster}
                section={section}
              />
            ))}
          </div>
        </div>

        <SectionRoster
          error={rosterError}
          isLoading={isLoadingRoster}
          roster={roster}
          section={selectedSection}
        />
      </div>
    </section>
  );
}
