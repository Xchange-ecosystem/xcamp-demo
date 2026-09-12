// src/contexts/investor-match-threshold.tsx
//
// The one piece of Portfolio filter state that Home also needs: the
// "Match investment criteria %" lever value, which drives the vertical
// mandate-threshold line on Home's ranked bar chart (session brief §2 —
// "Tied dynamically to the... lever value from the Portfolio page's filter
// accordion — not a hardcoded constant"). Now that Home and Portfolio are
// separate routes/pages (previously one page conflated both — see the
// brief's own correction note), this single number needs to outlive
// Portfolio's local filter state and be readable from Home. Everything
// else in Portfolio's filter accordion (risk/round/ask/ticket/club) stays
// page-local — only this value is shared, so a dedicated small context
// beats folding it into PortfolioFilterState or investor-ecosystem.tsx.
import { createContext, useContext, useState, type ReactNode } from "react";

// Keep in sync with dealHelpers.ts's MATCH_PCT_DEFAULT by hand — duplicated
// rather than imported to avoid a contexts/ -> features/ dependency for one
// literal.
const DEFAULT_MATCH_THRESHOLD = 50;

interface InvestorMatchThresholdValue {
  minMatchPct: number;
  setMinMatchPct: (next: number) => void;
}

const InvestorMatchThresholdContext = createContext<InvestorMatchThresholdValue | undefined>(
  undefined,
);

export function InvestorMatchThresholdProvider({ children }: { children: ReactNode }) {
  const [minMatchPct, setMinMatchPct] = useState(DEFAULT_MATCH_THRESHOLD);
  return (
    <InvestorMatchThresholdContext.Provider value={{ minMatchPct, setMinMatchPct }}>
      {children}
    </InvestorMatchThresholdContext.Provider>
  );
}

export function useInvestorMatchThreshold(): InvestorMatchThresholdValue {
  const ctx = useContext(InvestorMatchThresholdContext);
  if (!ctx) {
    throw new Error("useInvestorMatchThreshold must be used within InvestorMatchThresholdProvider");
  }
  return ctx;
}
