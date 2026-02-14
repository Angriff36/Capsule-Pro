# AI Event Summary Generation

## Outcome
The system generates concise, readable event summaries from full event details including client needs, menu items, timing, and special requirements. Summaries are useful for quick briefings and handoffs between team members.

## In Scope
- Generate summaries from event data including: client information, menu items, guest count, service timing, location, special requirements, and staff assignments
- Create summaries in natural language that highlight critical information
- Include key details: what, when, where, who, and special considerations
- Generate summaries on-demand or automatically when event details change significantly
- Present summaries in a format suitable for quick reading (1-2 paragraphs)

## Out of Scope
- Multi-language summary generation
- Custom summary templates or formatting preferences
- Summary versioning or history
- Integration with external briefing systems

## Invariants / Must Never Happen
- Summaries must never omit critical safety information (allergens, dietary restrictions, special requirements)
- Summaries must never include outdated information; they must reflect current event state
- Summary generation must never fail silently; if generation fails, show error message
- Summaries must never exceed reasonable length (target: 200-400 words)
- Summaries must never include sensitive financial or client-specific confidential information unless explicitly authorized

## Acceptance Checks
- Generate summary for event with full details → summary includes all key information in readable format
- Update event details → regenerated summary reflects changes
- Generate summary for event with allergens → allergen information included in summary
- Generate summary for event with minimal details → summary indicates missing information
- View summary → format is readable and highlights critical details
- Generate summary fails → error message shown with reason
