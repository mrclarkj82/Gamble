import { useState } from "react";
import { ENGLISH_1_COURSE } from "../data/englishCurriculum";
import EnglishScopeSequenceView from "./EnglishScopeSequenceView";
import EnglishUnit1PilotView from "./EnglishUnit1PilotView";
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

function EnglishShellContent({
  includeAssignmentTypes = true,
  includeSourceLibrary = false,
  role,
  school,
  section,
  studentMode = false,
  user,
}) {
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
          {includeSourceLibrary ? (
            <SourceLibrary compact role={role} school={school} user={user} />
          ) : null}

          {includeAssignmentTypes ? (
            <section className="curriculum-library">
              <div>
                <p className="eyebrow">Assignment placeholders</p>
                <h3>English Assignment Types</h3>
                <p className="helper-copy">
                  These are metadata placeholders only. Assignment creation for English
                  will be added in a later version.
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
          ) : null}
        </>
      ) : (
        <p className="muted-message">No English 1 assignments have been assigned yet.</p>
      )}
    </>
  );
}

export default function EnglishCurriculumView({
  onBack,
  onExitTestMode,
  role,
  school,
  section,
  testStudent = null,
  user,
}) {
  const [showStudentPreview, setShowStudentPreview] = useState(false);
  const [activeTab, setActiveTab] = useState("unit1");
  const canPreview = role === "teacher" || role === "admin";
  const isTestMode = Boolean(testStudent);

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
          <h2>{isTestMode ? "Testing as Demo Student" : "English 1"}</h2>
          <p className="helper-copy">
            {isTestMode
              ? `Teacher Test Mode - Viewing as ${testStudent.displayName}.`
              : ENGLISH_1_COURSE.description}
          </p>
        </div>
        <div className="button-row">
          {isTestMode && onExitTestMode ? (
            <button
              className="primary-button fit-button"
              onClick={onExitTestMode}
              type="button"
            >
              Exit Test Mode
            </button>
          ) : null}
          {canPreview && !isTestMode ? (
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

      {canPreview && !isTestMode ? (
        <div className="course-tab-row" aria-label="English 1 course tools">
          <button
            className={activeTab === "unit1" ? "active" : ""}
            onClick={() => setActiveTab("unit1")}
            type="button"
          >
            Unit 1 Pilot
          </button>
          <button
            className={activeTab === "scope" ? "active" : ""}
            onClick={() => setActiveTab("scope")}
            type="button"
          >
            Scope & Sequence
          </button>
          <button
            className={activeTab === "overview" ? "active" : ""}
            onClick={() => setActiveTab("overview")}
            type="button"
          >
            Course Shell
          </button>
          <button
            className={activeTab === "resources" ? "active" : ""}
            onClick={() => setActiveTab("resources")}
            type="button"
          >
            Source Library
          </button>
        </div>
      ) : null}

      {isTestMode ? (
        <EnglishUnit1PilotView
          actorUser={user}
          role={role}
          school={school}
          section={section}
          testMode
          user={testStudent}
          onExitTestMode={onExitTestMode}
        />
      ) : null}

      {!canPreview ? (
        <>
          <CourseDetails course={ENGLISH_1_COURSE} section={section} />
          <p className="status-message success">
            Your English 1 lessons and assignments will appear here when your
            teacher assigns them.
          </p>
          <EnglishUnit1PilotView
            role={role}
            school={school}
            section={section}
            studentMode
            user={user}
          />
          <EnglishScopeSequenceView studentMode />
        </>
      ) : null}

      {canPreview && !isTestMode && activeTab === "unit1" ? (
        <EnglishUnit1PilotView
          canAssign
          role={role}
          school={school}
          section={section}
          user={user}
        />
      ) : null}

      {canPreview && !isTestMode && activeTab === "scope" ? (
        <EnglishScopeSequenceView />
      ) : null}

      {canPreview && !isTestMode && activeTab === "overview" ? (
        <EnglishShellContent
          includeAssignmentTypes
          role={role}
          school={school}
          section={section}
          user={user}
        />
      ) : null}

      {canPreview && !isTestMode && activeTab === "resources" ? (
        <SourceLibrary compact role={role} school={school} user={user} />
      ) : null}

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

            <CourseDetails course={ENGLISH_1_COURSE} section={section} />
            <p className="status-message success">
              Your English 1 lessons and assignments will appear here when your
              teacher assigns them.
            </p>
            <EnglishUnit1PilotView
              actorUser={user}
              previewMode
              role={role}
              school={school}
              section={section}
              user={{
                uid: `english-preview-${section.sectionId || section.id}`,
                displayName: "Demo Student",
                email: "demo.student@student.example",
              }}
            />
            <EnglishScopeSequenceView studentMode />
          </section>
        </div>
      ) : null}
    </section>
  );
}
