// Shared suggestion type — single source of truth used by the API route and
// the ProductSuggestions client component. Import from here, not from either
// consumer, to prevent the two definitions from silently diverging.
export type ProductSuggestion = {
  improvedTitle: string;
  improvedDescription: string;
  improvedDescriptionHtml: string;
  improvedSeoTitle: string;
  improvedSeoDescription: string;
  suggestedTags: string[];
  reasoning: string;
};
