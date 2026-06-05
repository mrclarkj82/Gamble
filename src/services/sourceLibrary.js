import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  copyrightStatusOptions,
  englishSourceLibrarySeeds,
  licenseTypeOptions,
} from "../data/sourceLibrarySeeds";
import { db } from "../firebase";

const EMBEDDABLE_LICENSE_TYPES = new Set([
  "public_domain",
  "project_gutenberg_public_domain",
  "government_public_domain",
  "cc_by",
  "cc_by_sa",
  "cc_by_nc",
  "cc_by_nc_sa",
]);

const LINK_ONLY_COPYRIGHT_STATUSES = new Set([
  "free_access_not_republishable",
  "link_only",
  "restricted",
]);

export class SourceLibraryError extends Error {
  constructor(message) {
    super(message);
    this.name = "SourceLibraryError";
  }
}

function cleanText(value = "") {
  return String(value).trim().replace(/\s+/g, " ");
}

function getSchoolId(school) {
  return school?.schoolId || school?.id || "doral-red-rock";
}

function sourceLibraryCollection(schoolId) {
  return collection(db, "schools", schoolId, "sourceLibrary");
}

function sourceLibraryDoc(schoolId, sourceId) {
  return doc(db, "schools", schoolId, "sourceLibrary", sourceId);
}

function readSnapshot(snapshot) {
  return snapshot.docs.map((item) => ({
    id: item.id,
    sourceId: item.id,
    ...item.data(),
    isSeed: false,
  }));
}

function timestampMillis(value) {
  if (value && typeof value.toMillis === "function") return value.toMillis();
  if (value && typeof value.getTime === "function") return value.getTime();
  return 0;
}

function titleSort(left, right) {
  const statusOrder = {
    approved: 0,
    needs_review: 1,
    rejected: 2,
  };

  const leftStatus = statusOrder[left.approvalStatus] ?? 3;
  const rightStatus = statusOrder[right.approvalStatus] ?? 3;

  if (leftStatus !== rightStatus) return leftStatus - rightStatus;

  const leftUpdated = timestampMillis(left.updatedAt);
  const rightUpdated = timestampMillis(right.updatedAt);

  if (leftUpdated !== rightUpdated) return rightUpdated - leftUpdated;

  return (left.title || "").localeCompare(right.title || "");
}

function seedResourcesForRole(role) {
  const isAdmin = role === "admin";

  return englishSourceLibrarySeeds
    .filter((resource) => isAdmin || resource.approvalStatus === "approved")
    .map((resource) => ({
      ...resource,
      isSeed: true,
      active: resource.active !== false,
    }));
}

function mergeSeedAndFirestoreResources(remoteResources, role) {
  const resourceMap = new Map();

  seedResourcesForRole(role).forEach((resource) => {
    resourceMap.set(resource.sourceId, resource);
  });

  remoteResources.forEach((resource) => {
    resourceMap.set(resource.sourceId || resource.id, resource);
  });

  return Array.from(resourceMap.values())
    .filter((resource) => resource.active !== false)
    .sort(titleSort);
}

function makeSourceId(title) {
  const slug =
    cleanText(title)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 48) || "source";

  const randomPart =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);

  return `${slug}-${randomPart}`;
}

function stringArray(value) {
  if (Array.isArray(value)) {
    return value.map(cleanText).filter(Boolean);
  }

  return String(value || "")
    .split(",")
    .map(cleanText)
    .filter(Boolean);
}

function bool(value) {
  return value === true;
}

export function canResourceBeEmbedded(resource) {
  return (
    resource?.canEmbed === true &&
    resource.approvalStatus === "approved" &&
    EMBEDDABLE_LICENSE_TYPES.has(resource.licenseType) &&
    !LINK_ONLY_COPYRIGHT_STATUSES.has(resource.copyrightStatus) &&
    !/do not embed|link-only|do not copy/i.test(resource.restrictions || "") &&
    Boolean(cleanText(resource.sourceUrl)) &&
    (!resource.requiresAttribution || Boolean(cleanText(resource.attributionText)))
  );
}

