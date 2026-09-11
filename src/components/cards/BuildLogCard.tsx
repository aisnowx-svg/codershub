import React, { useState } from 'react';
import { BuildLog } from '../../types';
import { TechBadge } from '../common/TechBadge';
import { Heart, MessageSquare, GitFork, Share2, ExternalLink, ChevronDown, ChevronUp, Send, Star } from 'lucide-react';
import { useFeedStore } from '../../stores/feedStore';
import { useUIStore } from '../../stores/uiStore';
import { useProjectStore } from '../../stores/projectStore';
import { useAuthStore } from '../../stores/authStore';

interface BuildLogCardProps {
  log: BuildLog;
}

export const BuildLogCard: React.FC<BuildLogCardProps> = ({ log }) => {
  const [showComments, setShowComments] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [commentInput, setCommentInput] = useState('');

  const { toggleFire, addComment, deleteComment, loadComments, comments } = useFeedStore();
  const { openProjectPage, openDeveloperProfile, openForkModal, showToast } = useUIStore();
  const { projects } = useProjectStore();
  const { currentUser, isAuthenticated, setAuthModalOpen } = useAuthStore();

  const logComments = comments[log.id] || [];
  const relatedProject = projects.find((p) => p.id === log.projectId);

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      setAuthModalOpen(true);
      return;
    }
    toggleFire(log.id, currentUser?.id);
  };

  const handleToggleComments = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !showComments;
    setShowComments(next);
    if (next) {
      loadComments(log.id);
    }
  };

  const handleFork = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (relatedProject) {
      openForkModal(relatedProject);
    } else {
      openForkModal({
        id: log.projectId,
        name: log.projectName,
        tagline: log.title,
        description: log.summary,
        stars: 1,
        forkCount: log.forkCount,
        repositoryUrl: log.repositoryUrl || 'https://github.com',
        primaryTech: log.techStack[0] || 'Rust',
        techStack: log.techStack,
        status: 'active',
        category: 'Systems',
        contributors: [{ id: log.authorId, name: log.authorName, handle: log.authorHandle, avatar: log.authorAvatar, role: 'Author' }],
        buildActivityCount: 1,
      });
    }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    showToast(`Copied build link for @${log.projectName}!`);
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;
    if (!isAuthenticated) {
      setAuthModalOpen(true);
      return;
    }
    try {
      await addComment(log.id, commentInput.trim(), currentUser.id);
      setCommentInput('');
      setShowComments(true);
      showToast('Comment posted');
    } catch (err: any) {
      showToast(err.message || 'Failed to post comment');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    await deleteComment(commentId, log.id);
    showToast('Comment deleted');
  };

  return (
    <article className="w-full bg-white border border-slate-200/80 rounded-2xl p-6 text-left shadow-soft hover:shadow-soft-hover transition-all">
      {/* 1. Author Info, Project context, and DAY badge */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3.5">
          <img
            src={log.authorAvatar}
            alt={log.authorName}
            onClick={() => openDeveloperProfile(log.authorId)}
            className="w-10 h-10 rounded-full object-cover border border-slate-200 cursor-pointer hover:ring-2 hover:ring-blue-500/20 transition-all shrink-0"
          />
          <div>
            <div className="flex items-center gap-2">
              <span
                onClick={() => openDeveloperProfile(log.authorId)}
                className="text-sm font-bold text-slate-900 hover:text-blue-600 cursor-pointer font-sans"
              >
                {log.authorName}
              </span>
              <span className="text-xs text-slate-400">@{log.authorHandle}</span>
              <span className="text-slate-300">·</span>
              <span className="text-xs text-slate-400">{log.createdAt}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5 font-medium">
              <span>Building</span>
              <button
                onClick={() => openProjectPage(log.projectId)}
                className="font-semibold text-blue-600 hover:underline cursor-pointer inline-flex items-center"
              >
                @{log.projectName}
              </button>
            </div>
          </div>
        </div>

        {/* DAY Badge */}
        <div className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-code text-xs font-semibold shrink-0">
          DAY {log.dayNumber}
        </div>
      </div>

      {/* 2. Content Title & Explanation */}
      <h2 className="text-base font-bold text-slate-900 mb-2 leading-snug tracking-tight font-sans">
        {log.title}
      </h2>
      <p className="text-xs sm:text-sm text-slate-600 mb-4 leading-relaxed font-normal">
        {log.summary}
      </p>

      {/* 3. Compact Project Identity Block (Section 10) */}
      {relatedProject && (
        <div
          onClick={() => openProjectPage(relatedProject.id)}
          className="mb-4 p-3.5 bg-slate-50/70 hover:bg-slate-50 border border-slate-200/70 rounded-xl cursor-pointer transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-bold text-blue-600 text-xs shadow-2xs shrink-0 font-code">
              {relatedProject.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors flex items-center gap-1.5">
                <span>{relatedProject.name}</span>
                <span className="text-[10px] text-slate-400 font-normal truncate">
                  — {relatedProject.tagline}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                <span>{relatedProject.techStack.slice(0, 3).join(' · ')}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 text-xs font-medium text-amber-500 shrink-0 pl-3">
            <Star className="w-3.5 h-3.5 fill-current" />
            <span>{relatedProject.stars.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* 4. What Changed (Bulleted list) */}
      {log.changes && log.changes.length > 0 && (
        <div className="bg-slate-50/60 rounded-xl p-4 border border-slate-100 mb-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2 font-sans">
            What Changed
          </div>
          <ul className="space-y-1.5">
            {log.changes.map((change, idx) => (
              <li key={idx} className="text-xs text-slate-700 flex items-start gap-2.5">
                <span className="text-blue-500 font-bold select-none">•</span>
                <span className="leading-relaxed">{change}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 5. Code / Diff Preview (Light, Soft Styling) */}
      {log.diffSnippet && (
        <div className="mb-4">
          <button
            onClick={() => setShowDiff(!showDiff)}
            className="w-full flex items-center justify-between text-xs font-code bg-slate-50 hover:bg-slate-100/80 px-3.5 py-2 rounded-t-xl border border-slate-200/80 text-slate-600 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2.5">
              <span className="text-slate-800 font-medium">{log.diffSnippet.filename}</span>
              <span className="text-emerald-600 font-bold">+{log.diffSnippet.additions}</span>
              <span className="text-rose-500 font-bold">-{log.diffSnippet.deletions}</span>
            </span>
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              {showDiff ? 'Hide diff' : 'View diff'}
              {showDiff ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </span>
          </button>
          {showDiff && (
            <div className="bg-white border-x border-b border-slate-200/80 rounded-b-xl p-4 font-code text-xs overflow-x-auto text-slate-700">
              <pre className="text-xs leading-5.5 whitespace-pre">
                {log.diffSnippet.code.split('\n').map((line, idx) => {
                  const isAdd = line.startsWith('+');
                  const isDel = line.startsWith('-');
                  return (
                    <div
                      key={idx}
                      className={`${
                        isAdd
                          ? 'text-emerald-700 bg-emerald-50 -mx-4 px-4 font-medium'
                          : isDel
                          ? 'text-rose-700 bg-rose-50 -mx-4 px-4 font-medium'
                          : 'text-slate-500'
                      }`}
                    >
                      {line}
                    </div>
                  );
                })}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* 6. Tech Tags */}
      <div className="flex flex-wrap items-center gap-1.5 mb-4">
        {log.techStack.map((tech) => (
          <TechBadge key={tech} name={tech} size="xs" />
        ))}
      </div>

      {/* 7. Subtle Bottom Social Bar (❤️, 💬, ⑂, Share) */}
      <div className="flex items-center justify-between pt-3.5 border-t border-slate-100 text-xs text-slate-500">
        <div className="flex items-center gap-5">
          {/* Heart / Like ❤️ */}
          <button
            onClick={handleLike}
            className={`inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
              log.isLiked ? 'text-rose-600 font-semibold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Heart className={`w-4 h-4 ${log.isLiked ? 'fill-current text-rose-500' : ''}`} />
            <span>{log.fireCount}</span>
          </button>

          {/* Comments 💬 */}
          <button
            onClick={handleToggleComments}
            className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" />
            <span>{log.commentsCount}</span>
          </button>

          {/* Fork ⑂ */}
          <button
            onClick={handleFork}
            title="I want to build on top of this"
            className="inline-flex items-center gap-1.5 text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
          >
            <GitFork className="w-4 h-4" />
            <span>{log.forkCount}</span>
          </button>

          {/* Share */}
          <button
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Share</span>
          </button>
        </div>

        <button
          onClick={() => openProjectPage(log.projectId)}
          className="text-xs text-slate-400 hover:text-blue-600 transition-colors flex items-center gap-1 cursor-pointer font-medium"
        >
          <span>View repository</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 8. Expandable Comments Drawer */}
      {showComments && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="space-y-3 mb-4">
            {logComments.length === 0 ? (
              <div className="text-xs text-slate-400 py-2 italic">
                No comments yet. Be the first to share your thoughts.
              </div>
            ) : (
              logComments.map((comment) => (
                <div key={comment.id} className="bg-slate-50 rounded-xl p-3 text-xs border border-slate-100 text-left">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <img
                        src={comment.authorAvatar}
                        alt={comment.authorName}
                        className="w-5 h-5 rounded-full object-cover"
                      />
                      <span className="font-semibold text-slate-800">{comment.authorName}</span>
                      <span className="text-[11px] text-slate-400">@{comment.authorHandle}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400">{comment.createdAt}</span>
                      {currentUser?.id && comment.authorId === currentUser.id && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="text-[10px] text-slate-400 hover:text-red-600 font-medium cursor-pointer"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-slate-600 pl-7 leading-relaxed">{comment.content}</p>
                </div>
              ))
            )}
          </div>

          {/* Comment Form */}
          <form onSubmit={handleAddComment} className="flex gap-2">
            <input
              type="text"
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              placeholder="Ask a technical question or comment on this build..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
            />
            <button
              type="submit"
              disabled={!commentInput.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </form>
        </div>
      )}
    </article>
  );
};
