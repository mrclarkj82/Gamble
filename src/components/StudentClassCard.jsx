export default function StudentClassCard({ section }) {
  return (
    <article className="item-card">
      <div className="item-card-main">
        <p className="eyebrow">{section.teacherName}</p>
        <h3>{section.sectionName}</h3>
        <p>{section.courseName}</p>
      </div>

      <dl className="mini-details">
        <div>
          <dt>Period</dt>
          <dd>{section.period}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{section.status}</dd>
        </div>
      </dl>
    </article>
  );
}
