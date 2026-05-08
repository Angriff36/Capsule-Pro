import pathlib

rule_content = """# Noun Stack (Bureaucratic Density)

**Category:** brainstorm
**Severity:** medium
**Detector sketch:** regex + heuristic
**Source:** brainstorm [2026-05-07 14:09 UTC]

## Rule pitch
Detect chains of three or more nouns used as adjectives before a final noun \u2014 the classic "enterprise customer data privacy compliance framework" construction. These noun stacks compress multiple modifier relationships into a single unreadable blob, forcing the reader to mentally parse which noun modifies which. LLMs are heavily prone to this because training data includes a lot of corporate/academic writing where noun stacking signals "serious" and "professional." Human writers in business and technical contexts generally break these up with prepositions or hyphenation.

## Why it matters for SlopScope
Medium-high signal, moderate noise. Noun stacking is one of the most reliable structural differentiators between human and LLM prose in professional contexts \u2014 it is not a content tell but a syntactic density tell. Documents with frequent noun stacks read as bureaucratic and impersonal, which correlates strongly with AI-generated business writing. Complements verb_phrase_inflation (which targets the verb side of the same density problem).

## Detector sketch
regex + heuristic \u2014 scan for sequences of 3+ capitalized or title-case nouns in a row before a final noun phrase. Pattern with POS-tag validation that each word is a noun. Weight higher when the chain exceeds 4 words or when multiple noun stacks appear within a single paragraph. Exclude known compound terms from a whitelist (e.g., "Chief Executive Officer", "Human Resources Department").

## FP risks & guards
Technical jargon naturally compounds nouns (e.g., "database query execution plan optimizer"). Guard against this with a domain-jargon whitelist and by requiring the stack to be non-hyphenated \u2014 properly hyphenated compounds are usually intentional. Also exclude code identifiers and API names. The 3+ threshold keeps noise low.

## Build-order hint
Phase 2 \u2014 requires POS tagging for reasonable accuracy, which pushes it past pure regex. Could start with a simpler capitalized-noun-chain heuristic as a v1 before adding POS validation.
"""

pathlib.Path("/home/oc/projects/SlopScope/rules/brainstorm.noun_stack.md").write_text(rule_content)
print("rule file written")
