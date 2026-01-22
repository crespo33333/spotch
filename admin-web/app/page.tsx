'use client';

import React, { useState } from 'react';
import { trpc } from '../utils/trpc';
import {
  Users,
  MapPin,
  Send,
  ShieldAlert,
  TrendingUp,
  Search,
  Bell,
  Trash2,
  Ban
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminDashboard() {
  const [pushTitle, setPushTitle] = useState('');
  const [pushBody, setPushBody] = useState('');

  const stats = trpc.admin.getStats.useQuery();
  const usersList = trpc.admin.getAllUsers.useQuery();

  const broadcast = trpc.admin.broadcastPush.useMutation({
    onSuccess: (data) => {
      alert(`Sent push to ${data.sent} devices!`);
      setPushTitle('');
      setPushBody('');
    },
    onError: (err) => alert("Failed: " + err.message)
  });

  const toggleBan = trpc.admin.toggleUserBan.useMutation({
    onSuccess: () => {
      usersList.refetch();
    }
  });

  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pushTitle || !pushBody) return;
    broadcast.mutate({ title: pushTitle, body: pushBody });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800 p-6 flex flex-col gap-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-cyan-500 to-fuchsia-500 rounded-xl" />
          <h1 className="text-xl font-black italic tracking-tighter">SPOTCH <span className="text-slate-500 text-xs translate-y-[-1px] inline-block">ADMIN</span></h1>
        </div>

        <nav className="flex flex-col gap-2 text-sm font-medium">
          <button className="flex items-center gap-3 px-4 py-3 bg-slate-900 text-white rounded-xl border border-slate-700">
            <TrendingUp size={18} /> Dashboard
          </button>
          <button className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-slate-900 rounded-xl transition-colors">
            <Users size={18} /> Users
          </button>
          <button className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-slate-900 rounded-xl transition-colors">
            <MapPin size={18} /> Spots
          </button>
          <button className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-slate-900 rounded-xl transition-colors">
            <Bell size={18} /> Push Console
          </button>
          <button className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-slate-900 rounded-xl transition-colors">
            <ShieldAlert size={18} /> Security
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-12">
        <header className="flex justify-between items-center mb-12">
          <div>
            <h2 className="text-3xl font-black tracking-tight">System Overview</h2>
            <p className="text-slate-500">Real-time management for the Spotch ecosystem.</p>
          </div>

          <div className="flex gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input
                placeholder="Search everything..."
                className="bg-slate-900 border border-slate-800 rounded-full pl-10 pr-6 py-2 w-64 text-sm focus:outline-none focus:border-cyan-500/50"
              />
            </div>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-6 mb-12">
          <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 blur-3xl rounded-full" />
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-cyan-500/10 rounded-2xl text-cyan-400">
                <Users size={24} />
              </div>
            </div>
            <h3 className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-1">Total Users</h3>
            <div className="text-4xl font-black">{stats.data?.users ?? '--'}</div>
          </div>

          <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-fuchsia-500/5 blur-3xl rounded-full" />
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-fuchsia-500/10 rounded-2xl text-fuchsia-400">
                <MapPin size={24} />
              </div>
            </div>
            <h3 className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-1">Active Spots</h3>
            <div className="text-4xl font-black">{stats.data?.spots ?? '--'}</div>
          </div>

          <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full" />
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400">
                <TrendingUp size={24} />
              </div>
            </div>
            <h3 className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-1">Point Volume</h3>
            <div className="text-4xl font-black">{stats.data?.volume.toLocaleString() ?? '--'} <span className="text-sm text-slate-500">P</span></div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-12">
          {/* User List Table */}
          <div className="col-span-2 bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-800 flex justify-between items-center">
              <h3 className="font-black uppercase tracking-widest text-sm text-slate-500">Recent Growth</h3>
              <button className="text-xs font-bold text-cyan-500 hover:underline">View All Users</button>
            </div>
            <table className="w-full text-left">
              <thead>
                <tr className="text-slate-500 text-xs border-b border-slate-800">
                  <th className="px-8 py-4">USER</th>
                  <th className="px-8 py-4">ID</th>
                  <th className="px-8 py-4">LVL</th>
                  <th className="px-8 py-4">STATUS</th>
                  <th className="px-8 py-4 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {usersList.data?.map(user => (
                  <tr key={user.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                    <td className="px-8 py-4 font-bold">{user.name || 'Anonymous'}</td>
                    <td className="px-8 py-4 text-slate-500 font-mono text-xs">{user.id}</td>
                    <td className="px-8 py-4 font-bold text-cyan-500">{user.level}</td>
                    <td className="px-8 py-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${user.isBanned ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                        {user.isBanned ? 'Banned' : 'Active'}
                      </span>
                    </td>
                    <td className="px-8 py-4 text-right flex justify-end gap-2">
                      <button
                        onClick={() => toggleBan.mutate({ userId: user.id, isBanned: !user.isBanned })}
                        className="p-2 bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-500 rounded-lg transition-all"
                      >
                        <Ban size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Push Console Side */}
          <div className="col-span-1 border border-slate-800 bg-slate-900 rounded-3xl p-8 sticky top-6 self-start">
            <h3 className="font-black uppercase tracking-widest text-sm text-slate-500 mb-6 flex items-center gap-2">
              <Send size={14} className="text-cyan-500" /> GLOBAL BROADCAST
            </h3>

            <form onSubmit={handleBroadcast} className="flex flex-col gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Notice Title</label>
                <input
                  value={pushTitle}
                  onChange={e => setPushTitle(e.target.value)}
                  placeholder="App Update Notification"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Message Body</label>
                <textarea
                  value={pushBody}
                  onChange={e => setPushBody(e.target.value)}
                  placeholder="Write your global message here..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm h-32 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <button
                type="submit"
                disabled={broadcast.isPending}
                className="mt-4 w-full bg-gradient-to-r from-cyan-600 to-fuchsia-600 py-4 rounded-xl font-black tracking-widest text-xs uppercase hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-cyan-500/10"
              >
                {broadcast.isPending ? 'BROADCASTING...' : 'SEND TO ALL DEVICES'}
              </button>
            </form>

            <div className="mt-8 p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
              <p className="text-[10px] text-amber-500 font-bold leading-relaxed">
                <ShieldAlert size={10} className="inline mr-1" /> WARNING: This will send a notification to every user in the database. Use with caution.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
