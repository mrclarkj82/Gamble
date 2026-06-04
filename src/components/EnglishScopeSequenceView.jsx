import { ENGLISH_1_COURSE } from "../data/englishCurriculum";

function TagList({ className = "", tags = [] }) {
  if (!tags.length) return null;

  return (
    <div className={`tag-row ${className}`}>
      {tags.map((tag) => (
        <span key={tag}>{tag}</span>
      ))}
    </div>
  );
}

function PacingGuide({ course }) {
  const totalWeeks = course.pacingGuide.reduce((sum, item) => sum + item.weeks, 0);

  return (
    <section className="curriculum-library scope-panel">
      <div className="section-heading-row">
        <div>
          <p className="eyebrow">Full-year pacing</p>
          <h3>Pacing Guide</h3>
          <p className="helper-copy">
            Default pacing is static for this version and can be made editable later.
          </p>
        </div>
        <strong className="scope-week-total">{totalWeeks} weeks</strong>
      </div>

      <div className="pacing-grid">
        {course.pacingGuide.map((item) => (
          <article className="pacing-card" key={item.unitId}>
            <p className="eyebrow">{item.label}</p>
            <h4>{item.title}</h4>
            <strong>{item.weeks} weeks</strong>
          </article>
        ))}
      </div>
    </section>
  );
}

function CourseSummary({ course }) {
  return (
    <section className="curriculum-library scope-panel">
      <div>
        <p className="eyebrow">Course overview</p>
        <h3>{course.title} Scope & Sequence</h3>
        <p>{course.description}</p>
      </div>

      <dl className="detail-list section-preview-details">
        <div>
          <dt>Course Length</dt>
          <dd>{course.courseLength}</dd>
        </div>
        <div>
          <dt>Recommended Weeks</dt>
          <dd>{course.recommendedWeeks}</dd>
        </div>
        <div>
          <dt>Grade Level</dt>
          <dd>{course.gradeLevel}</dd>
        </div>
        <div>
          <dt>Subject</dt>
          <dd>{course.subject}</dd>
        </div>
      </dl>

      <div className="scope-goal-grid">
        {course.courseGoals.map((goal) => (
          <article className="scope-goal-card" key={goal}>
            {goal}
          </article>
        ))}
      </div>
    </section>
  );
}

function AssignmentPlaceholderList({ assignments }) {
  return (
    <div className="scope-mini-grid">
      {assignments.map((assignment) => (
        <article className="scope-placeholder-card" key={assignment.assignmentTemplateId}>
          <div>
            <p className="eyebrow">Placeholder</p>
            <h4>{assignment.title}</h4>
            <p>{assignment.purpose}</p>
          </div>
          <dl className="detail-list assignment-detail-list">
            <div>
              <dt>Type</dt>
              <dd>{assignment.assignmentType}</dd>
            </div>
            <div>
              <dt>Points</dt>
              <dd>{assignment.suggestedPoints}</dd>
            </div>
            <div>
              <dt>Source</dt>
              <dd>{assignment.sourceRequired ? "Required" : "Not required"}</dd>
            </div>
            <div>
              <dt>Rubric Future</dt>
              <dd>{assignment.supportsRubricFuture ? "Yes" : "No"}</dd>
            </div>
          </dl>
          <button className="secondary-button fit-button" disabled type="button">
            Planning placeholder
          </button>
        </article>
      ))}
    </div>
  );
}

function LessonPlaceholderList({ lessons }) {
  return (
    <div className="scope-lesson-list">
      {lessons.map((lesson) => (
        <article className="scope-lesson-row" key={lesson.lessonId}>
          <div>
            <p className="eyebrow">Lesson {lesson.order} | {lesson.estimatedMinutes} min</p>
            <h4>{lesson.title}</h4>
            <p>{lesson.objective}</p>
            <p className="muted-message">{lesson.teacherNotes}</p>
          </div>
          <TagList tags={lesson.skillTags} />
          <TagList className="standards-tag-row" tags={lesson.standardsTags} />
        </article>
      ))}
    </div>
  );
}

