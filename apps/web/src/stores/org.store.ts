import { create } from "zustand";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  description?: string | null;
  website?: string | null;
  role?: string; // Member role in this organization
}

interface OrgState {
  currentOrganization: Organization | null;
  organizations: Organization[];
  setCurrentOrganization: (org: Organization | null) => void;
  setOrganizations: (orgs: Organization[]) => void;
  clearOrgState: () => void;
}

export const useOrgStore = create<OrgState>((set) => ({
  currentOrganization: null,
  organizations: [],

  setCurrentOrganization: (org) =>
    set({
      currentOrganization: org,
    }),

  setOrganizations: (orgs) =>
    set({
      organizations: orgs,
    }),

  clearOrgState: () =>
    set({
      currentOrganization: null,
      organizations: [],
    }),
}));
