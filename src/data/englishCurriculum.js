export const englishAssignmentTypes = [
  {
    typeId: "reading-check",
    title: "Reading Check",
    description: "Short comprehension checks tied to assigned reading.",
    supportsAutoGrade: true,
    supportsTeacherFeedback: true,
    supportsRubric: false,
    supportsResubmission: true,
    futureLiveMonitorFields: [
      "openedAt",
      "lastActivityAt",
      "answeredCount",
      "totalQuestions",
      "progressPercent",
      "submittedAt",
      "attemptNumber",
      "status",
    ],
  },
  {
    typeId: "short-response",
    title: "Short Response",
    description: "Brief evidence-based written responses.",
    supportsAutoGrade: false,
    supportsTeacherFeedback: true,
    supportsRubric: true,
    supportsResubmission: true,
    futureLiveMonitorFields: [
      "openedAt",
      "lastActivityAt",
      "draftWordCount",
      "progressPercent",
      "submittedAt",
      "attemptNumber",
      "status",
    ],
  },
  {
    typeId: "paragraph-response",
    title: "Paragraph Response",
    description: "Structured paragraph writing with claim, evidence, and reasoning.",
    supportsAutoGrade: false,
    supportsTeacherFeedback: true,
    supportsRubric: true,
    supportsResubmission: true,
    futureLiveMonitorFields: [
      "openedAt",
      "lastActivityAt",
      "draftWordCount",
      "progressPercent",
      "submittedAt",
      "attemptNumber",
      "status",
    ],
  },
  {
    typeId: "vocabulary-practice",
    title: "Vocabulary Practice",
    description: "Academic and text-based vocabulary practice.",
    supportsAutoGrade: true,
    supportsTeacherFeedback: true,
    supportsRubric: false,
    supportsResubmission: true,
    futureLiveMonitorFields: [
      "openedAt",
      "lastActivityAt",
      "answeredCount",
      "totalQuestions",
      "progressPercent",
      "submittedAt",
      "attemptNumber",
      "status",
    ],
  },
  {
    typeId: "grammar-mini-lesson",
    title: "Grammar Mini-Lesson",
    description: "Focused grammar and sentence craft practice.",
    supportsAutoGrade: true,
    supportsTeacherFeedback: true,
    supportsRubric: false,
    supportsResubmission: true,
    futureLiveMonitorFields: [
      "openedAt",
      "lastActivityAt",
      "answeredCount",
      "totalQuestions",
      "progressPercent",
      "submittedAt",
      "attemptNumber",
      "status",
    ],
  },
  {
    typeId: "annotation-assignment",
    title: "Annotation Assignment",
    description: "Guided annotation tasks for future reading passages.",
    supportsAutoGrade: false,
    supportsTeacherFeedback: true,
    supportsRubric: true,
    supportsResubmission: true,
    futureLiveMonitorFields: [
      "openedAt",
      "lastActivityAt",
      "annotationCount",
      "progressPercent",
      "submittedAt",
      "attemptNumber",
      "status",
    ],
  },
  {
    typeId: "literary-analysis",
    title: "Literary Analysis",
    description: "Analysis of literary elements and author's choices.",
    supportsAutoGrade: false,
    supportsTeacherFeedback: true,
    supportsRubric: true,
    supportsResubmission: true,
    futureLiveMonitorFields: [
      "openedAt",
      "lastActivityAt",
      "draftWordCount",
      "progressPercent",
      "submittedAt",
      "attemptNumber",
      "status",
    ],
  },
  {
    typeId: "informational-text-analysis",
    title: "Informational Text Analysis",
    description: "Analysis of central idea, claims, evidence, and rhetoric.",
    supportsAutoGrade: false,
    supportsTeacherFeedback: true,
    supportsRubric: true,
    supportsResubmission: true,
    futureLiveMonitorFields: [
      "openedAt",
      "lastActivityAt",
      "draftWordCount",
      "progressPercent",
      "submittedAt",
      "attemptNumber",
      "status",
    ],
  },
  {
    typeId: "argument-writing",
    title: "Argument Writing",
    description: "Argument writing with claims, evidence, reasoning, and counterclaims.",
    supportsAutoGrade: false,
    supportsTeacherFeedback: true,
    supportsRubric: true,
    supportsResubmission: true,
    futureLiveMonitorFields: [
      "openedAt",
      "lastActivityAt",
      "draftWordCount",
      "progressPercent",
      "submittedAt",
      "attemptNumber",
      "status",
    ],
  },
  {
    typeId: "discussion-response",
    title: "Discussion Response",
    description: "Written discussion posts and replies connected to class reading.",
    supportsAutoGrade: false,
    supportsTeacherFeedback: true,
    supportsRubric: true,
    supportsResubmission: true,
    futureLiveMonitorFields: [
      "openedAt",
      "lastActivityAt",
      "draftWordCount",
      "progressPercent",
      "submittedAt",
      "attemptNumber",
      "status",
    ],
  },
];

