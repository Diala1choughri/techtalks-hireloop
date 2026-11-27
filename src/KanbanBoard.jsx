import React, { useState, useEffect, useCallback } from 'react';
import { authFetch } from './auth';

const STAGES = [
    { id: 'Applied', label: 'Applied', number: '01' },
    { id: 'Screening', label: 'Screening', number: '02' },
    { id: 'Interview', label: 'Interview', number: '03' },
    { id: 'Offer', label: 'Offer', number: '04' },
    { id: 'Rejected', label: 'Rejected', number: '05' },
];

// Temporary fallback candidates when backend applications endpoint is empty/offline
const INITIAL_TEST_CANDIDATES = [
    {
        id: 'c1',
        name: 'Maya El-Khoury',
        email: 'maya.khoury@example.com',
        phone: '+961 70 123 456',
        jobId: '1',
        jobTitle: 'Full-Stack Software Engineer',
        stage: 'Applied',
        appliedAt: '2h ago',
        availability: 'Immediate',
        cvName: 'Maya_ElKhoury_CV.pdf',
        skills: ['React', 'Python', 'REST APIs'],
        summary: 'Built two full-stack web apps using React, Tailwind, and FastAPI during internships.',
        score: 88,
    },
    {
        id: 'c2',
        name: 'Karim Nassar',
        email: 'karim.nassar@example.com',
        phone: '+961 71 987 654',
        jobId: '2',
        jobTitle: 'Python Backend / FastAPI Developer',
        stage: 'Screening',
        appliedAt: '1d ago',
        availability: '2 weeks notice',
        cvName: 'Karim_Nassar_Resume.pdf',
        skills: ['FastAPI', 'PostgreSQL', 'Docker'],
        summary: '2 years building asynchronous Python microservices and PostgreSQL schemas.',
        score: 92,
    },
    {
        id: 'c3',
        name: 'Nour Haddad',
        email: 'nour.haddad@example.com',
        phone: '+961 76 555 210',
        jobId: '1',
        jobTitle: 'Full-Stack Software Engineer',
        stage: 'Interview',
        appliedAt: '3d ago',
        availability: 'Immediate',
        cvName: 'Nour_Haddad_CV.docx',
        skills: ['React', 'TypeScript', 'Python'],
        summary: 'Strong frontend architecture background with solid Python scripting experience.',
        score: 95,
    },
    {
        id: 'c4',
        name: 'Tarek Mansour',
        email: 'tarek.m@example.com',
        phone: '+961 03 444 888',
        jobId: '2',
        jobTitle: 'Python Backend / FastAPI Developer',
        stage: 'Offer',
        appliedAt: '6d ago',
        availability: '1 month notice',
        cvName: 'Tarek_Mansour_CV.pdf',
        skills: ['FastAPI', 'PostgreSQL', 'AWS'],
        summary: 'Passed technical interview with top marks on database indexing and auth security.',
        score: 97,
    },
    {
        id: 'c5',
        name: 'Layla Saab',
        email: 'layla.saab@example.com',
        phone: '+961 81 321 789',
        jobId: '1',
        jobTitle: 'Full-Stack Software Engineer',
        stage: 'Applied',
        appliedAt: '5h ago',
        availability: 'Flexible / Summer',
        cvName: 'Layla_Saab_CV.pdf',
        skills: ['React', 'Tailwind', 'Git'],
        summary: 'Computer Science senior with strong UI polish and collaborative hackathon projects.',
        score: 84,
    },
];

function normalizeStage(rawStage) {
    if (!rawStage) return 'Applied';
    const match = STAGES.find(
        (s) => s.id.toLowerCase() === String(rawStage).trim().toLowerCase()
    );
    return match ? match.id : 'Applied';
}

function normalizeCandidate(item, index = 0) {
    const screening = item.screening_answers || {};
    return {
        id: String(item.id ?? item.application_id ?? `c-${index}`),
        name:
            item.name ||
            [item.first_name, item.last_name].filter(Boolean).join(' ') ||
            'Applicant',
        email: item.email || item.candidate_email || '',
        phone: item.phone || item.candidate_phone || '',
        jobId: String(item.job_id ?? item.jobId ?? '1'),
        jobTitle: item.job_title || item.jobTitle || 'Open Role',
        stage: normalizeStage(item.stage ?? item.status),
        appliedAt: item.applied_at || item.appliedAt || 'Recently',
        availability: item.availability || screening.availability || 'Immediate',
        cvName: item.cv_name || item.cvName || item.resume_name || 'Resume.pdf',
        skills: Array.isArray(item.skills) ? item.skills : [],
        summary: item.summary || screening.experience_summary || '',
        score: typeof item.score === 'number' ? item.score : 85,
    };
}

