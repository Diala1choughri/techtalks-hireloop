import React, { useState } from 'react';
import KanbanBoard from './KanbanBoard';

export default function JobsManagement({ currentUser, jobs, setJobs, onLogout }) {
    const canEdit = currentUser?.role === 'HR';
    const [workspaceTab, setWorkspaceTab] = useState('jobs'); // 'jobs' | 'kanban'

    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [copiedId, setCopiedId] = useState(null);
    const [filterStatus, setFilterStatus] = useState('All'); // 'All' | 'Open' | 'Draft' | 'Closed' | 'Archived'

    const [title, setTitle] = useState('');
    const [department, setDepartment] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState('Open');
    const [skillsText, setSkillsText] = useState(''); // e.g. "React:50, Tailwind:30, Git:20"

    const parseSkills = (raw) => {
        if (!raw.trim()) return [];
        return raw
            .split(',')
            .map((item) => {
                const [namePart, weightPart] = item.split(':');
                return {
                    name: namePart.trim(),
                    weight: Number(weightPart?.trim()) || 25,
                };
            })
            .filter((s) => s.name);
    };

    const resetForm = () => {
        setTitle('');
        setDepartment('');
        setDescription('');
        setStatus('Open');
        setSkillsText('');
        setEditingId(null);
        setShowForm(false);
    };

    const handleOpenCreate = () => {
        resetForm();
        setShowForm(true);
    };

    const handleOpenEdit = (job) => {
        setEditingId(job.id);
        setTitle(job.title);
        setDepartment(job.department || '');
        setDescription(job.description || '');
        setStatus(job.status);
        setSkillsText((job.skills || []).map((s) => `${s.name}:${s.weight}`).join(', '));
        setShowForm(true);
    };

    const handleSaveJob = (e) => {
        e.preventDefault();
        if (!title.trim()) return;

        const formattedSkills = parseSkills(skillsText);

        if (editingId) {
            setJobs(
                jobs.map((job) =>
                    job.id === editingId
                        ? { ...job, title, department, description, status, skills: formattedSkills }
                        : job
                )
            );
        } else {
            const newJob = {
                id: String(Date.now()),
                title,
                department,
                description,
                status,
                skills: formattedSkills,
                archived: false,
            };
            setJobs([newJob, ...jobs]);
        }

        resetForm();
    };

    const handleStatusChange = (id, nextStatus) => {
        setJobs(
            jobs.map((job) =>
                job.id === id ? { ...job, status: nextStatus, archived: false } : job
            )
        );
    };

    const handleArchive = (id) => {
        setJobs(
            jobs.map((job) =>
                job.id === id ? { ...job, archived: true, status: 'Closed' } : job
            )
        );
    };

    const handleCopyLink = (jobId) => {
        const shareUrl = `${window.location.origin}/?job=${jobId}`;
        navigator.clipboard?.writeText(shareUrl);
        setCopiedId(jobId);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const visibleJobs = jobs.filter((job) => {
        if (filterStatus === 'Archived') return job.archived;
        if (job.archived) return false;
        if (filterStatus === 'All') return true;
        return job.status === filterStatus;
    });

    return (
        <div className="min-h-screen bg-[#FBF9F5] text-[#2C2825] font-serif flex flex-col">
            {/* Workspace Navbar */}
            <header className="w-full border-b border-[#EBE5DE] px-6 sm:px-8 py-5 flex flex-wrap justify-between items-center gap-3 bg-[#FBF9F5]/85 backdrop-blur-sm sticky top-0 z-20">
                <div className="flex items-center gap-2.5 flex-wrap">
                    <div className="w-2.5 h-2.5 bg-[#C86D51] rounded-full"></div>
                    <span className="font-medium tracking-wide text-lg text-[#2C2825]">HireLoop</span>
                    {currentUser?.role && (
                        <span className="text-[11px] font-sans px-2.5 py-0.5 rounded-full bg-[#F3EFEA] border border-[#EBE5DE] text-[#A65D37]">
                            {currentUser.role}
                        </span>
                    )}

                    {/* Workspace Tab Switcher */}
                    <div className="flex items-center gap-1.5 ml-2 font-sans bg-[#F3EFEA] p-1 rounded-xl border border-[#EBE5DE]">
                        <button
                            type="button"
                            onClick={() => setWorkspaceTab('jobs')}
                            className={`text-xs px-3 py-1 rounded-lg transition ${workspaceTab === 'jobs'
                                ? 'bg-[#2C2825] text-[#FBF9F5]'
                                : 'text-[#796E65] hover:text-[#2C2825]'
                                }`}
                        >
                            Roles
                        </button>
                        <button
                            type="button"
                            onClick={() => setWorkspaceTab('kanban')}
                            className={`text-xs px-3 py-1 rounded-lg transition ${workspaceTab === 'kanban'
                                ? 'bg-[#C86D51] text-white'
                                : 'text-[#796E65] hover:text-[#2C2825]'
                                }`}
                        >
                            Kanban Board
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-3 font-sans">
                    <span className="hidden sm:inline text-xs text-[#796E65]">
                        {currentUser?.name || currentUser?.email || ''}
                    </span>
                    <button
                        type="button"
                        onClick={onLogout}
                        className="text-xs px-4 py-2 rounded-lg bg-[#EBE5DE] hover:bg-[#DED6CC] text-[#2C2825] transition"
                    >
                        Log Out
                    </button>
                </div>
            </header>

            <main className="flex-1 px-6 sm:px-8 py-10">
                {workspaceTab === 'kanban' ? (
                    <div className="max-w-6xl mx-auto">
                        <KanbanBoard currentUser={currentUser} jobs={jobs} />
                    </div>
                ) : (
                    <div className="max-w-4xl mx-auto space-y-8">
                        {/* Page Header */}
                        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 text-left">
                            <div>
                                <span className="text-xs font-sans tracking-widest text-[#A65D37] uppercase">
                                    Workspace / Roles
                                </span>
                                <h1 className="text-3xl font-normal text-[#2C2825] mt-1">
                                    Jobs Management
                                </h1>
                            </div>

                            {canEdit && !showForm && (
                                <button
                                    type="button"
                                    onClick={handleOpenCreate}
                                    className="py-3 px-5 bg-[#C86D51] hover:bg-[#B35C41] text-white font-sans font-medium rounded-xl transition text-xs shadow-sm self-start sm:self-auto"
                                >
                                    + New Role
                                </button>
                            )}
                        </div>

                        {/* Read-only notice for non-editing roles */}
                        {!canEdit && (
                            <div className="p-4 rounded-2xl bg-[#F3EFEA] border border-[#EBE5DE] text-xs font-sans text-[#796E65] text-left">
                                Viewing as <span className="font-medium text-[#2C2825]">{currentUser?.role || 'Team Member'}</span> (read-only access to job postings).
                            </div>
                        )}

                        {/* Create / Edit Job Form */}
                        {showForm && canEdit && (
                            <form
                                onSubmit={handleSaveJob}
                                className="bg-[#F3EFEA] border border-[#EBE5DE] rounded-3xl p-6 sm:p-8 space-y-5 text-left font-sans"
                            >
                                <div className="flex justify-between items-center border-b border-[#EBE5DE] pb-3">
                                    <h2 className="font-serif text-xl text-[#2C2825]">
                                        {editingId ? 'Edit Role' : 'Create New Role'}
                                    </h2>
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        className="text-xs text-[#8C7A6B] hover:text-[#2C2825]"
                                    >
                                        Cancel
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-[#796E65] mb-1.5 uppercase tracking-wider">
                                            Job Title
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            placeholder="Frontend React Engineer"
                                            className="w-full px-3.5 py-2.5 bg-[#FBF9F5] border border-[#EBE5DE] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#C86D51]"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-[#796E65] mb-1.5 uppercase tracking-wider">
                                            Department / Team
                                        </label>
                                        <input
                                            type="text"
                                            value={department}
                                            onChange={(e) => setDepartment(e.target.value)}
                                            placeholder="Engineering"
                                            className="w-full px-3.5 py-2.5 bg-[#FBF9F5] border border-[#EBE5DE] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#C86D51]"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-[#796E65] mb-1.5 uppercase tracking-wider">
                                        Description
                                    </label>
                                    <textarea
                                        rows="3"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Role expectations, responsibilities, and team context..."
                                        className="w-full px-3.5 py-2.5 bg-[#FBF9F5] border border-[#EBE5DE] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#C86D51]"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="sm:col-span-2">
                                        <label className="block text-xs font-medium text-[#796E65] mb-1.5 uppercase tracking-wider">
                                            Required Skills & Weights (Skill:Weight)
                                        </label>
                                        <input
                                            type="text"
                                            value={skillsText}
                                            onChange={(e) => setSkillsText(e.target.value)}
                                            placeholder="React:50, JavaScript:30, Tailwind:20"
                                            className="w-full px-3.5 py-2.5 bg-[#FBF9F5] border border-[#EBE5DE] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#C86D51]"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-[#796E65] mb-1.5 uppercase tracking-wider">
                                            Status
                                        </label>
                                        <select
                                            value={status}
                                            onChange={(e) => setStatus(e.target.value)}
                                            className="w-full px-3.5 py-2.5 bg-[#FBF9F5] border border-[#EBE5DE] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#C86D51]"
                                        >
                                            <option value="Open">Open</option>
                                            <option value="Draft">Draft</option>
                                            <option value="Closed">Closed</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="pt-2 flex justify-end gap-3">
                                    <button
                                        type="submit"
                                        className="px-6 py-2.5 bg-[#C86D51] hover:bg-[#B35C41] text-white font-medium rounded-xl transition text-xs shadow-sm"
                                    >
                                        {editingId ? 'Save Changes' : 'Publish Role'}
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* Filter Tabs */}
                        <div className="flex flex-wrap gap-2 font-sans">
                            {['All', 'Open', 'Draft', 'Closed', 'Archived'].map((tab) => (
                                <button
                                    key={tab}
                                    type="button"
                                    onClick={() => setFilterStatus(tab)}
                                    className={`text-xs px-3.5 py-1.5 rounded-full border transition ${filterStatus === tab
                                        ? 'bg-[#2C2825] text-[#FBF9F5] border-[#2C2825]'
                                        : 'bg-[#F3EFEA] text-[#796E65] border-[#EBE5DE] hover:text-[#2C2825]'
                                        }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        {/* Jobs List */}
                        <div className="space-y-4">
                            {visibleJobs.length === 0 ? (
                                <div className="bg-[#F3EFEA] border border-[#EBE5DE] rounded-3xl p-8 text-center font-sans text-sm text-[#796E65]">
                                    No roles in this view yet.
                                </div>
                            ) : (
                                visibleJobs.map((job) => (
                                    <div
                                        key={job.id}
                                        className="bg-[#F3EFEA] border border-[#EBE5DE] rounded-3xl p-6 text-left space-y-4"
                                    >
                                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                            <div>
                                                <div className="flex items-center gap-2.5 flex-wrap">
                                                    <h3 className="text-xl font-normal text-[#2C2825]">{job.title}</h3>
                                                    <span
                                                        className={`text-[11px] font-sans px-2.5 py-0.5 rounded-full border ${job.status === 'Open'
                                                            ? 'bg-[#FBF9F5] text-[#A65D37] border-[#C86D51]'
                                                            : 'bg-[#EBE5DE] text-[#796E65] border-[#DED6CC]'
                                                            }`}
                                                    >
                                                        {job.archived ? 'Archived' : job.status}
                                                    </span>
                                                </div>
                                                {job.department && (
                                                    <p className="text-xs font-sans text-[#8C7A6B] mt-1">{job.department}</p>
                                                )}
                                            </div>

                                            {/* Shareable Link Button (for Open roles) */}
                                            {job.status === 'Open' && !job.archived && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopyLink(job.id)}
                                                    className="text-xs font-sans px-3.5 py-2 rounded-xl bg-[#FBF9F5] hover:bg-[#EBE5DE] border border-[#EBE5DE] text-[#2C2825] transition self-start"
                                                >
                                                    {copiedId === job.id ? 'Link Copied ✓' : 'Copy Public Link'}
                                                </button>
                                            )}
                                        </div>

                                        {job.description && (
                                            <p className="text-xs font-sans text-[#796E65] leading-relaxed">
                                                {job.description}
                                            </p>
                                        )}

                                        {/* Skills */}
                                        {(job.skills || []).length > 0 && (
                                            <div className="flex flex-wrap gap-2 font-sans">
                                                {(job.skills || []).map((skill, idx) => (
                                                    <span
                                                        key={idx}
                                                        className="text-[11px] px-2.5 py-1 rounded-lg bg-[#FBF9F5] border border-[#EBE5DE] text-[#796E65]"
                                                    >
                                                        {skill.name} · {skill.weight}%
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {/* Controls for HR */}
                                        {canEdit && (
                                            <div className="pt-3 border-t border-[#EBE5DE] flex flex-wrap items-center justify-between gap-3 font-sans">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[11px] text-[#8C7A6B]">Status:</span>
                                                    {['Open', 'Draft', 'Closed'].map((st) => (
                                                        <button
                                                            key={st}
                                                            type="button"
                                                            onClick={() => handleStatusChange(job.id, st)}
                                                            className={`text-[11px] px-2.5 py-1 rounded-lg transition ${job.status === st && !job.archived
                                                                ? 'bg-[#C86D51] text-white'
                                                                : 'bg-[#FBF9F5] text-[#796E65] border border-[#EBE5DE] hover:text-[#2C2825]'
                                                                }`}
                                                        >
                                                            {st}
                                                        </button>
                                                    ))}
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenEdit(job)}
                                                        className="text-xs text-[#796E65] hover:text-[#2C2825] transition"
                                                    >
                                                        Edit
                                                    </button>
                                                    {!job.archived && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleArchive(job.id)}
                                                            className="text-xs text-[#A65D37] hover:underline"
                                                        >
                                                            Archive
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}