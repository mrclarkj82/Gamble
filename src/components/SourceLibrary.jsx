import { useEffect, useMemo, useState } from "react";
import {
  approvalStatusOptions,
  copyrightStatusOptions,
  licenseTypeOptions,
  providerTypeOptions,
  resourceTypeOptions,
} from "../data/sourceLibrarySeeds";
import {
  canResourceBeEmbedded,
  deactivateSourceResource,
  getResourceUseLabel,
  saveSourceResource,
  SourceLibraryError,
  subscribeSourceLibrary,
} from "../services/sourceLibrary";

const EMPTY_RESOURCE = {
  courseId: "english-1",
  subject: "english",
  title: "",
  author: "",
  providerName: "",
  providerType: "teacher_added",
  resourceType: "external_link",
  sourceUrl: "",
  canonicalUrl: "",
  gradeBand: "9-12",
  recommendedGradeLevel: "9",
  unitFit: "",
  skillTags: "",
  textType: "",
  licenseType: "unknown_needs_review",
  licenseName: "",
  licenseUrl: "",
  copyrightStatus: "unknown",
  publicDomainUS: false,
  canLink: true,
  canEmbed: false,
  canModify: false,
  requiresAttribution: true,
  attributionText: "",
  usageNotes: "",
  restrictions: "Do not paste full text into Gamble until usage rights are reviewed.",
  approvalStatus: "needs_review",
  active: true,
};

const FILTERS = [
  ["all", "All"],
  ["approved", "Approved"],
  ["needs_review", "Needs Review"],
  ["link_only", "Link Only"],
  ["embeddable", "Embeddable"],
  ["public_domain", "Public Domain"],
  ["writing_reference", "Writing Reference"],
  ["primary_sources", "Primary Sources"],
  ["literature", "Short Stories / Literature"],
  ["informational_text", "Informational Text"],
  ["poetry", "Poetry"],
  ["unit_fit", "Unit Fit"],
];