export function getResourceUseLabel(resource) {
  if (canResourceBeEmbedded(resource)) return "Embeddable";
  if (resource?.canLink) return "Link Only";
  return "Needs Review";
}

export function normalizeSourceResource(input, { role, school, user }) {
  const schoolId = getSchoolId(school);
  const isAdmin = role === "admin";
  const licenseType = licenseTypeOptions.includes(input.licenseType)
    ? input.licenseType
    : "unknown_needs_review";
  const copyrightStatus = copyrightStatusOptions.includes(input.copyrightStatus)
    ? input.copyrightStatus
    : "unknown";

  let approvalStatus = input.approvalStatus || "needs_review";
  let canEmbed = bool(input.canEmbed);
  let canLink = input.canLink !== false;
  let canModify = bool(input.canModify);

  if (!isAdmin) {
    approvalStatus = "needs_review";
    canEmbed = false;
  }

  if (licenseType === "unknown_needs_review") {
    approvalStatus = "needs_review";
    canEmbed = false;
  }

  if (
    licenseType === "free_to_use_link_only" ||
    LINK_ONLY_COPYRIGHT_STATUSES.has(copyrightStatus)
  ) {
    canEmbed = false;
    canLink = true;
    canModify = false;
  }

  if (approvalStatus !== "approved") {
    canEmbed = false;
  }

  const title = cleanText(input.title);
  const sourceId = cleanText(input.sourceId) || makeSourceId(title);

  return {
    sourceId,
    schoolId,
    courseId: "english-1",
    subject: "english",
    title,
    author: cleanText(input.author),
    providerName: cleanText(input.providerName),
    providerType: cleanText(input.providerType || "teacher_added"),
    resourceType: cleanText(input.resourceType || "external_link"),
    sourceUrl: cleanText(input.sourceUrl),
    canonicalUrl: cleanText(input.canonicalUrl || input.sourceUrl),
    gradeBand: cleanText(input.gradeBand || "9-12"),
    recommendedGradeLevel: cleanText(input.recommendedGradeLevel || "9"),
    unitFit: stringArray(input.unitFit),
    skillTags: stringArray(input.skillTags),
    textType: cleanText(input.textType),
    licenseType,
    licenseName: cleanText(input.licenseName),
    licenseUrl: cleanText(input.licenseUrl),
    copyrightStatus,
    publicDomainUS: bool(input.publicDomainUS),
    canLink,
    canEmbed,
    canModify,
    requiresAttribution: bool(input.requiresAttribution),
    attributionText: cleanText(input.attributionText),
    usageNotes: cleanText(input.usageNotes),
    restrictions: cleanText(input.restrictions),
    approvalStatus,
    reviewedByUid:
      isAdmin && ["approved", "rejected"].includes(approvalStatus)
        ? user?.uid || ""
        : cleanText(input.reviewedByUid),
    reviewedAt: input.reviewedAt || null,
    createdByUid: cleanText(input.createdByUid || user?.uid || ""),
    createdAt: input.createdAt || null,
    updatedByUid: user?.uid || "",
    updatedAt: input.updatedAt || null,
    active: input.active !== false,
  };
}

