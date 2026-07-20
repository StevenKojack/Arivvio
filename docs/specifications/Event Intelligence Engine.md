# Event Intelligence Engine

## Purpose

The Event Intelligence Engine (EIE) is the single structured interpretation layer between planner input and Arivvio product surfaces. It keeps the planner experience conversational while producing a profile that marketplace matching, recommendations, timelines, pricing, and future planning tools can consume.

## Evidence Priority

1. Explicit event selection
2. Explicit planner text
3. Explicit Step 2 choices
4. Deterministic inference
5. General defaults

Broad defaults must never replace a more specific planner choice. Suggestions are inspiration and are not added as assumptions.

## Event Profile

`buildEventIntelligenceProfile()` produces one `EventIntelligenceProfile` containing:

- event identity and subtype
- ordered event stages
- audience, age, and optional gender context
- venue requirements and venue preferences
- home and commercial venue context
- food, culture, religious, entertainment, and activity preferences
- transportation and travel needs
- requested and excluded services
- guest size
- indoor and outdoor context
- recommendation scores
- evidence source, confidence, and confirmation state

The profile is saved to session storage and its planner-facing fields are passed through the marketplace URL contract. Internal evidence and confidence labels are never exposed as technical UI.

## Planner Control

Inferred preferences remain editable and removable. Once a planner removes an inferred preference, the active Step 2 session does not silently add it again. Optional recommendations remain separate until selected.

## Current Consumers

- Step 2 contextual inspiration
- Step 2 recommendation ordering
- essential and requested service state
- connected stage state
- marketplace event, service, audience, and preference parameters

## Current Boundary

The EIE profile is session-scoped. Persisting the complete profile to the event database and adding stage-specific dates, locations, and vendor assignments are separate milestones.
