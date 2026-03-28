---

**Business Analyst Brief: User Portal for Sports Club App**

**Objective:**  
Design and define a user-facing portal where clients can manage their profile, explore memberships, view trainers, and access group class schedules. The solution should follow industry best practices and ensure a clear and intuitive user experience.

---

## **1. User Access Flow (Critical Requirement)**

Define and design user access logic based on membership status:

- **New User Flow:**
  - A new user must **purchase a membership plan before accessing core functionality**.
  - Until a plan is purchased, access to main features (schedule, trainers, etc.) is restricted.
  - Define a clear onboarding/purchase flow.

- **Existing User Flow:**
  - Users with an **active membership** should, upon login, **immediately access all main sections** of the application.
  
- Analyze best practices for onboarding and conversion in fitness/sports apps.

---

## **2. User Profile Management**

Users should be able to view and manage their profile.

- Define essential and optional profile fields based on industry standards.
- Include profile editing capabilities.
- Consider additional attributes (e.g., goals, preferences) if relevant.

---

## **3. Memberships / Subscription Management**

Users should be able to explore and purchase memberships.

- Analyze typical membership models (time-based, session-based, unlimited, etc.).
- Define how plans are presented and compared.
- Define high-level purchase flow.
- Define how active membership is displayed (e.g., status, validity, remaining sessions if applicable).

---

## **4. Trainers Discovery (Personal Training)**

Users should be able to browse trainers.

- Define trainer profile structure for user-facing view.
- Include filtering and sorting (e.g., specialization, experience).
- Define how trainers are presented (cards, profiles, etc.).

---

## **5. Group Classes Schedule View**

Users should be able to view group class schedules.

- Use data from admin scheduler.
- Define possible views (weekly, daily, list).
- Ensure clear presentation of:
  - Time
  - Class type
  - Assigned trainer
- Focus on usability and readability.

---

## **Out of Scope**

- Booking/reservation of classes or trainers.
- Detailed payment integration.
- Notifications and reminders (future phases).

---

## **Suggested Additional Features (for BA analysis)**

**1. Trainer Availability Preview**  
- Show general availability of trainers without booking capability.

**2. Simple Activity History**  
- Display basic history of user activities (e.g., attended classes, interactions).

**3. Membership Status Widget**  
- Quick overview of current plan (validity, remaining sessions if applicable).

**4. Favorites / Saved Trainers**  
- Allow users to save preferred trainers.

---