export const RESEARCH_GOALS = [
  "overall",
  "career",
  "relationships",
  "home",
  "travel",
] as const;

export type ResearchGoal = (typeof RESEARCH_GOALS)[number];

export type ResearchCity = {
  name: string;
  country: string;
  lat: number;
  lng: number;
  displayName?: string;
};

export type ResearchBirthProfile = {
  date: string;
  time: string;
  location: string;
  latitude: number;
  longitude: number;
  timezone: string;
};

export type ResearchProjectInput = {
  birthProfile: ResearchBirthProfile;
  goal: ResearchGoal;
  currentCity: ResearchCity;
  candidateCities: ResearchCity[];
  planDate: string;
  constraints: string;
};

export type ResearchProject = ResearchProjectInput & {
  id: string;
  createdAt: string;
  updatedAt: string;
};
