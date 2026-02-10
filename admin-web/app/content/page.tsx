'use client';

import React from 'react';
import { trpc } from '../../utils/trpc';
import { MessageCircle, Trash2, MapPin, User } from 'lucide-react';

export default function ContentPage() {
    const commentsList = trpc.admin.getRecentComments.useQuery();
    const deleteComment = trpc.admin.deleteComment.useMutation({
        onSuccess: () => commentsList.refetch(),
        onError: (err) => alert("Failed to delete: " + err.message)
    });

    return (
        <>
            <header className="mb-12">
                <h2 className="text-3xl font-black tracking-tight">Content Moderation</h2>
                <p className="text-slate-500">Monitor and moderate user comments.</p>
            </header>

            <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-800 flex justify-between items-center">
                    <h3 className="font-black uppercase tracking-widest text-sm text-slate-500">Recent Comments</h3>
                    <span className="text-xs text-slate-500">{commentsList.data?.length ?? 0} items</span>
                </div>
                <div className="divide-y divide-slate-800">
                    {commentsList.data?.length === 0 ? (
                        <div className="p-12 text-center text-slate-500 italic">No comments found.</div>
                    ) : commentsList.data?.map(comment => (
                        <div key={comment.id} className="p-6 hover:bg-slate-800/30 transition flex justify-between items-start group">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 bg-slate-800 px-2 py-1 rounded-lg">
                                        <User size={12} />
                                        {comment.user?.name || 'Unknown'}
                                    </div>
                                    <div className="text-slate-600 text-[10px]">→</div>
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-500 bg-cyan-500/10 px-2 py-1 rounded-lg">
                                        <MapPin size={12} />
                                        {comment.spot?.name || 'Unknown Spot'}
                                    </div>
                                    <div className="text-slate-600 text-[10px] ml-2">
                                        {new Date(comment.createdAt as string).toLocaleString()}
                                    </div>
                                </div>
                                <p className="text-slate-200 text-sm leading-relaxed pl-1">
                                    {comment.content}
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    if (confirm("Delete this comment?")) {
                                        deleteComment.mutate({ id: comment.id });
                                    }
                                }}
                                className="p-2 text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                title="Delete Comment"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}