export default function KanbanBoard({ jobs = [], currentUser }) {
    const [candidates, setCandidates] = useState([]);
    const [selectedJobFilter, setSelectedJobFilter] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [draggedId, setDraggedId] = useState(null);
    const [dragOverStage, setDragOverStage] = useState(null);
    const [activeCandidate, setActiveCandidate] = useState(null);
    const [statusError, setStatusError] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isUsingMockData, setIsUsingMockData] = useState(false);

    const canMoveCards = (currentUser?.role || '').toLowerCase() !== 'interviewer';

    const loadApplications = useCallback(async () => {
        setIsLoading(true);
        setStatusError('');
        try {
            const res = await authFetch('/applications');
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }
            const data = await res.json().catch(() => null);
            const list = Array.isArray(data) ? data : data?.applications || data?.items || [];
            setCandidates(list.map(normalizeCandidate));
            setIsUsingMockData(false);
        } catch {
            // Fall back to sample candidates if backend applications list isn't live yet
            setCandidates(INITIAL_TEST_CANDIDATES);
            setIsUsingMockData(true);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadApplications();
    }, [loadApplications]);

    const setCandidateStageLocal = (candidateId, targetStage) => {
        setCandidates((prev) =>
            prev.map((c) => (c.id === candidateId ? { ...c, stage: targetStage } : c))
        );
        setActiveCandidate((prev) =>
            prev?.id === candidateId ? { ...prev, stage: targetStage } : prev
        );
    };

    const moveCandidateToStage = async (candidateId, targetStage) => {
        if (!canMoveCards) return;

        const current = candidates.find((c) => c.id === candidateId);
        if (!current || current.stage === targetStage) return;

        const previousStage = current.stage;
        setStatusError('');
        setCandidateStageLocal(candidateId, targetStage);

        // Skip backend PATCH for local mock IDs (e.g., 'c1')
        if (isUsingMockData || String(candidateId).startsWith('c')) {
            return;
        }

        try {
            const res = await authFetch(`/applications/${candidateId}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status: targetStage }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                setCandidateStageLocal(candidateId, previousStage);
                setStatusError(
                    errData.detail || errData.message || 'Failed to persist candidate stage.'
                );
                return;
            }

            const updated = await res.json().catch(() => null);
            if (updated && (updated.status || updated.stage)) {
                setCandidateStageLocal(
                    candidateId,
                    normalizeStage(updated.status ?? updated.stage)
                );
            }
        } catch {
            setCandidateStageLocal(candidateId, previousStage);
            setStatusError('Network error while saving stage change. Reverted to previous stage.');
        }
    };

    const handleDrop = (e, targetStage) => {
        e.preventDefault();
        setDragOverStage(null);
        if (!canMoveCards || !draggedId) return;
        moveCandidateToStage(draggedId, targetStage);
        setDraggedId(null);
    };

    const filteredCandidates = candidates.filter((c) => {
        const matchesJob = selectedJobFilter === 'All' || c.jobId === String(selectedJobFilter);
        const q = searchQuery.toLowerCase();
        const matchesQuery =
            c.name.toLowerCase().includes(q) ||
            c.jobTitle.toLowerCase().includes(q) ||
            c.skills.some((s) => s.toLowerCase().includes(q));
        return matchesJob && matchesQuery;
    });

    return (
        <div className="space-y-6 text-left">
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <span className="text-xs font-sans tracking-widest text-[#A65D37] uppercase">
                        Workspace / {isUsingMockData ? 'Pipeline Preview (Offline Fallback)' : 'Live Pipeline'}
                    </span>
                    <h1 className="text-3xl font-normal text-[#2C2825] mt-1">
                        Candidate Kanban
                    </h1>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 font-sans">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Filter name or skill..."
                        className="px-3.5 py-2 bg-[#F3EFEA] border border-[#EBE5DE] rounded-xl text-xs text-[#2C2825] placeholder-[#B5A89E] focus:outline-none focus:ring-1 focus:ring-[#C86D51]"
                    />

                    <select
                        value={selectedJobFilter}
                        onChange={(e) => setSelectedJobFilter(e.target.value)}
                        className="px-3.5 py-2 bg-[#F3EFEA] border border-[#EBE5DE] rounded-xl text-xs text-[#2C2825] focus:outline-none focus:ring-1 focus:ring-[#C86D51]"
                    >
                        <option value="All">All Roles ({candidates.length})</option>
                        {jobs.map((job) => (
                            <option key={job.id} value={String(job.id)}>
                                {job.title}
                            </option>
                        ))}
                    </select>

                    <button
                        type="button"
                        onClick={loadApplications}
                        disabled={isLoading}
                        className="text-xs px-3 py-2 rounded-xl bg-[#EBE5DE] hover:bg-[#DED6CC] disabled:opacity-50 text-[#2C2825] transition"
                    >
                        {isLoading ? 'Syncing...' : 'Refresh Board'}
                    </button>
                </div>
            </div>

            {statusError && (
                <div className="p-3 rounded-xl bg-[#F3EFEA] border border-[#C86D51] text-xs font-sans text-[#A65D37]">
                    {statusError}
                </div>
            )}

            {/* 5-Column Kanban Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 items-start">
                {STAGES.map((stage, stageIndex) => {
                    const columnItems = filteredCandidates.filter((c) => c.stage === stage.id);
                    const isOver = dragOverStage === stage.id;

                    return (
                        <div
                            key={stage.id}
                            onDragOver={(e) => {
                                e.preventDefault();
                                if (canMoveCards) setDragOverStage(stage.id);
                            }}
                            onDragLeave={() => setDragOverStage(null)}
                            onDrop={(e) => handleDrop(e, stage.id)}
                            className={`rounded-3xl p-4 border transition min-h-[420px] flex flex-col gap-3 ${isOver
                                ? 'bg-[#EFEAE3] border-[#C86D51]'
                                : 'bg-[#F3EFEA] border-[#EBE5DE]'
                                }`}
                        >
                            {/* Column Header */}
                            <div className="flex items-center justify-between px-1 pb-2 border-b border-[#EBE5DE] font-sans">
                                <div className="flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-[#FBF9F5] border border-[#EBE5DE] text-[#A65D37] text-[11px] font-medium flex items-center justify-center">
                                        {stage.number}
                                    </span>
                                    <h2 className="font-serif text-lg text-[#2C2825]">{stage.label}</h2>
                                </div>
                                <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#FBF9F5] border border-[#EBE5DE] text-[#796E65]">
                                    {columnItems.length}
                                </span>
                            </div>

                            {/* Candidate Cards */}
                            {columnItems.length === 0 ? (
                                <div className="flex-1 flex items-center justify-center border border-dashed border-[#DED6CC] rounded-2xl p-6 text-center font-sans text-xs text-[#8C7A6B]">
                                    Drop candidate here
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {columnItems.map((candidate) => (
                                        <div
                                            key={candidate.id}
                                            draggable={canMoveCards}
                                            onDragStart={() => setDraggedId(candidate.id)}
                                            onDragEnd={() => {
                                                setDraggedId(null);
                                                setDragOverStage(null);
                                            }}
                                            onClick={() => setActiveCandidate(candidate)}
                                            className={`bg-[#FBF9F5] border border-[#EBE5DE] hover:border-[#C86D51] rounded-2xl p-4 space-y-3 transition shadow-xs ${canMoveCards ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
                                                } ${draggedId === candidate.id ? 'opacity-50' : ''}`}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <h3 className="text-base font-normal text-[#2C2825] leading-snug">
                                                        {candidate.name}
                                                    </h3>
                                                    <p className="text-[11px] font-sans text-[#8C7A6B] mt-0.5">
                                                        {candidate.jobTitle}
                                                    </p>
                                                </div>
                                                <span className="text-[11px] font-sans font-medium px-2 py-0.5 rounded-lg bg-[#F3EFEA] text-[#A65D37] shrink-0">
                                                    {candidate.score}% match
                                                </span>
                                            </div>

                                            {/* Skill Tags */}
                                            <div className="flex flex-wrap gap-1.5 font-sans">
                                                {candidate.skills.map((skill, idx) => (
                                                    <span
                                                        key={idx}
                                                        className="text-[10px] px-2 py-0.5 rounded-md bg-[#F3EFEA] text-[#796E65]"
                                                    >
                                                        {skill}
                                                    </span>
                                                ))}
                                            </div>

                                            {/* Card Footer: Timestamp + Quick Stage Arrows */}
                                            <div className="pt-2 border-t border-[#EBE5DE] flex items-center justify-between font-sans text-[11px] text-[#8C7A6B]">
                                                <span>{candidate.appliedAt}</span>

                                                {canMoveCards && (
                                                    <div
                                                        className="flex items-center gap-1"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        {stageIndex > 0 && (
                                                            <button
                                                                type="button"
                                                                title={`Move to ${STAGES[stageIndex - 1].label}`}
                                                                onClick={() =>
                                                                    moveCandidateToStage(candidate.id, STAGES[stageIndex - 1].id)
                                                                }
                                                                className="px-2 py-0.5 rounded bg-[#F3EFEA] hover:bg-[#EBE5DE] text-[#2C2825] transition"
                                                            >
                                                                &larr;
                                                            </button>
                                                        )}
                                                        {stageIndex < STAGES.length - 1 && (
                                                            <button
                                                                type="button"
                                                                title={`Move to ${STAGES[stageIndex + 1].label}`}
                                                                onClick={() =>
                                                                    moveCandidateToStage(candidate.id, STAGES[stageIndex + 1].id)
                                                                }
                                                                className="px-2 py-0.5 rounded bg-[#C86D51] hover:bg-[#B35C41] text-white transition"
                                                            >
                                                                &rarr;
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Clicking any card opens full details */}
            {activeCandidate && (
                <div
                    onClick={() => setActiveCandidate(null)}
                    className="fixed inset-0 bg-[#2C2825]/40 backdrop-blur-xs z-30 flex items-center justify-center p-4"
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="max-w-lg w-full bg-[#FBF9F5] border border-[#EBE5DE] rounded-3xl p-6 sm:p-8 shadow-lg space-y-5 text-left"
                    >
                        <div className="flex justify-between items-start gap-4 border-b border-[#EBE5DE] pb-4">
                            <div>
                                <span className="text-[11px] font-sans uppercase tracking-wider text-[#A65D37]">
                                    {activeCandidate.jobTitle}
                                </span>
                                <h3 className="text-2xl font-normal text-[#2C2825] mt-0.5">
                                    {activeCandidate.name}
                                </h3>
                                <p className="text-xs font-sans text-[#796E65] mt-1">
                                    {activeCandidate.email} · {activeCandidate.phone}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setActiveCandidate(null)}
                                className="text-xs font-sans text-[#8C7A6B] hover:text-[#2C2825]"
                            >
                                Close ✕
                            </button>
                        </div>

                        <div className="space-y-3 font-sans text-xs">
                            <div>
                                <span className="block text-[11px] uppercase tracking-wider text-[#8C7A6B] mb-1">
                                    Experience Summary
                                </span>
                                <p className="text-[#2C2825] leading-relaxed bg-[#F3EFEA] p-3.5 rounded-xl border border-[#EBE5DE]">
                                    {activeCandidate.summary}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-[#F3EFEA] p-3 rounded-xl border border-[#EBE5DE]">
                                    <span className="block text-[10px] uppercase text-[#8C7A6B]">Availability</span>
                                    <span className="text-[#2C2825] font-medium">{activeCandidate.availability}</span>
                                </div>
                                <div className="bg-[#F3EFEA] p-3 rounded-xl border border-[#EBE5DE]">
                                    <span className="block text-[10px] uppercase text-[#8C7A6B]">Attached CV</span>
                                    <span className="text-[#A65D37] font-medium underline cursor-pointer">
                                        {activeCandidate.cvName}
                                    </span>
                                </div>
                            </div>

                            {canMoveCards && (
                                <div className="pt-2">
                                    <span className="block text-[11px] uppercase tracking-wider text-[#8C7A6B] mb-2">
                                        Move Pipeline Stage
                                    </span>
                                    <div className="flex flex-wrap gap-2">
                                        {STAGES.map((st) => (
                                            <button
                                                key={st.id}
                                                type="button"
                                                onClick={() => moveCandidateToStage(activeCandidate.id, st.id)}
                                                className={`px-3 py-1.5 rounded-xl text-xs transition ${activeCandidate.stage === st.id
                                                    ? 'bg-[#C86D51] text-white'
                                                    : 'bg-[#F3EFEA] text-[#796E65] border border-[#EBE5DE] hover:text-[#2C2825]'
                                                    }`}
                                            >
                                                {st.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}