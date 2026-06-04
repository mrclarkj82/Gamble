import { useState } from "react";
import { ENGLISH_1_COURSE } from "../data/englishCurriculum";
import SourceLibrary from "./SourceLibrary";

function SkillTags({ skills }) {
  return (
    <div className="tag-row">
      {skills.map((skill) => (
        <span key={skill}>{skill}</span>
      ))}
    </div>
  );
}

function CourseDetails({ course, section }) {
  return (
    <dl className="detail-list section-preview-details">
      <div>
        <dt>Course</dt>
        <dd>{course.title}</dd>
      </div>
      <div>
        <dt>Also Known As</dt>
        <dd>{course.alternateTitle}</dd>
      </div>
      <div>
        <dt>Subject</dt>
        <dd>{course.subject}</dd>
      </div>
      <div>
        <dt>Grade Level</dt>
        <dd>{course.gradeLevel}</dd>
      </div>
      {section ? (
        <>
          <div>
            <dt>Section</dt>
            <dd>{section.sectionName}</dd>
          </div>
          <div>
            <dt>Teacher</dt>
            <dd>{section.teacherName || "Teacher"}</dd>
          </div>
        </>
      ) : null}
    </dl>
  );
}

function UnitCard({ unit, studentMode }) {
  return (
    <article className="course-unit-card">
      <div>
        <p className="eyebrow">Unit {unit.order}</p>
        <h3>{unit.title}</h3>
        <p>{unit.description}</p>
      </div>

      <SkillTags skills={unit.skills} />

      <div className="lesson-placeholder-list">
        {unit.lessons.map((lesson) => (
          <article className="lesson-placeholder-card" key={lesson.lessonId}>
            <p className="eyebrow">{lesson.estimatedMinutes} minutes</p>
            <h4>{lesson.title}</h4>
            <p>{lesson.objective}</p>
            <p className="muted-message">{lesson.placeholderContentNote}</p>
            {!studentMode ? (
              <SkillTags skills={lesson.futureAssignmentSlots} />
            ) : null}
          </article>
        ))}
      </div>

      {!studentMode ? (
        <p className="muted-message">
          Future assignment slots: {unit.assignmentTypePlaceholders.join(", ")}.
        </p>
      ) : null}
    </article>
  );
}

function AssignmentTypeCard({ assignmentType }) {
  return (
    <article className="mini-card">
      <p className="eyebrow">
        {assignmentType.supportsAutoGrade ? "Auto-grade ready" : "Teacher reviewed"}
      </p>
      <h3>{assignmentType.title}</h3>
      <p>{assignmentType.description}</p>
      <dl className="detail-list assignment-detail-list">
        <div>
          <dt>Feedback</dt>
          <dd>{assignmentType.supportsTeacherFeedback ? "Yes" : "No"}</dd>
        </div>
        <div>
          <dt>Rubric</dt>
          <dd>{assignmentType.supportsRubric ? "Yes" : "No"}</dd>
        </div>
        <div>
          <dt>Resubmission</dt>
          <dd>{assignmentType.supportsResubmission ? "Yes" : "No"}</dd>
        </div>
      </dl>
    </article>
  );
}

function EnglishShellContent({ role, school, section, studentMode = false, user }) {
  const course = ENGLISH_1_COURSE;

  return (
    <>
      <CourseDetails course={course} section={section} />

      <p className="status-message success">
        {studentMode
          ? "Your English 1 lessons and assignments will appear here when your teacher assigns them."
          : "English 1 shell is ready. Full lessons and assignments will be added using public-domain or freely licensed resources."}
      </p>

      <section className="curriculum-library">
        <div>
          <p className="eyebrow">Course structure</p>
          <h3>English 1 Units</h3>
        </div>
        <div className="course-unit-list">
          {course.units.map((unit) => (
            <UnitCard key={unit.unitId} studentMode={studentMode} unit={unit} />
          ))}
        </div>
      </section>

      {!studentMode ? (
        <>
          <SourceLibrary compact role={role} school={school} user={user} />

          <section className="curriculum-library">
            <div>
              <p className="eyebrow">Assignment placeholders</p>
              <h3>English Assignment Types</h3>
              <p className="helper-copy">
                These are metadata placeholders only. Assignment creation for English will
                be added in a later version.
              </p>
            </div>
            <div className="curriculum-grid">
              {course.assignmentTypes.map((assignmentType) => (
                <AssignmentTypeCard
                  assignmentType={assignmentType}
                  key={assignmentType.typeId}
                />
              ))}
            </div>
          </section>
        </>
      ) : (
        <p className="muted-message">No English 1 assignments have been assigned yet.</p>
      )}
    </>
  );
}

export default function EnglishCurriculumView({ onBack, role, school, section, user }) {
  const [showStudentPreview, setShowStudentPreview] = useState(false);
  const canPreview = role === "teacher" || role === "admin";

  if (!section) {
    return (
      <section className="card dashboard-card curriculum-view">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">English 1</p>
            <h2>Select a section to preview English 1.</h2>
            <p className="helper-copy">English 1 curriculum could not be loaded.</p>
          </div>
          <button className="secondary-button fit-button" onClick={onBack} type="button">
            Back
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="card dashboard-card curriculum-view">
      <div className="section-heading-row">
        <div>
          <p className="eyebrow">{section.sectionName || "Freshman English"}</p>
          <h2>English 1</h2>
          <p className="helper-copy">{ENGLISH_1_COURSE.description}</p>
        </div>
        <div className="button-row">
          {canPreview ? (
            <button
              className="primary-button fit-button"
              onClick={() => setShowStudentPreview(true)}
              type="button"
            >
              Student Preview
            </button>
          ) : null}
          <button className="secondary-button fit-button" onClick={onBack} type="button">
            Back
          </button>
        </div>
      </div>

      <EnglishShellContent
        role={role}
        school={school}
        section={section}
        studentMode={!canPreview}
        user={user}
      />

      {showStudentPreview ? (
        <div className="preview-modal-backdrop" role="presentation">
          <section
            aria-label="English 1 Demo Student Preview"
            className="preview-modal"
            role="dialog"
          >
            <div className="section-heading-row">
              <div>
                <p className="eyebrow">Demo Student Preview</p>
                <h2>English 1 - {section.sectionName}</h2>
                <p className="helper-copy">
                  Preview what an enrolled student will see. English 1 preview
                  does not create submissions or student records.
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

            <EnglishShellContent
              role={role}
              school={school}
              section={section}
              studentMode
              user={user}
            />
          </section>
        </div>
      ) : null}
    </section>
  );
}
