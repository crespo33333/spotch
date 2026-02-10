'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Users,
    MapPin,
    TrendingUp,
    Bell,
    Gift,
} from 'lucide-react';

export function Sidebar() {
    const pathname = usePathname();

    const isActive = (path: string) => pathname === path;

    const linkClass = (path: string) =>
        `flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${isActive(path)
            ? 'bg-slate-900 text-white border border-slate-700'
            : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
        }`;

    return (
        <aside className="w-64 border-r border-slate-800 p-6 flex flex-col gap-8 bg-slate-950 h-screen sticky top-0">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-tr from-cyan-500 to-fuchsia-500 rounded-xl" />
                <h1 className="text-xl font-black italic tracking-tighter text-white">
                    SPOTCH <span className="text-slate-500 text-xs translate-y-[-1px] inline-block">ADMIN</span>
                </h1>
            </div>

            <nav className="flex flex-col gap-2 text-sm font-medium">
                <Link href="/" className={linkClass('/')}>
                    <TrendingUp size={18} /> Dashboard
                </Link>
                <Link href="/users" className={linkClass('/users')}>
                    <Users size={18} /> Users
                </Link>
                <Link href="/spots" className={linkClass('/spots')}>
                    <MapPin size={18} /> Spots
                </Link>
                <Link href="/redemptions" className={linkClass('/redemptions')}>
                    <Gift size={18} /> Redemptions
                </Link>

                <div className="h-px bg-slate-800 my-2" />

                <Link href="/coupons" className={linkClass('/coupons')}>
                    <Gift size={18} className="text-pink-500" /> Coupons
                </Link>
                <Link href="/quests" className={linkClass('/quests')}>
                    <MapPin size={18} className="text-amber-500" /> Quests
                </Link>
                <Link href="/content" className={linkClass('/content')}>
                    <Bell size={18} className="text-emerald-500" /> Content
                </Link>
            </nav>
        </aside>
    );
}
