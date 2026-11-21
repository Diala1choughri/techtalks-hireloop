-- =====================================================================
-- HireLoop - Database schema (MVP) - PostgreSQL
-- 17 tables, with integrity constraints (no sample data)
-- v5: scheduled/completed interviews must have scheduled_at
-- v4: deleting an application now really cascades to scorecards; a decision needs decided_by and decided_at
-- v3: stages belong to their job; candidate + job belong to the same company;
--     screening answers use questions of the same job; case-insensitive emails
--
-- DELETION POLICY: by default PostgreSQL REFUSES to delete a row that other rows still
-- point to (users, candidates, jobs, stages...). Deleting an APPLICATION is the one
-- deliberate exception: it also deletes its answers, history, interviews, scorecards
-- and emails (for example a candidate's data-erasure request). Prefer closing jobs
-- (status = 'closed') over deleting them.
-- =====================================================================

-- ---------------------------------------------------------------------
-- GROUP 1: Companies, users and jobs
-- ---------------------------------------------------------------------

-- Case-insensitive text type (so User@Mail.com and user@mail.com are the same email)
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE companies (
  company_id  INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        VARCHAR(150) NOT NULL,
  industry    VARCHAR(100),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
  user_id        INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id     INT NOT NULL REFERENCES companies(company_id),
  name           VARCHAR(120) NOT NULL,
  email          CITEXT NOT NULL,
  password_hash  TEXT NOT NULL,
  role           VARCHAR(20) NOT NULL
                 CHECK (role IN ('manager', 'interviewer', 'hr')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, email)
);

CREATE TABLE jobs (
  job_id            INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id        INT NOT NULL REFERENCES companies(company_id),
  created_by        INT NOT NULL REFERENCES users(user_id),
  title             VARCHAR(150) NOT NULL,
  description       TEXT,
  requirements      TEXT,
  experience_level  VARCHAR(50),
  location          VARCHAR(120),
  employment_type   VARCHAR(50),
  status            VARCHAR(20) NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'open', 'closed')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, job_id)                   -- target of applications' same-company FK
);

CREATE TABLE job_stages (
  stage_id     INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  job_id       INT NOT NULL REFERENCES jobs(job_id) ON DELETE CASCADE,
  stage_name   VARCHAR(80) NOT NULL,
  stage_order  INT NOT NULL,
  UNIQUE (job_id, stage_order),
  UNIQUE (job_id, stage_id)                     -- target of the stage-belongs-to-job FKs
);

CREATE TABLE competencies (
  competency_id  INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id     INT NOT NULL REFERENCES companies(company_id),
  name           VARCHAR(100) NOT NULL,
  description    TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, name)
);

-- Link table: which competencies are on a job's scorecard
-- (the "4 to 6 competencies per job" rule is enforced in the API)
CREATE TABLE job_competencies (
  job_competency_id  INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  job_id             INT NOT NULL REFERENCES jobs(job_id) ON DELETE CASCADE,
  competency_id      INT NOT NULL REFERENCES competencies(competency_id),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (job_id, competency_id)
);

-- The allowed ratings (and their meaning) for each competency of a job
CREATE TABLE rating_scale_options (
  scale_option_id    INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  job_competency_id  INT NOT NULL REFERENCES job_competencies(job_competency_id) ON DELETE CASCADE,
  rating_value       INT NOT NULL,
  label              VARCHAR(80) NOT NULL,
  UNIQUE (job_competency_id, rating_value)   -- also needed by scorecard_ratings FK
);

-- ---------------------------------------------------------------------
-- GROUP 2: Candidates and applications
-- ---------------------------------------------------------------------

CREATE TABLE candidates (
  candidate_id  INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id    INT NOT NULL REFERENCES companies(company_id),
  name          VARCHAR(120) NOT NULL,
  email         CITEXT NOT NULL,
  phone         VARCHAR(30),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, email),
  UNIQUE (company_id, candidate_id)             -- target of applications' same-company FK
);

CREATE TABLE screening_questions (
  question_id  INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  job_id       INT NOT NULL REFERENCES jobs(job_id) ON DELETE CASCADE,
  question     TEXT NOT NULL,
  is_required  BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (job_id, question_id)                  -- target of application_answers' same-job FK
);

CREATE TABLE applications (
  application_id    INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id        INT NOT NULL,                -- same company for candidate AND job (see FKs below)
  candidate_id      INT NOT NULL,
  job_id            INT NOT NULL,
  current_stage_id  INT NOT NULL,
  cv_file_path      VARCHAR(500) NOT NULL,      -- path in PRIVATE storage, never a public URL
  consent_given     BOOLEAN NOT NULL CHECK (consent_given = TRUE),
  consent_at        TIMESTAMPTZ NOT NULL,
  applied_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  status            VARCHAR(20) NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'closed')),
  final_decision    VARCHAR(20)
                    CHECK (final_decision IN ('hired', 'rejected')),
  decision_comment  TEXT,
  decided_by        INT REFERENCES users(user_id),
  decided_at        TIMESTAMPTZ,
  UNIQUE (candidate_id, job_id),                -- one application per candidate per job
  UNIQUE (application_id, job_id),              -- target of interviews / history FKs
  -- the candidate and the job must belong to the SAME company
  FOREIGN KEY (company_id, candidate_id) REFERENCES candidates (company_id, candidate_id),
  FOREIGN KEY (company_id, job_id)       REFERENCES jobs (company_id, job_id),
  -- the current stage must belong to THIS job
  FOREIGN KEY (job_id, current_stage_id) REFERENCES job_stages (job_id, stage_id),
  -- active = no decision at all; closed = a complete decision (what, who and when)
  CHECK (
    (status = 'active'
       AND final_decision IS NULL AND decided_by IS NULL AND decided_at IS NULL)
    OR
    (status = 'closed'
       AND final_decision IS NOT NULL AND decided_by IS NOT NULL AND decided_at IS NOT NULL)
  )
);

