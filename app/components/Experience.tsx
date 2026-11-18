"use client";
import { createContext, useContext } from "react";

export const ExperienceContext = createContext(false);
export function useNextExperience() {
  return useContext(ExperienceContext);
}

export function ExperienceProvider({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
  return <ExperienceContext.Provider value={enabled}>{children}</ExperienceContext.Provider>;
}
