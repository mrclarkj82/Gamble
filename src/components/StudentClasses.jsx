import { useEffect, useState } from "react";
import {
  getStudentSections,
  joinSectionByCode,
  SectionError,
} from "../services/sections";
import JoinClassForm from "./JoinClassForm";
import StudentClassCard from "./StudentClassCard";

export default function StudentClasses({ role, school, user }) {
  const [sections, setSections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadSections() {
      setIsLoading(true);
      setError("");

      try {
        const studentSections = await getStudentSections(user.uid);

        if (isMounted) {
          setSections(studentSections);
        }
      } catch (loadError) {
        console.error("Unable to load student sections", loadError);

        if (isMounted) {
          setError("Unable to load classes.");
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
  }, [user.uid]);

  async function handleJoin(classCode) {
    setMessage("");
    setError("");
    setIsJoining(true);

    try {
      const joinedSection = await joinSectionByCode({
        classCode,
        role,
        schoolId: school.schoolId,
        studentUser: user,
      });

      setSections((currentSections) => [joinedSection, ...currentSections]);
      setMessage("Class joined successfully.");
    } catch (joinError) {
      console.error("Unable to join section", joinError);
      setError(
        joinError instanceof SectionError
          ? joinError.message
          : "Unable to join class.",
      );
    } finally {
      setIsJoining(false);
    }
  }

  return (
    <section className="dashboard-panel">
      <div className="section-header">
        <div>
          <p className="eyebrow">Student tools</p>
          <h2>My Classes</h2>
        </div>
      </div>

      {message ? <p className="success-message">{message}</p> : null}
      {error ? <p className="error-message">{error}</p> : null}

      <JoinClassForm isJoining={isJoining} onJoin={handleJoin} />

      <div className="section-subheader">
        <h3>Joined classes</h3>
        {isLoading ? <span>Loading...</span> : null}
      </div>

      {!isLoading && sections.length === 0 ? (
        <p className="empty-state">No joined classes yet.</p>
      ) : null}

      <div className="item-grid student-grid">
        {sections.map((section) => (
          <StudentClassCard key={section.sectionId} section={section} />
        ))}
      </div>
    </section>
  );
}
