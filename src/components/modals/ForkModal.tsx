import React, { useState } from 'react';
import { X, GitFork } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { useProjectStore } from '../../stores/projectStore';
import { useAuthStore } from '../../stores/authStore';

export const ForkModal: React.FC = () => {
  const { forkModalData, closeForkModal, showToast, openProjectPage } = useUIStore();
  const { forkProject } = useProjectStore();
  const { currentUser } = useAuthStore();

  const original = forkModalData?.project;
  const [forkedName, setForkedName] = useState(
    original ? `${original.name}-Mobile` : 'My-Extension'
  );
  const [intent, setIntent] = useState('Porting the inference runtime to Android Vulkan shaders');

  if (!original) return null;

  const handleCreateFork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forkedName.trim()) return;

    try {
      const newFork = await forkProject(
        original.id,
        forkedName.trim(),
        {
          id: currentUser.id,
          name: currentUser.name,
          handle: currentUser.handle,
          avatar: currentUser.avatar,
        }
      );

      showToast(`Forked ${original.name} → @${newFork.name}!`);
      closeForkModal();
      openProjectPage(newFork.id);
    } catch (err: any) {
      showToast(err.message || 'Failed to fork project');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-soft-lg overflow-hidden text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-dev-accent">
              <GitFork className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Fork Project
              </h2>
              <p className="text-[11px] text-slate-500">I want to build on this</p>
            </div>
          </div>
          <button
            onClick={closeForkModal}
            className="p-1.5 rounded-lg hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleCreateFork} className="p-6 space-y-4">
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200">
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">
              Original Upstream
            </div>
            <div className="text-sm font-semibold text-slate-900 font-mono flex items-center justify-between">
              <span>{original.name}</span>
              <span className="text-xs text-slate-500 font-normal">{original.primaryTech}</span>
            </div>
            <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
              {original.tagline}
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Your Fork Version Name
            </label>
            <input
              type="text"
              required
              value={forkedName}
              onChange={(e) => setForkedName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:bg-white focus:border-dev-accent focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              What will you build on top?
            </label>
            <textarea
              rows={2}
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              placeholder="e.g. Adding WebGPU shader pass or building desktop client..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-dev-accent focus:ring-2 focus:ring-blue-100 resize-none leading-relaxed transition-all"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={closeForkModal}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4.5 py-2 rounded-xl bg-dev-accent hover:bg-dev-accentHover text-white font-medium text-xs shadow-soft transition-all active:scale-95 flex items-center gap-1.5"
            >
              <GitFork className="w-3.5 h-3.5" />
              <span>Create Fork</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
