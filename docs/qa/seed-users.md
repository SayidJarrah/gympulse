# QA Seed Users

These accounts are seeded by the **demo-seeder reference phase**, not by Flyway.
They are present on the demo and review stacks after a generation run has been triggered.
They are NOT available on the E2E stack.

Password for all users: see the QA fixture credential store (not recorded in committed docs).

| Email | First Name | Last Name | Role |
|-------|-----------|----------|------|
| qa.user01@gymflow.local | Avery  | West   | USER |
| qa.user02@gymflow.local | Jordan | Reed   | USER |
| qa.user03@gymflow.local | Casey  | Nguyen | USER |
| qa.user04@gymflow.local | Taylor | Diaz   | USER |
| qa.user05@gymflow.local | Morgan | Patel  | USER |
| qa.user06@gymflow.local | Riley  | Chen   | USER |
| qa.user07@gymflow.local | Quinn  | Lopez  | USER |
| qa.user08@gymflow.local | Sydney | Foster | USER |
| qa.user09@gymflow.local | Parker | Singh  | USER |
| qa.user10@gymflow.local | Drew   | Santos | USER |

To seed these accounts: start the demo or review stack and call
`GET http://localhost:3001/api/generate/stream` (demo) or `GET http://localhost:3002/api/generate/stream` (review).
The reference phase runs automatically before user generation.