export function validateSourceResource(resource) {
  const requiredFields = [
    ["title", "Title is required."],
    ["providerName", "Provider name is required."],
    ["sourceUrl", "Source URL is required."],
    ["resourceType", "Resource type is required."],
    ["licenseType", "License type is required."],
    ["copyrightStatus", "Copyright status is required."],
    ["approvalStatus", "Approval status is required."],
  ];

  requiredFields.forEach(([field, message]) => {
    if (!cleanText(resource[field])) {
      throw new SourceLibraryError(message);
    }
  });

  if (typeof resource.canLink !== "boolean" || typeof resource.canEmbed !== "boolean") {
    throw new SourceLibraryError("Choose whether the resource can be linked and embedded.");
  }

  if (resource.licenseType === "unknown_needs_review") {
    if (resource.approvalStatus !== "needs_review" || resource.canEmbed) {
      throw new SourceLibraryError(
        "Unknown-license resources must stay needs review and cannot be embedded.",
      );
    }
  }

  if (
    resource.copyrightStatus === "free_access_not_republishable" ||
    resource.copyrightStatus === "link_only"
  ) {
    if (resource.canEmbed) {
      throw new SourceLibraryError(
        "This resource is marked link-only. Do not paste the full text into Gamble. Link to the original source instead.",
      );
    }
  }

  if (resource.canEmbed) {
    if (resource.approvalStatus !== "approved") {
      throw new SourceLibraryError("A resource must be approved before it can be embedded.");
    }

    if (!EMBEDDABLE_LICENSE_TYPES.has(resource.licenseType)) {
      throw new SourceLibraryError(
        "Choose a public-domain, government-public-domain, or Creative Commons/open license before embedding.",
      );
    }

    if (
      !resource.licenseName ||
      (!resource.licenseUrl &&
        resource.licenseType !== "public_domain" &&
        resource.licenseType !== "government_public_domain")
    ) {
      throw new SourceLibraryError(
        "Embeddable resources need license details before they can be saved.",
      );
    }

    if (resource.requiresAttribution && !resource.attributionText) {
      throw new SourceLibraryError(
        "Attribution required before this resource can be used in a lesson.",
      );
    }
  }
}

export function subscribeSourceLibrary({ role, school, user }, onNext, onError) {
  const schoolId = getSchoolId(school);
  const isAdmin = role === "admin";
  const sourceCollection = sourceLibraryCollection(schoolId);

  if (isAdmin) {
    return onSnapshot(
      sourceCollection,
      (snapshot) => {
        onNext(mergeSeedAndFirestoreResources(readSnapshot(snapshot), role));
      },
      onError,
    );
  }

  let approvedResources = [];
  let ownResources = [];

  function emitMerged() {
    const resourceMap = new Map();

    approvedResources.forEach((resource) => {
      resourceMap.set(resource.sourceId, resource);
    });

    ownResources.forEach((resource) => {
      resourceMap.set(resource.sourceId, resource);
    });

    onNext(mergeSeedAndFirestoreResources(Array.from(resourceMap.values()), role));
  }

  const unsubscribeApproved = onSnapshot(
    query(sourceCollection, where("approvalStatus", "==", "approved")),
    (snapshot) => {
      approvedResources = readSnapshot(snapshot).filter(
        (resource) => resource.active !== false,
      );
      emitMerged();
    },
    onError,
  );

  const unsubscribeOwnSuggestions = user?.uid
    ? onSnapshot(
        query(sourceCollection, where("createdByUid", "==", user.uid)),
        (snapshot) => {
          ownResources = readSnapshot(snapshot).filter(
            (resource) => resource.active !== false,
          );
          emitMerged();
        },
        onError,
      )
    : () => {};

  return () => {
    unsubscribeApproved();
    unsubscribeOwnSuggestions();
  };
}

export async function saveSourceResource({ resource, role, school, user }) {
  const schoolId = getSchoolId(school);
  const normalized = normalizeSourceResource(resource, { role, school, user });
  validateSourceResource(normalized);

  const resourceRef = sourceLibraryDoc(schoolId, normalized.sourceId);
  const existingSnapshot = await getDoc(resourceRef);
  const existingData = existingSnapshot.exists() ? existingSnapshot.data() : {};
  const reviewedAt =
    role === "admin" && ["approved", "rejected"].includes(normalized.approvalStatus)
      ? serverTimestamp()
      : normalized.reviewedAt || existingData.reviewedAt || null;

  const payload = {
    ...normalized,
    createdByUid: existingData.createdByUid || normalized.createdByUid || user?.uid || "",
    createdAt: existingData.createdAt || serverTimestamp(),
    reviewedAt,
    updatedByUid: user?.uid || "",
    updatedAt: serverTimestamp(),
  };

  await setDoc(resourceRef, payload, { merge: true });
  return payload;
}

export async function deactivateSourceResource({ resource, school, user }) {
  if (!resource?.sourceId) return;

  const schoolId = getSchoolId(school);
  await updateDoc(sourceLibraryDoc(schoolId, resource.sourceId), {
    active: false,
    approvalStatus: "rejected",
    updatedByUid: user?.uid || "",
    updatedAt: serverTimestamp(),
  });
}