function formatLabel(value = "") {
  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function arrayText(value) {
  if (Array.isArray(value)) return value.join(", ");
  return value || "";
}

function formFromResource(resource) {
  return {
    ...EMPTY_RESOURCE,
    ...resource,
    unitFit: arrayText(resource?.unitFit),
    skillTags: arrayText(resource?.skillTags),
  };
}

function resourceMatchesFilter(resource, filter) {
  const combinedText = [
    resource.title,
    resource.author,
    resource.providerName,
    resource.resourceType,
    resource.textType,
    arrayText(resource.unitFit),
    arrayText(resource.skillTags),
  ]
    .join(" ")
    .toLowerCase();

  if (filter === "all") return true;
  if (filter === "approved") return resource.approvalStatus === "approved";
  if (filter === "needs_review") return resource.approvalStatus === "needs_review";
  if (filter === "link_only") return resource.canLink && !resource.canEmbed;
  if (filter === "embeddable") return canResourceBeEmbedded(resource);
  if (filter === "public_domain") {
    return (
      resource.licenseType === "public_domain" ||
      resource.licenseType === "government_public_domain" ||
      resource.copyrightStatus === "public_domain_us"
    );
  }
  if (filter === "writing_reference") return resource.providerType === "writing_reference";
  if (filter === "primary_sources") return resource.resourceType === "primary_source";
  if (filter === "literature") {
    return /short story|story|literature|fiction|drama/i.test(combinedText);
  }
  if (filter === "informational_text") {
    return /informational|rhetoric|essay|speech|primary source|research/i.test(
      combinedText,
    );
  }
  if (filter === "poetry") return /poem|poetry/i.test(combinedText);
  if (filter === "unit_fit") return Array.isArray(resource.unitFit) && resource.unitFit.length;

  return true;
}

function StatusPill({ resource }) {
  const status = resource.approvalStatus || "needs_review";

  return (
    <span className={`source-status-pill ${status.replace("_", "-")}`}>
      {formatLabel(status)}
    </span>
  );
}

function UsePill({ resource }) {
  const label = getResourceUseLabel(resource);
  const className = label.toLowerCase().replace(/\s+/g, "-");

  return <span className={`source-use-pill ${className}`}>{label}</span>;
}

function ResourceDetail({ onClose, resource }) {
  if (!resource) return null;

  return (
    <div className="preview-modal-backdrop" role="presentation">
      <section aria-label="Source resource details" className="preview-modal" role="dialog">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Source details</p>
            <h2>{resource.title}</h2>
            <p className="helper-copy">{resource.providerName}</p>
          </div>
          <button className="secondary-button fit-button" onClick={onClose} type="button">
            Close
          </button>
        </div>

        {resource.isSeed ? (
          <p className="status-message success">
            This seed record is metadata guidance only. Save an edited copy before
            using it as a managed school resource.
          </p>
        ) : null}

        {!canResourceBeEmbedded(resource) && resource.canLink ? (
          <p className="status-message danger">
            This resource should be linked from its original source, not copied into
            Gamble.
          </p>
        ) : null}

        {resource.requiresAttribution && !resource.attributionText ? (
          <p className="status-message danger">
            Attribution required before this resource can be used in a lesson.
          </p>
        ) : null}

        <dl className="detail-list source-detail-list">
          <div>
            <dt>Author</dt>
            <dd>{resource.author || "--"}</dd>
          </div>
          <div>
            <dt>Provider</dt>
            <dd>{resource.providerName || "--"}</dd>
          </div>
          <div>
            <dt>Provider Type</dt>
            <dd>{formatLabel(resource.providerType)}</dd>
          </div>
          <div>
            <dt>Resource Type</dt>
            <dd>{formatLabel(resource.resourceType)}</dd>
          </div>
          <div>
            <dt>License</dt>
            <dd>{resource.licenseName || formatLabel(resource.licenseType)}</dd>
          </div>
          <div>
            <dt>Copyright</dt>
            <dd>{formatLabel(resource.copyrightStatus)}</dd>
          </div>
          <div>
            <dt>Use</dt>
            <dd>{getResourceUseLabel(resource)}</dd>
          </div>
          <div>
            <dt>Approval</dt>
            <dd>{formatLabel(resource.approvalStatus)}</dd>
          </div>
        </dl>

        <div className="source-detail-notes">
          <div>
            <h3>Source URL</h3>
            <a href={resource.sourceUrl} rel="noreferrer" target="_blank">
              {resource.sourceUrl}
            </a>
          </div>
          <div>
            <h3>License URL</h3>
            {resource.licenseUrl ? (
              <a href={resource.licenseUrl} rel="noreferrer" target="_blank">
                {resource.licenseUrl}
              </a>
            ) : (
              <p className="muted-message">No license URL recorded.</p>
            )}
          </div>
          <div>
            <h3>Attribution</h3>
            <p>{resource.attributionText || "No attribution text recorded."}</p>
          </div>
          <div>
            <h3>Usage Notes</h3>
            <p>{resource.usageNotes || "No usage notes recorded."}</p>
          </div>
          <div>
            <h3>Restrictions</h3>
            <p>{resource.restrictions || "No restrictions recorded."}</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function SourceResourceForm({ initialResource, onCancel, onSave, role }) {
  const [form, setForm] = useState(() => formFromResource(initialResource));
  const isAdmin = role === "admin";

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateChecklist(field, checked) {
    setForm((current) => {
      const next = { ...current };

      if (field === "freeToAccess") {
        next.canLink = checked;
      }

      if (field === "publicDomainUS") {
        next.publicDomainUS = checked;
        if (checked) {
          next.licenseType = "public_domain";
          next.copyrightStatus = "public_domain_us";
        }
      }

      if (field === "openLicense" && checked && next.licenseType === "unknown_needs_review") {
        next.licenseType = "cc_by";
        next.copyrightStatus = "open_license";
      }

      if (field === "providerAllowsEmbedding") {
        next.canEmbed = checked;
      }

      if (field === "requiresAttribution") {
        next.requiresAttribution = checked;
      }

      if (field === "shouldBeLinkOnly" && checked) {
        next.canLink = true;
        next.canEmbed = false;
        next.canModify = false;
        next.licenseType = "free_to_use_link_only";
        next.copyrightStatus = "link_only";
      }

      if (field === "hasReviewed") {
        next.approvalStatus = checked && isAdmin ? "approved" : "needs_review";
      }

      return next;
    });
  }

  return (
    <form className="source-form" onSubmit={(event) => onSave(event, form)}>
      <p className="status-message danger">
        Metadata only. Do not paste full stories, poems, articles, worksheets, or
        textbook chapters into Gamble.
      </p>

      <div className="source-form-grid">
        <label>
          Title
          <input
            onChange={(event) => updateField("title", event.target.value)}
            value={form.title}
          />
        </label>
        <label>
          Author
          <input
            onChange={(event) => updateField("author", event.target.value)}
            value={form.author}
          />
        </label>
        <label>
          Provider
          <input
            onChange={(event) => updateField("providerName", event.target.value)}
            value={form.providerName}
          />
        </label>
        <label>
          Source URL
          <input
            onChange={(event) => updateField("sourceUrl", event.target.value)}
            value={form.sourceUrl}
          />
        </label>
        <label>
          Provider Type
          <select
            onChange={(event) => updateField("providerType", event.target.value)}
            value={form.providerType}
          >
            {providerTypeOptions.map((option) => (
              <option key={option} value={option}>
                {formatLabel(option)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Resource Type
          <select
            onChange={(event) => updateField("resourceType", event.target.value)}
            value={form.resourceType}
          >
            {resourceTypeOptions.map((option) => (
              <option key={option} value={option}>
                {formatLabel(option)}
              </option>
            ))}
          </select>
        </label>
        <label>
          License Type
          <select
            onChange={(event) => updateField("licenseType", event.target.value)}
            value={form.licenseType}
          >
            {licenseTypeOptions.map((option) => (
              <option key={option} value={option}>
                {formatLabel(option)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Copyright Status
          <select
            onChange={(event) => updateField("copyrightStatus", event.target.value)}
            value={form.copyrightStatus}
          >
            {copyrightStatusOptions.map((option) => (
              <option key={option} value={option}>
                {formatLabel(option)}
              </option>
            ))}
          </select>
        </label>
        <label>
          License Name
          <input
            onChange={(event) => updateField("licenseName", event.target.value)}
            value={form.licenseName}
          />
        </label>
        <label>
          License URL
          <input
            onChange={(event) => updateField("licenseUrl", event.target.value)}
            value={form.licenseUrl}
          />
        </label>
        <label>
          Unit Fit
          <input
            onChange={(event) => updateField("unitFit", event.target.value)}
            placeholder="Close Reading, Argument Writing"
            value={form.unitFit}
          />
        </label>
        <label>
          Skill Tags
          <input
            onChange={(event) => updateField("skillTags", event.target.value)}
            placeholder="rhetoric, citation, theme"
            value={form.skillTags}
          />
        </label>
      </div>

      <fieldset className="source-checklist">
        <legend>License Checklist</legend>
        <label>
          <input
            checked={form.canLink}
            onChange={(event) => updateChecklist("freeToAccess", event.target.checked)}
            type="checkbox"
          />
          Is this resource free to access?
        </label>
        <label>
          <input
            checked={form.publicDomainUS}
            onChange={(event) => updateChecklist("publicDomainUS", event.target.checked)}
            type="checkbox"
          />
          Is it public domain in the United States?
        </label>
        <label>
          <input
            checked={form.licenseType.startsWith("cc_")}
            onChange={(event) => updateChecklist("openLicense", event.target.checked)}
            type="checkbox"
          />
          Does it have a Creative Commons or open license?
        </label>
        <label>
          <input
            checked={form.canEmbed}
            onChange={(event) =>
              updateChecklist("providerAllowsEmbedding", event.target.checked)
            }
            type="checkbox"
          />
          Does the provider allow embedding/copying into another app?
        </label>
        <label>
          <input
            checked={form.requiresAttribution}
            onChange={(event) =>
              updateChecklist("requiresAttribution", event.target.checked)
            }
            type="checkbox"
          />
          Does it require attribution?
        </label>
        <label>
          <input
            checked={form.canLink && !form.canEmbed}
            onChange={(event) => updateChecklist("shouldBeLinkOnly", event.target.checked)}
            type="checkbox"
          />
          Should this be link-only?
        </label>
        <label>
          <input
            checked={form.approvalStatus === "approved"}
            disabled={!isAdmin}
            onChange={(event) => updateChecklist("hasReviewed", event.target.checked)}
            type="checkbox"
          />
          Has this resource been reviewed?
        </label>
      </fieldset>

      <div className="source-form-grid">
        <label>
          Approval Status
          <select
            disabled={!isAdmin}
            onChange={(event) => updateField("approvalStatus", event.target.value)}
            value={form.approvalStatus}
          >
            {approvalStatusOptions.map((option) => (
              <option key={option} value={option}>
                {formatLabel(option)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Text Type
          <input
            onChange={(event) => updateField("textType", event.target.value)}
            value={form.textType}
          />
        </label>
        <label>
          Grade Band
          <input
            onChange={(event) => updateField("gradeBand", event.target.value)}
            value={form.gradeBand}
          />
        </label>
        <label>
          Recommended Grade
          <input
            onChange={(event) => updateField("recommendedGradeLevel", event.target.value)}
            value={form.recommendedGradeLevel}
          />
        </label>
      </div>

      <label className="source-wide-field">
        Attribution Text
        <textarea
          onChange={(event) => updateField("attributionText", event.target.value)}
          value={form.attributionText}
        />
      </label>
      <label className="source-wide-field">
        Usage Notes
        <textarea
          onChange={(event) => updateField("usageNotes", event.target.value)}
          value={form.usageNotes}
        />
      </label>
      <label className="source-wide-field">
        Restrictions
        <textarea
          onChange={(event) => updateField("restrictions", event.target.value)}
          value={form.restrictions}
        />
      </label>

      <div className="button-row">
        <button className="primary-button fit-button" type="submit">
          Save Resource
        </button>
        <button className="secondary-button fit-button" onClick={onCancel} type="button">
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function SourceLibrary({
  compact = false,
  onSelectResource,
  pickerMode = false,
  role,
  school,
  user,
}) {
  const [resources, setResources] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [editingResource, setEditingResource] = useState(null);
  const [viewingResource, setViewingResource] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const canManage = role === "admin" || role === "teacher";
  const canApprove = role === "admin";

  useEffect(() => {
    if (!school) return undefined;

    setIsLoading(true);
    return subscribeSourceLibrary(
      { role, school, user },
      (nextResources) => {
        setResources(nextResources);
        setError("");
        setIsLoading(false);
      },
      (loadError) => {
        console.error("Source library failed to load", loadError);
        setError("Unable to load English 1 source library.");
        setIsLoading(false);
      },
    );
  }, [role, school, user]);

  const filteredResources = useMemo(() => {
    const cleanSearch = search.trim().toLowerCase();

    return resources.filter((resource) => {
      if (!resourceMatchesFilter(resource, filter)) return false;

      if (!cleanSearch) return true;

      return [
        resource.title,
        resource.author,
        resource.providerName,
        arrayText(resource.skillTags),
        arrayText(resource.unitFit),
      ]
        .join(" ")
        .toLowerCase()
        .includes(cleanSearch);
    });
  }, [filter, resources, search]);

  const approvedCount = resources.filter(
    (resource) => resource.approvalStatus === "approved",
  ).length;

  async function handleSave(event, formResource) {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    setMessage("");

    try {
      await saveSourceResource({
        resource: formResource,
        role,
        school,
        user,
      });
      setEditingResource(null);
      setMessage(
        role === "admin"
          ? "Resource saved."
          : "Resource suggestion saved for admin review.",
      );
    } catch (saveError) {
      console.error("Unable to save source resource", saveError);
      setError(
        saveError instanceof SourceLibraryError
          ? saveError.message
          : "Unable to save resource.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleStatus(resource, approvalStatus) {
    if (approvalStatus === "approved" && resource.licenseType === "unknown_needs_review") {
      setError("Unknown-license resources must be edited before approval.");
      return;
    }

    setError("");
    setMessage("");
    setIsSaving(true);

    try {
      await saveSourceResource({
        resource: {
          ...resource,
          approvalStatus,
          canEmbed:
            approvalStatus === "approved" && canResourceBeEmbedded(resource)
              ? resource.canEmbed
              : false,
        },
        role,
        school,
        user,
      });
      setMessage(`Resource marked ${formatLabel(approvalStatus)}.`);
    } catch (statusError) {
      console.error("Unable to update source resource", statusError);
      setError(
        statusError instanceof SourceLibraryError
          ? statusError.message
          : "Unable to update resource status.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeactivate(resource) {
    const confirmed = window.confirm(
      `Deactivate "${resource.title}"? This hides it from the Source Library.`,
    );

    if (!confirmed) return;

    setIsSaving(true);
    setError("");
    setMessage("");

    try {
      await deactivateSourceResource({ resource, school, user });
      setMessage("Resource deactivated.");
    } catch (deleteError) {
      console.error("Unable to deactivate source resource", deleteError);
      setError("Unable to deactivate resource.");
    } finally {
      setIsSaving(false);
    }
  }

  const shellClass = compact
    ? "source-library-shell compact-source-library"
    : "card dashboard-card source-library-shell";

  return (
    <section className={shellClass}>
      <div className="section-heading-row">
        <div>
          <p className="eyebrow">English 1</p>
          <h2>Source Library</h2>
          <p className="helper-copy">
            Use public-domain, open-license, or link-only resources. Do not paste
            copyrighted text into Gamble.
          </p>
        </div>
        {canManage ? (
          <button
            className="primary-button fit-button"
            onClick={() => setEditingResource(EMPTY_RESOURCE)}
            type="button"
          >
            {role === "admin" ? "Add Resource" : "Suggest Resource"}
          </button>
        ) : null}
      </div>

      <div className="source-safety-banner">
        <strong>Copyright safety:</strong> this library stores source metadata,
        links, attribution, tags, and usage notes only. Full readings are added
        later only after rights are reviewed.
      </div>

      {message ? <p className="status-message success">{message}</p> : null}
      {error ? <p className="error-message">{error}</p> : null}

      <div className="source-library-controls">
        <label>
          Search
          <input
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Title, provider, author, skill"
            value={search}
          />
        </label>
        <label>
          Filter
          <select onChange={(event) => setFilter(event.target.value)} value={filter}>
            {FILTERS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {isLoading ? (
        <p className="muted-message">Loading English 1 resources...</p>
      ) : resources.length ? (
        <>
          {!approvedCount ? (
            <p className="status-message danger">
              No approved English 1 resources yet. Add or approve public-domain,
              open-license, or link-only resources.
            </p>
          ) : null}

          <div className="source-table-wrap">
            <table className="source-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Provider</th>
                  <th>Type</th>
                  <th>License</th>
                  <th>Use</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredResources.map((resource) => (
                  <tr key={resource.sourceId}>
                    <td>
                      <strong>{resource.title}</strong>
                      {resource.isSeed ? <span className="demo-label">Seed</span> : null}
                    </td>
                    <td>{resource.providerName || "--"}</td>
                    <td>{formatLabel(resource.resourceType)}</td>
                    <td>{formatLabel(resource.licenseType)}</td>
                    <td>
                      <UsePill resource={resource} />
                    </td>
                    <td>
                      <StatusPill resource={resource} />
                    </td>
                    <td>
                      <div className="source-actions">
                        {pickerMode && resource.approvalStatus === "approved" ? (
                          <button
                            className="secondary-button fit-button"
                            onClick={() => onSelectResource?.(resource)}
                            type="button"
                          >
                            Select
                          </button>
                        ) : null}
                        <button
                          className="secondary-button fit-button"
                          onClick={() => setViewingResource(resource)}
                          type="button"
                        >
                          View
                        </button>
                        {canManage ? (
                          <button
                            className="secondary-button fit-button"
                            onClick={() => setEditingResource(resource)}
                            type="button"
                          >
                            Edit
                          </button>
                        ) : null}
                        {canApprove ? (
                          <>
                            <button
                              className="secondary-button fit-button"
                              disabled={isSaving}
                              onClick={() => handleStatus(resource, "approved")}
                              type="button"
                            >
                              Approve
                            </button>
                            <button
                              className="danger-button fit-button"
                              disabled={isSaving}
                              onClick={() => handleStatus(resource, "rejected")}
                              type="button"
                            >
                              Reject
                            </button>
                            {!resource.isSeed ? (
                              <button
                                className="danger-button fit-button"
                                disabled={isSaving}
                                onClick={() => handleDeactivate(resource)}
                                type="button"
                              >
                                Deactivate
                              </button>
                            ) : null}
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!filteredResources.length ? (
            <p className="muted-message">
              No resources match the selected search and filter.
            </p>
          ) : null}
        </>
      ) : (
        <p className="muted-message">No English 1 resources have been added yet.</p>
      )}

      {editingResource ? (
        <div className="preview-modal-backdrop" role="presentation">
          <section
            aria-label="Edit source resource"
            className="preview-modal source-edit-modal"
            role="dialog"
          >
            <div className="section-heading-row">
              <div>
                <p className="eyebrow">Source Library</p>
                <h2>{editingResource.sourceId ? "Edit Resource" : "Add Resource"}</h2>
              </div>
              <button
                className="secondary-button fit-button"
                onClick={() => setEditingResource(null)}
                type="button"
              >
                Close
              </button>
            </div>
            <SourceResourceForm
              initialResource={editingResource}
              onCancel={() => setEditingResource(null)}
              onSave={handleSave}
              role={role}
            />
          </section>
        </div>
      ) : null}

      {viewingResource ? (
        <ResourceDetail
          onClose={() => setViewingResource(null)}
          resource={viewingResource}
        />
      ) : null}
    </section>
  );
}
