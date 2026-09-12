import React, { useState } from 'react';
import { X, Users, Send } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { useProjectStore } from '../../stores/projectStore';
import { TechBadge } from '../common/TechBadge';

export const JoinProjectModal: React.FC = () => {
  const { joinModalData, closeJoinModal, showToast } = useUIStore();
  const { submitJoinRequest } = useProjectStore();

  const project = joinModalData?.project;
  const opp = project?.lookingForContributors;

  const [position, setPosition] = useState(opp?.requiredSkills[0] ? `${opp.requiredSkills[0]} Systems Contributor` : 'Core Contributor');
  const [pitch, setPitch] = useState('I have experience optimizing parallel async pipelines and would love to contribute to this module.');

  if (!project) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitJoinRequest(project.id, position, pitch);
    showToast(`Collaboration request sent to @${project.name} maintainers!`);
    closeJoinModal();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-white border-t sm:border border-slate-200 rounded-t-3xl sm:rounded-2xl shadow-soft-lg overflow-hidden text-left max-h-[92vh] sm:max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-dev-accent">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Join Project
              </h2>
              <p className="text-[11px] text-slate-500">Collaborate on {project.name}</p>
            </div>
          </div>
          <button
            onClick={closeJoinModal}
            className="p-1.5 rounded-lg hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200">
            <div className="text-[11px] font-semibold text-dev-accent uppercase tracking-wider mb-1">
              {opp?.openPositions || 2} Open Position(s)
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {opp?.description || project.description}
            </p>
            {opp?.requiredSkills && (
              <div className="flex flex-wrap gap-1 mt-2.5">
                {opp.requiredSkills.map((s) => (
                  <TechBadge key={s} name={s} size="xs" />
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Role / Focus Area
            </label>
            <input
              type="text"
              required
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:bg-white focus:border-dev-accent focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Relevant Experience / PRs / Pitch
            </label>
            <textarea
              rows={3}
              required
              value={pitch}
              onChange={(e) => setPitch(e.target.value)}
              placeholder="Explain what PR or technical contribution you want to tackle..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-dev-accent focus:ring-2 focus:ring-blue-100 resize-none leading-relaxed transition-all"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={closeJoinModal}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4.5 py-2 rounded-xl bg-dev-accent hover:bg-dev-accentHover text-white font-medium text-xs shadow-soft transition-all active:scale-95 flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit Request</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
