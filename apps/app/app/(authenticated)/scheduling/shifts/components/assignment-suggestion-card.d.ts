import { type AssignmentSuggestion } from "../../../../lib/use-assignment";
type AssignmentSuggestionCardProps = {
  suggestion: AssignmentSuggestion;
  isBestMatch?: boolean;
  onSelect?: () => void;
  selected?: boolean;
};
export declare function AssignmentSuggestionCard({
  suggestion,
  isBestMatch,
  onSelect,
  selected,
}: AssignmentSuggestionCardProps): import("react").JSX.Element;
//# sourceMappingURL=assignment-suggestion-card.d.ts.map