CREATE TABLE application_answers (
  answer_id       INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  application_id  INT NOT NULL,
  job_id          INT NOT NULL,                -- repeated on purpose, to check question and application share the job
  question_id     INT NOT NULL,
  answer          TEXT NOT NULL,
  UNIQUE (application_id, question_id),
  FOREIGN KEY (application_id, job_id) REFERENCES applications (application_id, job_id) ON DELETE CASCADE,
  FOREIGN KEY (job_id, question_id)    REFERENCES screening_questions (job_id, question_id)
);

-- Log table: insert-only, one row per move between stages
CREATE TABLE application_stage_history (
  history_id      INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  application_id  INT NOT NULL,
  job_id          INT NOT NULL,                          -- repeated on purpose, to check stages belong to the job
  from_stage_id   INT,                                   -- NULL on the first entry
  to_stage_id     INT NOT NULL,
  moved_by        INT REFERENCES users(user_id),         -- NULL = done by the system
  moved_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (application_id, job_id)   REFERENCES applications (application_id, job_id) ON DELETE CASCADE,
  FOREIGN KEY (job_id, from_stage_id)    REFERENCES job_stages (job_id, stage_id),   -- skipped when from_stage_id is NULL
  FOREIGN KEY (job_id, to_stage_id)      REFERENCES job_stages (job_id, stage_id)
);

-- ---------------------------------------------------------------------
-- GROUP 3: Interviews and scorecards
-- ---------------------------------------------------------------------

CREATE TABLE interviews (
  interview_id      INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  application_id    INT NOT NULL,
  job_id            INT NOT NULL,                -- repeated on purpose, to check the stage belongs to the job
  stage_id          INT NOT NULL,
  scheduled_at      TIMESTAMPTZ,
  location_or_link  VARCHAR(300),
  status            VARCHAR(20) NOT NULL DEFAULT 'scheduled'
                    CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  -- a scheduled or completed interview must have a date and time
  CHECK (status = 'cancelled' OR scheduled_at IS NOT NULL),
  FOREIGN KEY (application_id, job_id) REFERENCES applications (application_id, job_id) ON DELETE CASCADE,
  FOREIGN KEY (job_id, stage_id)       REFERENCES job_stages (job_id, stage_id)
);

-- Link table: which users are assigned to which interview
CREATE TABLE interview_assignments (
  interview_id  INT NOT NULL REFERENCES interviews(interview_id) ON DELETE CASCADE,
  user_id       INT NOT NULL REFERENCES users(user_id),
  PRIMARY KEY (interview_id, user_id)
);

CREATE TABLE scorecards (
  scorecard_id      INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  interview_id      INT NOT NULL,
  interviewer_id    INT NOT NULL,
  status            VARCHAR(20) NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'submitted')),
  submitted_at      TIMESTAMPTZ,
  overall_comments  TEXT,
  UNIQUE (interview_id, interviewer_id),        -- one scorecard per interviewer per interview
  -- only an ASSIGNED interviewer can have a scorecard for this interview
  -- ON DELETE CASCADE: when an interview (or its whole application) is deleted, its assignments
  -- are deleted, and the scorecards that depend on them must go too (otherwise the delete fails)
  FOREIGN KEY (interview_id, interviewer_id)
    REFERENCES interview_assignments (interview_id, user_id) ON DELETE CASCADE,
  -- submitted <=> has a submission time
  CHECK ((status = 'submitted') = (submitted_at IS NOT NULL))
);

CREATE TABLE scorecard_ratings (
  rating_id          INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  scorecard_id       INT NOT NULL REFERENCES scorecards(scorecard_id) ON DELETE CASCADE,
  job_competency_id  INT NOT NULL,
  rating             INT NOT NULL,
  comment            TEXT,
  UNIQUE (scorecard_id, job_competency_id),
  -- the rating must exist in that competency's rating scale
  FOREIGN KEY (job_competency_id, rating)
    REFERENCES rating_scale_options (job_competency_id, rating_value)
);

-- ---------------------------------------------------------------------
-- GROUP 4: Candidate communications
-- ---------------------------------------------------------------------

-- Log table: every email sent to a candidate
CREATE TABLE communications (
  communication_id  INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  application_id    INT NOT NULL REFERENCES applications(application_id) ON DELETE CASCADE,
  sent_by           INT REFERENCES users(user_id),
  message_type      VARCHAR(20) NOT NULL
                    CHECK (message_type IN ('invitation', 'rejection', 'offer')),
  subject           VARCHAR(200) NOT NULL,
  body              TEXT NOT NULL,
  status            VARCHAR(20) NOT NULL DEFAULT 'sent'
                    CHECK (status IN ('sent', 'failed')),
  sent_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Indexes on foreign keys that are often searched (Kanban board, history...)
-- ---------------------------------------------------------------------
CREATE INDEX idx_applications_job_stage ON applications (job_id, current_stage_id);
CREATE INDEX idx_stage_history_app      ON application_stage_history (application_id);
CREATE INDEX idx_interviews_app         ON interviews (application_id);
CREATE INDEX idx_communications_app     ON communications (application_id);
CREATE INDEX idx_jobs_company           ON jobs (company_id);
CREATE INDEX idx_applications_company   ON applications (company_id);
CREATE INDEX idx_assignments_user       ON interview_assignments (user_id);   -- "my interviews"
CREATE INDEX idx_job_competencies_comp  ON job_competencies (competency_id);
CREATE INDEX idx_communications_sent_by ON communications (sent_by);
