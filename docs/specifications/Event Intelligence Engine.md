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
- invitee age range and audience mix
- honoree age, relationship, due date, and optional gender context when relevant
- primary service selections with nested matching details
- cuisines and cultures derived from service details or explicit context
- raw planner intent separated from inferred terms
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

## Service Dependency Model

Primary services are the planner-facing unit. A planner adds one DJ, Catering, Photography, Transportation, Rentals, or other primary service to the plan. Music style, language, cultural experience, cuisine, vehicle type, coverage format, and equipment are nested detail tags on that selection rather than duplicate services.

Each detail can contribute matching service identifiers and evidence to the profile. For example, Party Bus is stored as a Transportation detail while retaining Party Bus as a marketplace matching signal. This keeps Step 2 calm without discarding specificity.

## Holiday Taxonomy

Major secular, cultural, and religious holidays have explicit taxonomy profiles rather than silently falling into the generic private-party profile. Holiday intent changes suggestions and matching context while still allowing the planner to add or remove any service.

## Current Consumers

- Step 2 contextual inspiration
- event-aware planning search guidance
- service-detail dependency matching
- dedicated invitee context
- Step 2 recommendation ordering
- essential and requested service state
- connected stage state
- marketplace event, service, audience, and preference parameters

## Current Boundary

The EIE profile is session-scoped. Persisting the complete profile to the event database and adding stage-specific dates, locations, and vendor assignments are separate milestones.
