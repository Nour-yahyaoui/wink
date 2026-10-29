# W.I.N.K — Product plan

> **Planning only.** This document records the product direction and proposed work. It does not authorize implementing the ideas below. Do not change the application until the product decisions and this plan are reviewed and approved.

## Product vision

W.I.N.K helps people at the **Faculté des Sciences de Monastir (FSM)** find the right person for a specific, shared real-life activity. It is for the moment when someone is missing a football player, wants company for a coffee, or wants to do another clearly stated activity with someone in person.

The product is about **making the in-person meet happen**, not keeping people chatting in an app. People choose an activity and purpose, see candidates who want the same thing, and proceed only when both choose each other. After a mutual choice, the app helps them settle a time and a suitable meeting place. The intended outcome is a face-to-face meeting.

## Product principles

1. **FSM only.** The community and discovery scope are limited to FSM. Do not expand to Monastir generally or other universities without an explicit product decision.
2. **Purpose before profile.** People are matched first on what they want to do, not on vague popularity, appearance, or a generic interest in “meeting people.”
3. **Compatible intent is required.** A person looking for a football player must not be matched with someone whose goal is to talk, socialize, or make friends instead. Match only people whose activity, role, and purpose are compatible.
4. **Both people choose.** No one is committed to a meet by a one-sided “yes.” Confirm a meet only after both sides opt in.
5. **Offline is the destination.** Keep the product focused on arranging the in-person meet. No in-app chat, DMs, video calls, or social feed as part of this product direction.
6. **Clear, safe logistics.** Once there is mutual interest, make the proposed time and public FSM-area location explicit and require confirmation from both people.

## Intended user journey

1. **Create an account.** A person creates a W.I.N.K account and joins the FSM-only community. The method of confirming FSM affiliation is an open decision (see below).
2. **Post or select an activity request.** State what they want to do, when they are available, and any role or constraints that matter. Examples:
   - “Need one more player for football” — activity: football; role: player; purpose: play a game.
   - “Looking for someone to have coffee with” — activity: coffee; purpose: share a coffee in person.
3. **See compatible people or requests.** Discovery must filter out mismatched intents. A person seeking a football player sees people who want to play football and can fill the relevant role—not people who only want conversation or friendship.
4. **Choose each other.** Each side independently indicates interest. Until both have chosen, the request remains pending and is not a confirmed plan.
5. **Agree on logistics.** After mutual choice, propose/select a time and an appropriate public location. The meet becomes confirmed only when both agree to the same details.
6. **Meet face to face.** Show the confirmed plan and the minimum information needed to attend. The app’s job is done when it has enabled a clear, mutually agreed in-person plan.
7. **Optional post-meet feedback.** Consider a lightweight “met / didn’t meet” check-in and safety feedback, but do not turn this into public ratings or a social popularity feature without a separate decision.

## Matching requirements

A match should be considered eligible only when the important intent fields are compatible. At minimum, define and compare:

- **Activity** — e.g. football or coffee.
- **Purpose** — e.g. play a game or have coffee together; do not treat “make friends,” “talk,” and “play football” as interchangeable.
- **Role / need** — e.g. someone needs a player; the other person is available to play. Make this conditional on the activity.
- **Availability** — overlapping times or a time window that can be agreed.
- **Location scope** — FSM and a feasible public meeting place for the activity.

If the activity or purpose is ambiguous or incompatible, do not recommend a match. Ask the requester to clarify rather than silently broadening the match. Hobbies can be secondary context, but must not override an incompatible purpose.

## MVP scope (proposed)

### Include

- Account creation and sign-in.
- FSM-only onboarding and clear eligibility rules.
- Structured activity requests with activity, purpose, role/need (where relevant), availability, and FSM-area location preference.
- Discovery of compatible people/requests, with a short explanation of why each result is compatible.
- Independent mutual-choice flow.
- Time and public-location proposals after mutual choice; confirmation by both sides.
- A simple confirmed-meet screen with cancel/withdraw controls and basic safety guidance.
- Minimal status tracking: open, pending mutual choice, arranging details, confirmed, completed, cancelled/expired.
- Basic abuse reporting and block controls as part of a safe real-world-meeting product.

### Exclude

- Chat, DMs, group messaging, comments, and inbox.
- Voice or video calls.
- Social feed, follower counts, likes, or engagement loops.
- Matching people with different purposes merely because they share hobbies.
- Open-ended “meet anyone” discovery without an activity or purpose.
- General Monastir-wide or multi-campus discovery.
- Public star ratings or popularity rankings in the MVP.

## Safety and privacy considerations

- Prefer public, appropriate meeting places; do not encourage sharing a home address or private location.
- Show only the information needed to assess activity compatibility and attend a confirmed meet.
- Give each person a clear way to cancel, withdraw, report, or block. A person who declines must not be pressured or exposed as having declined.
- Decide what happens when one side does not respond, changes the plan, cancels, or fails to show up.
- Define account eligibility and moderation before opening the service to real users. FSM-only scope is not itself proof of identity or safety.
- Collect the minimum personal data needed; document retention and account deletion expectations.

## Product success measures

Measure whether the product creates useful, safe in-person plans—not time spent in the app. Candidate measures:

- Share of requests that receive at least one compatible response.
- Share of mutual choices that become confirmed plans.
- Share of confirmed plans reported as completed.
- Time from request to mutual choice and confirmed plan.
- Cancellation, no-show, report, and block rates.
- User feedback on whether the match understood their stated purpose.

Avoid optimizing for message volume, session length, or number of profile views; those incentives conflict with the product vision.

## Suggested planning sequence (not implementation authorization)

1. **Agree on the product rules:** define FSM eligibility, activity/purpose taxonomy, how a request differs from a profile, and the mutual-choice behavior.
2. **Map the user flow:** sketch onboarding, request creation, compatible discovery, mutual choice, plan confirmation, cancellation, and reporting.
3. **Define the data and state model:** specify request fields, compatibility rules, expiration, and the exact states of a plan.
4. **Review safety and privacy:** choose verification, public-location guidance, reporting/blocking, data minimization, and retention rules.
5. **Prototype and validate:** test the core flow with FSM students using realistic contrasting intents (for example, “need a football player” versus “want someone to talk to”).
6. **Only after approval, implement an MVP:** keep the implementation limited to the approved scope and verify incompatible purposes never match.

## Decisions to resolve before implementation

- How will FSM affiliation be established: institutional email, manual review, invite, or another approach?
- Is the main object a person’s availability/request, or a time-bounded activity listing (such as a football game needing one player)? Can the MVP support both, or should it start with one?
- Which activities and purpose labels are allowed initially? Who can add or revise them?
- For activities with roles, how are needs and qualifications represented (for example, position, skill level, or simply “one more player”)?
- Can an activity involve more than two people, or is the first version strictly one-to-one?
- Who proposes the time and venue, and how many rounds of proposals are allowed?
- What is the permitted venue boundary: FSM campus only, or nearby public places as well? What venues are appropriate for each activity?
- Does a mutual choice reveal any contact details, or must coordination happen only through structured time/location proposals?
- What are the age, moderation, reporting, blocking, cancellation, and no-show policies?
- What is the minimum acceptable post-meet check-in, if any?

## Relationship to the current demo

The current demo includes broad Monastir discovery, chats, comments, and social/profile features. Those are not part of the direction described here. If this plan is approved, they should be reviewed as potential removals or replacements—not assumed to be requirements for the future product. No such changes are made by this planning document.
