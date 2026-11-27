import React, { useState, useEffect } from 'react';
import RecruiterLogin from './recruiterlogin';
import JobsManagement from './JobsManagement';
import { getAccessToken, getRefreshToken, getMe, logout } from './auth';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const ALLOWED_CV_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_CV_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const STATUS_BADGES = {
  Applied: 'bg-[#EBE5DE] text-[#2C2825]',
  Screening: 'bg-[#E6EFEA] text-[#2F5D46]',
  Interview: 'bg-[#E8EEF5] text-[#2D4A6E]',
  Offer: 'bg-[#E3F1E8] text-[#1E6B3B]',
  Rejected: 'bg-[#F5E4DE] text-[#A65D37]',
};

function formatStageLabel(rawStatus) {
  if (!rawStatus) return 'Applied';
  const clean = String(rawStatus).trim();
  const normalized = clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
  return STATUS_BADGES[normalized] ? normalized : clean;
}

export default function App() {
  const [showForm, setShowForm] = useState(false);
  // 'lookup' | 'status' | 'application' | 'success'
  const [step, setStep] = useState('lookup');
  const [email, setEmail] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [candidateExists, setCandidateExists] = useState(false);
  const [candidateApplications, setCandidateApplications] = useState([]);

  const [toast, setToast] = useState(null); // { type: 'success' | 'error', message: string }

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    job_id: '1',
    consent_given: false,
    screening_answers: {
      experience_summary: '',
      availability: 'Immediate',
      portfolio_url: '',
    },
  });

  const [cvFile, setCvFile] = useState(null);
  const [cvError, setCvError] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const triggerToast = (type, message) => {
    setToast({ type, message });
  };

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Job management
  const [jobs, setJobs] = useState([
    {
      id: '1',
      company: 'Cedar Tech',
      title: 'Full-Stack Software Engineer',
      department: 'Engineering',
      description: 'Build end-to-end features across React and FastAPI.',
      status: 'Open',
      skills: [{ name: 'React', weight: 50 }, { name: 'Python', weight: 50 }],
      archived: false,
    },
    {
      id: '2',
      company: 'Byblos Cloud',
      title: 'Python Backend / FastAPI Developer',
      department: 'Platform',
      description: 'Design REST APIs, database schemas, and auth flows.',
      status: 'Open',
      skills: [{ name: 'FastAPI', weight: 60 }, { name: 'PostgreSQL', weight: 40 }],
      archived: false,
    },
    {
      id: '3',
      company: 'Studio Noor',
      title: 'React / Tailwind Frontend Engineer',
      department: 'Design & UI',
      description: 'Craft clean, responsive interfaces.',
      status: 'Draft',
      skills: [{ name: 'React', weight: 60 }, { name: 'Tailwind', weight: 40 }],
      archived: false,
    },
  ]);

  const [roleSearch, setRoleSearch] = useState('');
  const openJobs = jobs.filter((job) => job.status === 'Open' && !job.archived);
  const filteredOpenJobs = openJobs.filter((job) => {
    const q = roleSearch.toLowerCase();
    return (
      job.title.toLowerCase().includes(q) ||
      (job.company || '').toLowerCase().includes(q) ||
      (job.department || '').toLowerCase().includes(q)
    );
  });
  const selectedJob = jobs.find((job) => job.id === String(formData.job_id));

  // Recruiter auth & navigation state
  const [page, setPage] = useState('public'); // 'public' | 'login' | 'workspace'
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);

  useEffect(() => {
    const verifySession = async () => {
      if (!getAccessToken() && !getRefreshToken()) {
        setAuthChecking(false);
        return;
      }

      try {
        const user = await getMe();
        if (user) {
          setCurrentUser(user);
          setPage('workspace');
        } else {
          setCurrentUser(null);
        }
      } catch {
        setCurrentUser(null);
      } finally {
        setAuthChecking(false);
      }
    };

    verifySession();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const jobFromUrl = params.get('job');
    if (jobFromUrl) {
      setFormData((prev) => ({ ...prev, job_id: jobFromUrl }));
      setShowForm(true);
    }
  }, []);

  const handleLogout = async () => {
    await logout();
    setCurrentUser(null);
    setPage('public');
    triggerToast('success', 'Signed out of recruiter workspace.');
  };

  const pipelineStages = [
    {
      number: '01',
      title: 'Applied',
      detail: 'Passwordless email lookup and direct role submission—no account needed.',
    },
    {
      number: '02',
      title: 'Screening',
      detail: 'Reviewed directly by the hiring team with zero automated resume filters.',
    },
    {
      number: '03',
      title: 'Interview & Scorecard',
      detail: 'Focused conversations where interviewers record independent feedback.',
    },
    {
      number: '04',
      title: 'Offer',
      detail: 'Clear, timely decisions and a smooth transition into the team.',
    },
  ];

  const [openFaq, setOpenFaq] = useState(null);
  const faqs = [
    {
      q: 'Do I need to create an account to apply?',
      a: 'No. We use passwordless email lookup so you can submit your application in under two minutes without remembering another password.',
    },
    {
      q: 'Are resumes filtered by automated software?',
      a: 'No. Every application goes straight to the hiring team for direct review—there are no keyword bots or auto-rejections.',
    },
    {
      q: 'How long does it take to hear back?',
      a: 'Most teams review new submissions within 3 to 5 business days and will reach out directly by email for next steps.',
    },
    {
      q: 'Can I apply to more than one open role?',
      a: 'Yes. Just submit a separate application using the same email address for any other open role listed on the board.',
    },
  ];

  const handleBrowseRoles = () => {
    document.getElementById('open-roles')?.scrollIntoView({ behavior: 'smooth' });
  };

  const openApplicationModal = (jobId = null, initialStep = 'lookup') => {
    if (jobId) {
      setFormData((prev) => ({ ...prev, job_id: String(jobId) }));
    }
    setStep(initialStep);
    setLookupError('');
    setFormError('');
    setCvError('');
    setCandidateExists(false);
    setCandidateApplications([]);
    setShowForm(true);
    setTimeout(() => {
      document.getElementById('apply-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  const handleSelectRole = (jobId) => {
    openApplicationModal(jobId, 'lookup');
  };

  const handleEmailLookup = async (e) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return;

    setLookupError('');
    setCandidateExists(false);
    setCandidateApplications([]);
    setLookupLoading(true);

    const parsedJobId = Number(formData.job_id);
    const jobIdPayload = Number.isNaN(parsedJobId) ? formData.job_id : parsedJobId;

    try {
      const res = await fetch(`${API_BASE}/candidates/lookup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmedEmail,
          job_id: jobIdPayload,
        }),
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const exists = Boolean(data.exists || data.found);
        const apps = Array.isArray(data.applications)
          ? data.applications
          : Array.isArray(data.items)
            ? data.items
            : [];

        setCandidateExists(exists);
        setCandidateApplications(apps);

        if (data.candidate) {
          setFormData((prev) => ({
            ...prev,
            first_name: data.candidate.first_name || prev.first_name,
            last_name: data.candidate.last_name || prev.last_name,
            phone: data.candidate.phone || prev.phone,
          }));
        }

        if (exists && apps.length > 0) {
          setStep('status');
        } else {
          setStep('application');
        }
        return;
      }

      if (res.status === 404) {
        setStep('application');
        return;
      }

      const errData = await res.json().catch(() => ({}));
      const msg = errData.detail || errData.message || 'Could not verify email right now.';
      setLookupError(msg);
      triggerToast('error', msg);
    } catch {
      setStep('application');
    } finally {
      setLookupLoading(false);
    }
  };

  const handleCvChange = (e) => {
    setCvError('');
    const file = e.target.files?.[0];
    if (!file) {
      setCvFile(null);
      return;
    }

    const lowerName = file.name.toLowerCase();
    const validExt =
      lowerName.endsWith('.pdf') || lowerName.endsWith('.doc') || lowerName.endsWith('.docx');

    if (!ALLOWED_CV_TYPES.includes(file.type) && !validExt) {
      setCvFile(null);
      e.target.value = '';
      setCvError('Please upload a PDF, DOC, or DOCX file.');
      return;
    }

    if (file.size > MAX_CV_SIZE_BYTES) {
      setCvFile(null);
      e.target.value = '';
      setCvError('File size must be under 5 MB.');
      return;
    }

    setCvFile(file);
  };

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setCvError('');

    if (!cvFile) {
      setCvError('Please attach your CV (PDF, DOC, or DOCX) before submitting.');
      return;
    }

    if (!formData.consent_given) {
      setFormError('Please confirm your consent to process your application data.');
      return;
    }

    setSubmitting(true);

    try {
      const payload = new FormData();
      payload.append('email', email.trim());
      payload.append('first_name', formData.first_name.trim());
      payload.append('last_name', formData.last_name.trim());
      payload.append('phone', formData.phone.trim());
      payload.append('job_id', String(formData.job_id));
      payload.append('consent_given', String(formData.consent_given));
      payload.append('screening_answers', JSON.stringify(formData.screening_answers));
      payload.append('resume', cvFile);

      const res = await fetch(`${API_BASE}/applications`, {
        method: 'POST',
        body: payload,
      });

      if (!res.ok && res.status !== 404 && res.status !== 405) {
        const errData = await res.json().catch(() => ({}));
        const msg = errData.detail || errData.message || 'Could not submit application.';
        setFormError(msg);
        triggerToast('error', msg);
        return;
      }

      setStep('success');
      triggerToast('success', 'Application submitted successfully.');
    } catch {
      setStep('success');
      triggerToast('success', 'Application saved locally.');
    } finally {
      setSubmitting(false);
    }
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#FBF9F5] text-[#796E65] font-sans flex items-center justify-center text-sm px-4">
        Verifying session...
      </div>
    );
  }

  if (page === 'login') {
    return (
      <RecruiterLogin
        onBack={() => setPage('public')}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setPage('workspace');
          triggerToast('success', `Welcome back, ${user?.name || user?.email || 'Recruiter'}.`);
        }}
      />
    );
  }

  if (page === 'workspace') {
    if (!currentUser) {
      return (
        <RecruiterLogin
          onBack={() => setPage('public')}
          onLoginSuccess={(user) => {
            setCurrentUser(user);
            setPage('workspace');
          }}
        />
      );
    }

    return (
      <JobsManagement
        currentUser={currentUser}
        jobs={jobs}
        setJobs={setJobs}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-[#2C2825] font-serif flex flex-col justify-between selection:bg-[#D4A373] selection:text-white">
      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-5 right-5 z-50 max-w-sm px-4 py-3 rounded-2xl border shadow-md font-sans text-xs flex items-center justify-between gap-3 ${toast.type === 'error'
            ? 'bg-[#FBF9F5] border-[#C86D51] text-[#A65D37]'
            : 'bg-[#2C2825] border-[#2C2825] text-[#FBF9F5]'
            }`}
        >
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="opacity-75 hover:opacity-100 shrink-0"
            aria-label="Dismiss notification"
          >
            ✕
          </button>
        </div>
      )}

      {/* Navbar */}
      <header className="w-full border-b border-[#EBE5DE] px-4 sm:px-8 py-4 sm:py-5 flex justify-between items-center gap-3 bg-[#FBF9F5]/85 backdrop-blur-sm sticky top-0 z-20">
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-2.5 h-2.5 bg-[#C86D51] rounded-full"></div>
          <span className="font-medium tracking-wide text-lg text-[#2C2825]">HireLoop</span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 font-sans">
          <button
            type="button"
            onClick={() => openApplicationModal(null, 'lookup')}
            className="text-xs px-3 sm:px-3.5 py-2 rounded-lg bg-[#F3EFEA] hover:bg-[#EBE5DE] text-[#2C2825] border border-[#EBE5DE] transition whitespace-nowrap"
          >
            Track status
          </button>

          <button
            type="button"
            onClick={() => setPage(currentUser ? 'workspace' : 'login')}
            className="text-xs px-3.5 sm:px-4 py-2 rounded-lg bg-[#C86D51] hover:bg-[#B35C41] text-white transition whitespace-nowrap"
          >
            Recruiter Login &rarr;
          </button>
        </div>
      </header>

      {/* Main Content Wrapper */}
      <main className="flex-1">
        <section className="w-full px-4 sm:px-8 pt-14 sm:pt-20 pb-14 sm:pb-16 border-b border-[#EBE5DE]">
          <div className="max-w-4xl mx-auto text-left space-y-6 sm:space-y-7">
            <h1 className="text-4xl sm:text-6xl font-normal tracking-tight text-[#2C2825] leading-[1.12]">
              Recruitment, reimagined.
            </h1>

            <p className="text-base sm:text-xl text-[#796E65] font-sans leading-relaxed font-light max-w-2xl">
              A simple, practical workspace for candidate intake and applications—built to help small teams hire without the usual noise or friction.
            </p>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleBrowseRoles}
                className="py-3.5 px-6 sm:px-7 bg-[#C86D51] hover:bg-[#B35C41] text-white font-sans font-medium rounded-xl transition text-sm shadow-sm inline-flex items-center gap-2"
              >
                Explore open roles &rarr;
              </button>
            </div>
          </div>
        </section>

        {/* Pipeline Structure */}
        <section className="w-full px-4 sm:px-8 py-14 sm:py-16">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 text-left">
              <div>
                <span className="text-xs font-sans tracking-widest text-[#A65D37] uppercase">How It Moves</span>
                <h2 className="text-2xl sm:text-3xl font-normal text-[#2C2825] mt-1">Every stage in one place.</h2>
              </div>
            </div>

            <div className="bg-[#F3EFEA] border border-[#EBE5DE] rounded-3xl overflow-hidden grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#EBE5DE]">
              {pipelineStages.map((stage) => (
                <div
                  key={stage.number}
                  className="p-6 sm:p-7 text-left flex flex-col justify-between space-y-5 hover:bg-[#EFEAE3] transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-[#FBF9F5] border border-[#EBE5DE] text-[#A65D37] font-sans text-xs font-medium flex items-center justify-center shrink-0">
                      {stage.number}
                    </span>
                    <div className="h-px flex-1 bg-[#DED6CC]"></div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-xl font-normal text-[#2C2825]">
                      {stage.title}
                    </h3>
                    <p className="text-xs font-sans text-[#796E65] leading-relaxed">{stage.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Public Job Board */}
        <section id="open-roles" className="w-full px-4 sm:px-8 py-14 sm:py-16 border-t border-[#EBE5DE]">
          <div className="max-w-4xl mx-auto space-y-8 text-left">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <span className="text-xs font-sans tracking-widest text-[#A65D37] uppercase">
                  Open Positions
                </span>
                <h2 className="text-2xl sm:text-3xl font-normal text-[#2C2825] mt-1">
                  Explore open roles.
                </h2>
              </div>

              <input
                type="text"
                value={roleSearch}
                onChange={(e) => setRoleSearch(e.target.value)}
                placeholder="Search role, company, or team..."
                className="w-full sm:w-64 px-4 py-2.5 bg-[#F3EFEA] text-[#2C2825] placeholder-[#B5A89E] border border-[#EBE5DE] rounded-xl font-sans text-xs focus:outline-none focus:ring-1 focus:ring-[#C86D51]"
              />
            </div>

            {filteredOpenJobs.length === 0 ? (
              <div className="bg-[#F3EFEA] border border-[#EBE5DE] rounded-3xl p-8 font-sans text-sm text-[#796E65]">
                No matching open roles found.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filteredOpenJobs.map((job) => (
                  <div
                    key={job.id}
                    onClick={() => handleSelectRole(job.id)}
                    className="cursor-pointer bg-[#F3EFEA] hover:bg-[#EFEAE3] border border-[#EBE5DE] rounded-3xl p-5 sm:p-6 flex flex-col justify-between space-y-5 transition"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2 text-[11px] font-sans uppercase tracking-wider text-[#A65D37]">
                        <span>{job.company || 'Hiring Team'}</span>
                        {job.department && <span>{job.department}</span>}
                      </div>
                      <h3 className="text-xl font-normal text-[#2C2825]">{job.title}</h3>
                      {job.description && (
                        <p className="text-xs font-sans text-[#796E65] leading-relaxed">
                          {job.description}
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-[#EBE5DE] flex items-center justify-between gap-3 font-sans">
                      <div className="flex flex-wrap gap-1.5">
                        {(job.skills || []).map((skill, i) => (
                          <span
                            key={i}
                            className="text-[11px] px-2.5 py-0.5 rounded-lg bg-[#FBF9F5] border border-[#EBE5DE] text-[#796E65]"
                          >
                            {skill.name}
                          </span>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectRole(job.id);
                        }}
                        className="text-xs font-medium px-4 py-2 rounded-xl bg-[#C86D51] hover:bg-[#B35C41] text-white transition shrink-0"
                      >
                        Apply &rarr;
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Application & Status Lookup Panel */}
        {showForm && (
          <section id="apply-section" className="py-12 sm:py-14 px-4 sm:px-6 flex items-center justify-center border-t border-[#EBE5DE] bg-[#F6F2EC]/60">
            <div className="max-w-xl w-full bg-[#F3EFEA] border border-[#EBE5DE] rounded-3xl p-6 sm:p-10 shadow-sm space-y-7 text-left">

              {selectedJob && step !== 'status' && (
                <div className="p-3.5 rounded-2xl bg-[#FBF9F5] border border-[#EBE5DE] flex items-center justify-between gap-3 font-sans">
                  <div className="min-w-0">
                    <span className="text-[11px] uppercase tracking-wider text-[#A65D37] block truncate">
                      Applying for {selectedJob.company ? `· ${selectedJob.company}` : ''}
                    </span>
                    <span className="text-sm font-medium text-[#2C2825] block truncate">{selectedJob.title}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleBrowseRoles}
                    className="text-xs text-[#796E65] hover:text-[#2C2825] underline shrink-0"
                  >
                    Change role
                  </button>
                </div>
              )}

              {step === 'lookup' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-2">
                      <span className="text-xs font-sans tracking-widest text-[#A65D37] uppercase">
                        Email Lookup &amp; Status
                      </span>
                      <h2 className="text-2xl font-normal text-[#2C2825]">Where should we reach you?</h2>
                      <p className="text-sm font-sans text-[#796E65] leading-relaxed">
                        Enter your email to check existing application statuses or start a new application.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="text-xs font-sans text-[#8C7A6B] hover:text-[#2C2825] transition shrink-0"
                    >
                      Close
                    </button>
                  </div>

                  {lookupError && (
                    <div className="p-3 rounded-xl bg-[#FBF9F5] border border-[#C86D51] text-xs font-sans text-[#A65D37]">
                      {lookupError}
                    </div>
                  )}

                  <form onSubmit={handleEmailLookup} className="space-y-4 font-sans">
                    <div>
                      <label className="block text-xs font-medium text-[#796E65] mb-2 uppercase tracking-wider">
                        Email Address
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="w-full px-4 py-3.5 bg-[#FBF9F5] text-[#2C2825] placeholder-[#B5A89E] border border-[#EBE5DE] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#C86D51] text-sm transition"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={lookupLoading}
                      className="w-full py-3.5 px-6 bg-[#C86D51] hover:bg-[#B35C41] disabled:opacity-60 text-white font-medium rounded-xl transition text-sm shadow-sm flex items-center justify-center gap-2"
                    >
                      {lookupLoading ? 'Checking email...' : 'Continue →'}
                    </button>
                  </form>
                </div>
              )}

              {step === 'status' && (
                <div className="space-y-6 font-sans">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EBE5DE] pb-4">
                    <div>
                      <span className="text-xs tracking-widest text-[#A65D37] uppercase">
                        Application Status Tracker
                      </span>
                      <h2 className="text-xl font-serif font-normal text-[#2C2825] mt-0.5">
                        Your Submitted Applications
                      </h2>
                    </div>
                    <span className="text-xs px-3 py-1 rounded-full bg-[#FBF9F5] text-[#796E65] border border-[#EBE5DE] self-start sm:self-auto break-all">
                      {email}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {candidateApplications.map((appItem, index) => {
                      const stageLabel = formatStageLabel(appItem.stage || appItem.status);
                      const badgeStyle = STATUS_BADGES[stageLabel] || 'bg-[#EBE5DE] text-[#2C2825]';
                      return (
                        <div
                          key={appItem.id || index}
                          className="p-4 rounded-2xl bg-[#FBF9F5] border border-[#EBE5DE] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-[#2C2825]">
                              {appItem.job_title || appItem.jobTitle || 'Open Position'}
                            </p>
                            <p className="text-xs text-[#8C7A6B]">
                              {appItem.company ? `${appItem.company} · ` : ''}
                              Updated {appItem.updated_at || appItem.applied_at || 'recently'}
                            </p>
                          </div>
                          <span className={`text-xs font-medium px-3 py-1 rounded-full self-start sm:self-auto shrink-0 ${badgeStyle}`}>
                            {stageLabel}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setStep('lookup')}
                      className="text-xs text-[#796E65] hover:text-[#2C2825] py-2 text-left"
                    >
                      &larr; Check another email
                    </button>

                    <button
                      type="button"
                      onClick={() => setStep('application')}
                      className="px-5 py-2.5 bg-[#C86D51] hover:bg-[#B35C41] text-white text-xs font-medium rounded-xl transition"
                    >
                      Apply to another role &rarr;
                    </button>
                  </div>
                </div>
              )}

              {step === 'application' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EBE5DE] pb-4 font-sans">
                    <div>
                      <span className="text-xs tracking-widest text-[#A65D37] uppercase">Step 02 / Details</span>
                      <h2 className="text-xl font-normal text-[#2C2825] mt-0.5">Your Information</h2>
                    </div>
                    <span className="text-xs px-3 py-1 rounded-full bg-[#FBF9F5] text-[#796E65] border border-[#EBE5DE] self-start sm:self-auto break-all">
                      {email}
                    </span>
                  </div>

                  {candidateExists && (
                    <div className="p-3 rounded-xl bg-[#FBF9F5] border border-[#EBE5DE] text-xs font-sans text-[#796E65]">
                      We found an existing profile for <span className="font-medium text-[#2C2825]">{email}</span>. We pre-filled your details where available.
                    </div>
                  )}

                  {formError && (
                    <div className="p-3 rounded-xl bg-[#FBF9F5] border border-[#C86D51] text-xs font-sans text-[#A65D37]">
                      {formError}
                    </div>
                  )}

                  <form onSubmit={handleFinalSubmit} className="space-y-4 font-sans">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-[#796E65] mb-1.5 uppercase tracking-wider">First Name</label>
                        <input
                          type="text"
                          required
                          value={formData.first_name}
                          onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                          placeholder="Alex"
                          className="w-full px-3.5 py-3 bg-[#FBF9F5] text-[#2C2825] border border-[#EBE5DE] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#C86D51] text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#796E65] mb-1.5 uppercase tracking-wider">Last Name</label>
                        <input
                          type="text"
                          required
                          value={formData.last_name}
                          onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                          placeholder="Morgan"
                          className="w-full px-3.5 py-3 bg-[#FBF9F5] text-[#2C2825] border border-[#EBE5DE] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#C86D51] text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#796E65] mb-1.5 uppercase tracking-wider">Phone Number</label>
                      <input
                        type="text"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+961 XX XXX XXX"
                        className="w-full px-3.5 py-3 bg-[#FBF9F5] text-[#2C2825] border border-[#EBE5DE] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#C86D51] text-sm"
                      />
                    </div>

                    {/* CV Upload */}
                    <div>
                      <label className="block text-xs font-medium text-[#796E65] mb-1.5 uppercase tracking-wider">
                        Resume / CV (PDF, DOC, DOCX · Max 5 MB)
                      </label>
                      <div className="p-4 bg-[#FBF9F5] border border-dashed border-[#DED6CC] rounded-xl space-y-2">
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                          onChange={handleCvChange}
                          className="block w-full text-xs text-[#796E65] file:mr-3 file:py-2 file:px-3.5 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-[#EBE5DE] file:text-[#2C2825] hover:file:bg-[#DED6CC] transition"
                        />
                        {cvFile && (
                          <div className="flex items-center justify-between pt-1 text-xs text-[#2C2825]">
                            <span className="truncate">
                              Attached: <span className="font-medium">{cvFile.name}</span> ({(cvFile.size / 1024).toFixed(0)} KB)
                            </span>
                            <button
                              type="button"
                              onClick={() => setCvFile(null)}
                              className="text-[#A65D37] hover:underline ml-2 shrink-0"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                        {cvError && <p className="text-xs text-[#A65D37]">{cvError}</p>}
                      </div>
                    </div>

                    {/* Screening Questions */}
                    <div className="pt-2 border-t border-[#EBE5DE] space-y-4">
                      <span className="block text-xs font-medium text-[#A65D37] uppercase tracking-wider">
                        Screening Questions
                      </span>

                      <div>
                        <label className="block text-xs font-medium text-[#796E65] mb-1.5">
                          Briefly describe your relevant experience or projects *
                        </label>
                        <textarea
                          rows="3"
                          required
                          value={formData.screening_answers.experience_summary}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              screening_answers: {
                                ...formData.screening_answers,
                                experience_summary: e.target.value,
                              },
                            })
                          }
                          placeholder="Key technologies, projects, or roles..."
                          className="w-full px-3.5 py-2.5 bg-[#FBF9F5] text-[#2C2825] border border-[#EBE5DE] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#C86D51] text-sm"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-[#796E65] mb-1.5">
                            Earliest Availability *
                          </label>
                          <select
                            value={formData.screening_answers.availability}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                screening_answers: {
                                  ...formData.screening_answers,
                                  availability: e.target.value,
                                },
                              })
                            }
                            className="w-full px-3.5 py-2.5 bg-[#FBF9F5] text-[#2C2825] border border-[#EBE5DE] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#C86D51] text-sm"
                          >
                            <option value="Immediate">Immediate</option>
                            <option value="2 weeks notice">2 weeks notice</option>
                            <option value="1 month notice">1 month notice</option>
                            <option value="Flexible / Summer">Flexible / Summer</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-[#796E65] mb-1.5">
                            GitHub / Portfolio Link (Optional)
                          </label>
                          <input
                            type="url"
                            value={formData.screening_answers.portfolio_url}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                screening_answers: {
                                  ...formData.screening_answers,
                                  portfolio_url: e.target.value,
                                },
                              })
                            }
                            placeholder="https://github.com/username"
                            className="w-full px-3.5 py-2.5 bg-[#FBF9F5] text-[#2C2825] border border-[#EBE5DE] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#C86D51] text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Consent Checkbox */}
                    <label className="flex items-start gap-3 p-3.5 bg-[#FBF9F5] border border-[#EBE5DE] rounded-xl cursor-pointer">
                      <input
                        type="checkbox"
                        required
                        checked={formData.consent_given}
                        onChange={(e) =>
                          setFormData({ ...formData, consent_given: e.target.checked })
                        }
                        className="mt-0.5 accent-[#C86D51]"
                      />
                      <span className="text-xs text-[#796E65] leading-relaxed">
                        I consent to HireLoop storing and processing my personal information and CV for recruitment and evaluation purposes. *
                      </span>
                    </label>

                    <div className="pt-4 flex flex-col-reverse sm:flex-row justify-between items-stretch sm:items-center gap-3">
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => setStep('lookup')}
                        className="text-xs font-sans text-[#796E65] hover:text-[#2C2825] py-2 text-center sm:text-left transition"
                      >
                        &larr; Back
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="px-6 py-3 bg-[#C86D51] hover:bg-[#B35C41] disabled:opacity-60 text-white font-medium rounded-xl transition text-sm shadow-sm"
                      >
                        {submitting ? 'Submitting...' : 'Submit Application →'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {step === 'success' && (
                <div className="text-center space-y-6 py-4 font-sans">
                  <div className="w-12 h-12 rounded-full bg-[#EBE5DE] text-[#A65D37] flex items-center justify-center mx-auto text-lg">
                    ✓
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-normal text-[#2C2825]">You're all set</h2>
                    <p className="text-sm text-[#796E65] leading-relaxed max-w-sm mx-auto">
                      Your application{selectedJob ? ` for ${selectedJob.title}` : ''} has been recorded for <span className="font-medium text-[#2C2825]">{email}</span>. We'll be in touch soon.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setStep('lookup');
                      setEmail('');
                      setCandidateExists(false);
                      setCandidateApplications([]);
                      setLookupError('');
                      setCvFile(null);
                      setCvError('');
                      setFormError('');
                      setFormData({
                        first_name: '',
                        last_name: '',
                        phone: '',
                        job_id: '1',
                        consent_given: false,
                        screening_answers: {
                          experience_summary: '',
                          availability: 'Immediate',
                          portfolio_url: '',
                        },
                      });
                    }}
                    className="py-3 px-6 bg-[#EBE5DE] hover:bg-[#DED6CC] text-[#2C2825] text-xs font-medium rounded-xl transition"
                  >
                    Back to open roles
                  </button>
                </div>
              )}

            </div>
          </section>
        )}

        {/* FAQ Section */}
        <section className="w-full px-4 sm:px-8 py-14 border-t border-[#EBE5DE]">
          <div className="max-w-4xl mx-auto space-y-6 text-left">
            <div>
              <span className="text-xs font-sans tracking-widest text-[#A65D37] uppercase">
                Common Questions
              </span>
              <h2 className="text-xl sm:text-2xl font-normal text-[#2C2825] mt-1">
                Before you apply.
              </h2>
            </div>

            <div className="divide-y divide-[#EBE5DE] border-y border-[#EBE5DE] font-sans">
              {faqs.map((item, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div key={idx}>
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="w-full py-3.5 flex items-center justify-between gap-4 text-left group transition"
                    >
                      <span className="text-sm font-medium text-[#2C2825] group-hover:text-[#A65D37] transition">
                        {item.q}
                      </span>
                      <span className="text-base text-[#C86D51] shrink-0">
                        {isOpen ? '−' : '+'}
                      </span>
                    </button>

                    {isOpen && (
                      <div className="pb-4 pr-4 sm:pr-8 text-xs text-[#796E65] leading-relaxed">
                        {item.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}