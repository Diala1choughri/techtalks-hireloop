HireLoop - Rules the API must enforce

The database guarantees the structure. The rules  need logic that plain constraints cannot express, so the FastAPI backend must check them.

What the database already enforces (the API does not need to re-check)
A candidate can apply only once per job.
A candidate and the job of an application belong to the same company.
A screening answer's question belongs to the same job as the application.
Emails are case-insensitive (CITEXT): User@Mail.com and user@mail.com are the same.
An application's current stage (and every stage in its history and interviews) belongs to that job.
Only an assigned interviewer can have a scorecard for an interview, and only one each.
A rating must exist in that competency's rating scale.
Allowed values for every status, role, final_decision and message_type.
An application is active with no decision, or closed with a complete decision (final_decision, decided_by and decided_at all filled).
A scorecard is submitted if and only if it has a submitted_at time.
Consent must be given to apply.
A scheduled or completed interview must have a date and time (only cancelled ones may lack it).
What the API must enforce
#	Rule	Why the database cannot do it
1	A job must have 4 to 6 competencies (check before opening the job)	It means counting rows per job
2	A scorecard rating's competency must belong to the job of that interview	The path rating > scorecard > interview > application > job is too long for a constraint
3	Hide other interviewers' ratings until the viewer has submitted their own scorecard (managers see everything)	It depends on who is asking
4	Company isolation: every query filters by the logged-in user's company_id, and never returns another company's data	Needs the logged-in user
5	The job creator (jobs.created_by), the decider (applications.decided_by), interviewers and message senders must be users of the same company	Only candidate/job/stage consistency is enforced by the database
6	A job's competencies must belong to the same company as the job	Not linked by a company column
7	Role permissions (for example, only managers decide, only HR/managers send offers)	Needs the logged-in user
8	When a candidate moves stage: update applications.current_stage_id and insert a row in application_stage_history, in one transaction	Two tables must change together
9	When a final decision is saved: set status = 'closed', final_decision, decided_by, decided_at together	Same reason
10	Passwords: only store a strong hash (argon2 or bcrypt, for example through passlib) in password_hash. Never store, log or return the plain password	The database cannot know what is inside the text
11	Deleting: do not hard-delete jobs, candidates or users. Close jobs (status = 'closed') and deactivate people instead. Deleting an application also deletes its answers, history, interviews, scorecards and emails, so allow it only for explicit data-erasure requests (managers only)	The database refuses to delete rows that are still referenced, but it cannot know what is a legitimate erasure
12	Trim emails and names before saving (the database handles upper/lower case, not spaces)	Whitespace is valid text
13	Only serve CV files through a logged-in, permission-checked endpoint (the database stores a private path only)	File storage is outside the database
14	Do not let a user remove an interviewer from an interview once that interviewer has a scorecard: the database would delete the scorecard together with the assignment	The cascade is needed so deleting an application works, but it also applies here
Notes
application_stage_history and communications are log tables: only insert, never edit or delete rows.
job_id is repeated in interviews and application_stage_history on purpose, so the database can check that stages belong to the right job. The API must send the application's own job_id when inserting.
