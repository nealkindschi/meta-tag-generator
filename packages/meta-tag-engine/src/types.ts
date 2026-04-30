export interface UserInput {
  rawInput: string;
  keywords: string[];
  serpResearch: boolean;
  pageUrl?: string;
  pageContent?: string;
}

export interface ParsedInput {
  audience: string;
  topic: string;
  purpose: string;
  action: string;
  primaryTopic: string;
}

export interface SerpResult {
  title: string;
  description: string;
  url: string;
}

export type SerpContext = "researched" | "simulated" | "none";

export interface MetaTagVersion {
  title: string;
  titleLength: number;
  titleValid: boolean;
  titleWarnings: string[];
  description: string;
  descriptionLength: number;
  descriptionValid: boolean;
  descriptionWarnings: string[];
  ctaDetected: boolean;
  keywordVariation: boolean;
  keywordsFrontloaded: boolean;
  badge: "green" | "red";
}

export interface GenerateResult {
  versions: MetaTagVersion[];
  serpContext: SerpContext;
  primaryTopic: string;
  computeTime?: number;
}