export const englishUnits = [
  {
    unitId: "close-reading-foundations",
    title: "Close Reading Foundations",
    description:
      "Students build foundational habits for noticing details, identifying meaning, and supporting responses with evidence.",
    order: 1,
    skills: [
      "annotation basics",
      "main idea",
      "theme",
      "textual evidence",
      "short constructed responses",
      "academic vocabulary",
    ],
    lessons: [
      {
        lessonId: "what-is-close-reading",
        title: "What Does It Mean to Read Closely?",
        objective:
          "Students will identify the purpose of close reading and practice noticing details in a short, copyright-safe text.",
        estimatedMinutes: 45,
        skills: ["annotation basics", "textual evidence"],
        placeholderContentNote:
          "Reading content will be added in Version 6.1/6.3 using public-domain or freely licensed resources.",
        futureAssignmentSlots: ["Reading Check", "Short Response"],
      },
      {
        lessonId: "evidence-based-responses",
        title: "Building Evidence-Based Responses",
        objective:
          "Students will connect observations to evidence and write a brief response using quoted or paraphrased support.",
        estimatedMinutes: 45,
        skills: ["textual evidence", "short constructed responses"],
        placeholderContentNote:
          "Copyright-safe practice passages and prompts will be added in a later English content phase.",
        futureAssignmentSlots: ["Short Response", "Paragraph Response"],
      },
    ],
    assignmentTypePlaceholders: ["Reading Check", "Short Response", "Vocabulary Practice"],
  },
  {
    unitId: "short-stories-literary-elements",
    title: "Short Stories and Literary Elements",
    description:
      "Students examine how literary elements work together to develop meaning in short fiction.",
    order: 2,
    skills: [
      "plot",
      "conflict",
      "character",
      "setting",
      "narrator",
      "irony",
      "theme",
      "author's choices",
    ],
    lessons: [
      {
        lessonId: "plot-conflict-character",
        title: "Plot, Conflict, and Character",
        objective:
          "Students will identify key story elements and explain how conflict reveals character.",
        estimatedMinutes: 50,
        skills: ["plot", "conflict", "character"],
        placeholderContentNote:
          "Short story texts will be selected later from public-domain or freely licensed sources.",
        futureAssignmentSlots: ["Reading Check", "Literary Analysis"],
      },
      {
        lessonId: "narrator-theme-authors-choices",
        title: "Narrator, Theme, and Author's Choices",
        objective:
          "Students will explain how point of view and author choices shape a story's theme.",
        estimatedMinutes: 50,
        skills: ["narrator", "theme", "author's choices"],
        placeholderContentNote:
          "Model texts and questions will be added after source licensing is confirmed.",
        futureAssignmentSlots: ["Short Response", "Literary Analysis"],
      },
    ],
    assignmentTypePlaceholders: ["Reading Check", "Literary Analysis", "Discussion Response"],
  },
  {
    unitId: "informational-text-rhetoric",
    title: "Informational Text and Rhetoric",
    description:
      "Students analyze claims, evidence, structure, tone, and purpose in informational texts.",
    order: 3,
    skills: [
      "central idea",
      "claim",
      "evidence",
      "rhetorical appeals",
      "tone",
      "author's purpose",
      "structure",
    ],
    lessons: [
      {
        lessonId: "central-idea-claim-evidence",
        title: "Central Idea, Claim, and Evidence",
        objective:
          "Students will distinguish central ideas from claims and evaluate evidence.",
        estimatedMinutes: 50,
        skills: ["central idea", "claim", "evidence"],
        placeholderContentNote:
          "Informational texts will be added using public-domain or freely licensed sources.",
        futureAssignmentSlots: ["Reading Check", "Informational Text Analysis"],
      },
      {
        lessonId: "rhetorical-appeals-and-tone",
        title: "Rhetorical Appeals and Tone",
        objective:
          "Students will identify rhetorical appeals and explain how tone supports purpose.",
        estimatedMinutes: 50,
        skills: ["rhetorical appeals", "tone", "author's purpose"],
        placeholderContentNote:
          "Rhetoric examples will be added only after source rights are verified.",
        futureAssignmentSlots: ["Short Response", "Informational Text Analysis"],
      },
    ],
    assignmentTypePlaceholders: [
      "Reading Check",
      "Informational Text Analysis",
      "Discussion Response",
    ],
  },
  {
    unitId: "poetry-figurative-language",
    title: "Poetry and Figurative Language",
    description:
      "Students study poetic language, sound, imagery, and symbolism to interpret theme.",
    order: 4,
    skills: ["imagery", "metaphor", "symbolism", "speaker", "tone", "sound devices", "theme"],
    lessons: [
      {
        lessonId: "imagery-metaphor-symbolism",
        title: "Imagery, Metaphor, and Symbolism",
        objective:
          "Students will identify figurative language and explain how it creates meaning.",
        estimatedMinutes: 45,
        skills: ["imagery", "metaphor", "symbolism"],
        placeholderContentNote:
          "Poems will be added later from public-domain or freely licensed collections.",
        futureAssignmentSlots: ["Annotation Assignment", "Short Response"],
      },
      {
        lessonId: "speaker-tone-sound",
        title: "Speaker, Tone, and Sound",
        objective:
          "Students will analyze speaker, tone, and sound devices in a poem.",
        estimatedMinutes: 45,
        skills: ["speaker", "tone", "sound devices"],
        placeholderContentNote:
          "Poetry texts and audio supports will be added in a later English content phase.",
        futureAssignmentSlots: ["Reading Check", "Literary Analysis"],
      },
    ],
    assignmentTypePlaceholders: ["Annotation Assignment", "Short Response", "Literary Analysis"],
  },
  {
    unitId: "argument-writing-research",
    title: "Argument Writing and Research",
    description:
      "Students develop argument writing using credible evidence, reasoning, and organization.",
    order: 5,
    skills: [
      "claim",
      "evidence",
      "reasoning",
      "counterclaim",
      "source credibility",
      "citation basics",
      "paragraph and essay organization",
    ],
    lessons: [
      {
        lessonId: "claims-reasoning-counterclaims",
        title: "Claims, Reasoning, and Counterclaims",
        objective:
          "Students will build an argument paragraph that includes a claim, evidence, reasoning, and counterclaim.",
        estimatedMinutes: 55,
        skills: ["claim", "evidence", "reasoning", "counterclaim"],
        placeholderContentNote:
          "Practice sources will be added after free/open resource review.",
        futureAssignmentSlots: ["Paragraph Response", "Argument Writing"],
      },
      {
        lessonId: "source-credibility-citations",
        title: "Source Credibility and Citation Basics",
        objective:
          "Students will evaluate source credibility and practice basic citation habits.",
        estimatedMinutes: 55,
        skills: ["source credibility", "citation basics"],
        placeholderContentNote:
          "Research source sets will be added in a future phase.",
        futureAssignmentSlots: ["Reading Check", "Argument Writing"],
      },
    ],
    assignmentTypePlaceholders: ["Paragraph Response", "Argument Writing", "Discussion Response"],
  },
  {
    unitId: "drama-shakespeare-foundations",
    title: "Drama and Shakespeare Foundations",
    description:
      "Students learn drama conventions and build support for reading Shakespearean language and scenes.",
    order: 6,
    skills: [
      "drama structure",
      "dialogue",
      "characterization",
      "theme",
      "performance",
      "Shakespeare language support",
      "scene analysis",
    ],
    lessons: [
      {
        lessonId: "drama-structure-dialogue-performance",
        title: "Drama Structure, Dialogue, and Performance",
        objective:
          "Students will identify drama structures and explain how dialogue reveals character.",
        estimatedMinutes: 50,
        skills: ["drama structure", "dialogue", "performance"],
        placeholderContentNote:
          "Drama excerpts will be added only from public-domain or freely licensed sources.",
        futureAssignmentSlots: ["Reading Check", "Discussion Response"],
      },
      {
        lessonId: "shakespeare-language-scene-analysis",
        title: "Shakespeare Language and Scene Analysis",
        objective:
          "Students will use language supports to interpret a scene and explain character or theme.",
        estimatedMinutes: 55,
        skills: ["Shakespeare language support", "scene analysis", "theme"],
        placeholderContentNote:
          "Public-domain Shakespeare excerpts and supports will be added in a later phase.",
        futureAssignmentSlots: ["Annotation Assignment", "Literary Analysis"],
      },
    ],
    assignmentTypePlaceholders: ["Annotation Assignment", "Literary Analysis", "Discussion Response"],
  },
];

export const ENGLISH_1_COURSE = {
  curriculumId: "english-1",
  courseId: "english-1",
  title: "English 1",
  alternateTitle: "Freshman English",
  subject: "English Language Arts",
  subjectKey: "english",
  gradeLevel: "Grade 9 / Freshman",
  description:
    "A freshman English course focused on close reading, literary analysis, informational text, writing, vocabulary, grammar, discussion, and evidence-based responses.",
  active: true,
  isPrebuilt: true,
  units: englishUnits,
  assignmentTypes: englishAssignmentTypes,
};