function ResourceSlotList({ resourceSlots }) {
  return (
    <div className="scope-mini-grid">
      {resourceSlots.map((slot) => (
        <article className="scope-placeholder-card" key={slot.slotId}>
          <p className="eyebrow">Resource slot</p>
          <h4>{slot.requiredResourceType.replace(/_/g, " ")}</h4>
          <p>{slot.notes}</p>
          <dl className="detail-list assignment-detail-list">
            <div>
              <dt>Link Only</dt>
              <dd>{slot.canUseLinkOnly ? "Allowed" : "No"}</dd>
            </div>
            <div>
              <dt>Embeddable</dt>
              <dd>{slot.canUseEmbeddable ? "Allowed" : "No"}</dd>
            </div>
          </dl>
          <p className="muted-message">
            Resource will be selected from the Source Library in a later phase.
          </p>
        </article>
      ))}
    </div>
  );
}

function TeacherUnitDetail({ unit }) {
  return (
    <details className="scope-unit-detail">
      <summary>
        <span>
          <strong>Unit {unit.order}: {unit.title}</strong>
          <small>{unit.suggestedWeeks} weeks</small>
        </span>
        <TagList tags={unit.focusSkills.slice(0, 5)} />
      </summary>

      <div className="scope-unit-body">
        <section>
          <p className="eyebrow">Unit goal</p>
          <p>{unit.unitGoal}</p>
        </section>

        <section>
          <p className="eyebrow">Essential questions</p>
          <ul className="scope-list">
            {unit.essentialQuestions.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        </section>

        <section>
          <p className="eyebrow">Focus skills</p>
          <TagList tags={unit.focusSkills} />
        </section>

        <section>
          <p className="eyebrow">Standards tags</p>
          <TagList className="standards-tag-row" tags={unit.standardsTags} />
        </section>

        <section>
          <p className="eyebrow">Lesson placeholders</p>
          <LessonPlaceholderList lessons={unit.lessons} />
        </section>

        <section>
          <p className="eyebrow">Assignment placeholders</p>
          <AssignmentPlaceholderList assignments={unit.assignmentPlaceholders} />
          <p className="muted-message">
            This is a planning placeholder. Full assignments will be created in a
            later phase.
          </p>
        </section>

        <section>
          <p className="eyebrow">Source Library resource slots</p>
          <ResourceSlotList resourceSlots={unit.resourceSlots} />
        </section>
      </div>
    </details>
  );
}

function TeacherScopeSequence({ course }) {
  return (
    <>
      <CourseSummary course={course} />
      <PacingGuide course={course} />

      <section className="curriculum-library scope-panel">
        <div>
          <p className="eyebrow">Standards and skills</p>
          <h3>Skills Framework</h3>
          <p className="helper-copy">
            Standards are lightweight tags for future Nevada / Grade 9-10 ELA alignment.
          </p>
        </div>

        <div className="scope-mini-grid">
          {Object.entries(course.standardsFramework).map(([key, strand]) => (
            <article className="scope-placeholder-card" key={key}>
              <h4>{strand.label}</h4>
              <TagList tags={strand.skillTags} />
            </article>
          ))}
        </div>
      </section>

      <section className="curriculum-library scope-panel">
        <div>
          <p className="eyebrow">Unit sequence</p>
          <h3>Six-Unit Course Map</h3>
        </div>

        <div className="scope-unit-list">
          {course.units.map((unit) => (
            <TeacherUnitDetail key={unit.unitId} unit={unit} />
          ))}
        </div>
      </section>
    </>
  );
}

function StudentScopeSequence({ course }) {
  return (
    <section className="curriculum-library scope-panel">
      <div>
        <p className="eyebrow">{course.alternateTitle}</p>
        <h3>{course.title} Roadmap</h3>
        <p className="helper-copy">
          Assignments will appear here when assigned by your teacher.
        </p>
      </div>

      <div className="student-roadmap-grid">
        {course.units.map((unit) => (
          <article className="student-roadmap-card" key={unit.unitId}>
            <p className="eyebrow">Unit {unit.order}</p>
            <h4>{unit.title}</h4>
            <p>{unit.description}</p>
            <strong>Coming soon</strong>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function EnglishScopeSequenceView({ studentMode = false }) {
  const course = ENGLISH_1_COURSE;

  if (!course?.units?.length) {
    return (
      <p className="error-message">
        English 1 scope and sequence could not be loaded.
      </p>
    );
  }

  return studentMode ? (
    <StudentScopeSequence course={course} />
  ) : (
    <TeacherScopeSequence course={course} />
  );
}
