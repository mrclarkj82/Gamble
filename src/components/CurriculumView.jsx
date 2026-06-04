import { getCurriculumPackage, isEnglishCurriculum, isMathCurriculum } from "../services/curriculum";
import EnglishCurriculumView from "./EnglishCurriculumView";
import MathCurriculumView from "./MathCurriculumView";

export default function CurriculumView({
  onBack,
  onExitTestMode,
  role,
  school,
  section,
  testStudent = null,
  user,
}) {
  const curriculumId = section?.curriculumId;
  const curriculumPackage = getCurriculumPackage(curriculumId);

  if (isMathCurriculum(curriculumId)) {
    return (
      <MathCurriculumView
        onBack={onBack}
        role={role}
        school={school}
        section={section}
        testStudent={testStudent}
        user={user}
        onExitTestMode={onExitTestMode}
      />
    );
  }

  if (isEnglishCurriculum(curriculumId)) {
    return (
      <EnglishCurriculumView
        onBack={onBack}
        role={role}
        school={school}
        section={section}
        testStudent={testStudent}
        user={user}
        onExitTestMode={onExitTestMode}
      />
    );
  }

  return (
    <section className="card dashboard-card curriculum-view">
      <div className="section-heading-row">
        <div>
          <p className="eyebrow">Curriculum</p>
          <h2>Curriculum could not be loaded.</h2>
          <p className="helper-copy">
            {curriculumPackage
              ? `${curriculumPackage.title} is not available in this version yet.`
              : "This section does not have a supported curriculum package attached."}
          </p>
        </div>
        <button className="secondary-button fit-button" onClick={onBack} type="button">
          Back
        </button>
      </div>
    </section>
  );
}
