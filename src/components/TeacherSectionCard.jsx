export default function TeacherSectionCard({ isSelected, onViewRoster, section }) {
  return (
    <article className={`item-card ${isSelected ? "item-card-active" : ""}`}>
      <div className="item-card-main">
        <p className="eyebrow">Class code {section.classCode}</p>
        <h3>{section.sectionName}</h3>
        <p>{section.courseName}</p>
      </div>

      <dl className="mini-details">
        <div>
          <dt>Period</dt>
          <dd>{section.period}</dd>
        </div>
        <div>
          <dt>Students</dt>
          <dd>{section.studentCount || 0}</dd>
        </div>
      </dl>

      <button className="secondary-button" onClick={() => onViewRoster(section)}>
        View roster
      </button>
    </article>
  );
}
