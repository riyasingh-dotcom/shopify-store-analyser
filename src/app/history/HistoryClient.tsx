'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  Star,
  Trophy,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  LayoutList,
  LayoutGrid,
  ChevronRight,
} from 'lucide-react';

// ── Shared types (exported so page.tsx can build the props server-side) ───

export interface Highlight {
  title: string;
  category: string;
  priority: string;
}

export interface SnapshotData {
  productCount: number;
  orderCount: number;
  totalRevenue: number;
  currency: string;
}

export interface DeltaData {
  score: number;
  revenue: number | null;
  orders: number | null;
  products: number | null;
}

export interface AnalysisCardData {
  id: string;
  storeDomain: string;
  overallScore: number;
  summary: string;
  createdAt: string; // ISO — dates can't cross the server/client boundary as Date objects
  highlights: Highlight[];
  snapshot: SnapshotData | null;
  delta: DeltaData | null;
}

export interface StatsData {
  total: number;
  avgScore: number;
  highestScore: number;
  latestDate: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────

function scoreStyle(score: number) {
  if (score >= 8) return { label: 'Strong',     bg: 'bg-emerald-100', fg: 'text-emerald-700' };
  if (score >= 6) return { label: 'Adequate',   bg: 'bg-blue-100',    fg: 'text-blue-700' };
  if (score >= 4) return { label: 'Needs Work', bg: 'bg-amber-100',   fg: 'text-amber-700' };
  return            { label: 'Critical',         bg: 'bg-red-100',     fg: 'text-red-700' };
}

const CATEGORY_COLORS: Record<string, string> = {
  inventory:  'bg-violet-100 text-violet-700',
  revenue:    'bg-emerald-100 text-emerald-700',
  products:   'bg-blue-100 text-blue-700',
  marketing:  'bg-pink-100 text-pink-700',
  operations: 'bg-orange-100 text-orange-700',
  growth:     'bg-indigo-100 text-indigo-700',
};
function categoryColor(cat: string) {
  return CATEGORY_COLORS[cat] ?? 'bg-gray-100 text-gray-600';
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return (
    d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  );
}

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtCurrency(value: number, currency: string) {
  const abs = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Math.abs(value));
  return value >= 0 ? `+${abs}` : `-${abs}`;
}

function fmtDelta(value: number) {
  return value > 0 ? `+${value}` : `${value}`;
}

// ── Shared sub-components ─────────────────────────────────────────────────

function ScoreBadge({ score, compact = false }: { score: number; compact?: boolean }) {
  const { label, bg, fg } = scoreStyle(score);
  if (compact) {
    return (
      <div className={`flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl ${bg}`}>
        <span className={`text-lg font-bold leading-none ${fg}`}>{score}</span>
      </div>
    );
  }
  return (
    <div className={`flex shrink-0 flex-col items-center justify-center rounded-xl px-4 py-3 min-w-[4.5rem] ${bg}`}>
      <span className={`text-2xl font-bold leading-none ${fg}`}>{score}</span>
      <span className={`mt-0.5 text-[10px] font-semibold uppercase tracking-wide ${fg}`}>{label}</span>
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}
function StatCard({ icon, label, value, sub, accent = 'bg-indigo-50 text-indigo-500' }: StatCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-gray-500">{label}</p>
          <p className="mt-1 truncate text-xl font-bold text-gray-900 sm:text-2xl">{value}</p>
          {sub && <p className="mt-0.5 truncate text-[11px] text-gray-400">{sub}</p>}
        </div>
        <div className={`shrink-0 rounded-lg p-2 ${accent}`}>{icon}</div>
      </div>
    </div>
  );
}

interface DeltaRowProps {
  delta: DeltaData;
  currency?: string;
  compact?: boolean;
}
function DeltaRow({ delta, currency = 'USD', compact = false }: DeltaRowProps) {
  const raw: { label: string; value: number | null; fmt: (v: number) => string }[] = [
    { label: 'Score',    value: delta.score,    fmt: fmtDelta },
    { label: 'Revenue',  value: delta.revenue,  fmt: (v) => fmtCurrency(v, currency) },
    { label: 'Orders',   value: delta.orders,   fmt: fmtDelta },
    { label: 'Products', value: delta.products, fmt: fmtDelta },
  ];
  const items = raw.filter((item) => item.value !== null) as {
    label: string;
    value: number;
    fmt: (v: number) => string;
  }[];

  if (items.length === 0) return null;

  return (
    <div className="mt-2.5 rounded-lg bg-gray-50 px-3 py-2">
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
        vs. previous
      </p>
      <div className={`flex flex-wrap ${compact ? 'gap-x-3 gap-y-1' : 'gap-x-4 gap-y-1'}`}>
        {items.map(({ label, value, fmt }) => {
          const isPos = value > 0;
          const isNeg = value < 0;
          const Icon = isPos ? TrendingUp : isNeg ? TrendingDown : Minus;
          return (
            <div key={label} className="flex items-center gap-1">
              <Icon
                className={`h-3 w-3 ${isPos ? 'text-emerald-500' : isNeg ? 'text-red-500' : 'text-gray-400'}`}
              />
              <span
                className={`text-[11px] font-medium ${
                  isPos ? 'text-emerald-600' : isNeg ? 'text-red-600' : 'text-gray-500'
                }`}
              >
                {label}: {fmt(value)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HighlightChips({ highlights, max }: { highlights: Highlight[]; max: number }) {
  if (highlights.length === 0) return null;
  const visible = highlights.slice(0, max);
  const overflow = highlights.length - max;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {visible.map((h, i) => (
        <span
          key={i}
          className={`max-w-[200px] truncate rounded-full px-2 py-0.5 text-[11px] font-medium ${categoryColor(
            h.category,
          )}`}
          title={h.title}
        >
          {h.title}
        </span>
      ))}
      {overflow > 0 && (
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">
          +{overflow} more
        </span>
      )}
    </div>
  );
}

// ── Card variants ─────────────────────────────────────────────────────────

function ListCard({ card }: { card: AnalysisCardData }) {
  return (
    <Link
      href={`/history/${card.id}`}
      className="flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all duration-150 hover:border-indigo-200 hover:shadow-md sm:p-5"
    >
      <ScoreBadge score={card.overallScore} />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-sm font-semibold text-gray-900">{card.storeDomain}</span>
          <time className="text-xs text-gray-400">{formatDateTime(card.createdAt)}</time>
        </div>

        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-gray-600">{card.summary}</p>

        <HighlightChips highlights={card.highlights} max={5} />

        {card.delta && (
          <DeltaRow delta={card.delta} currency={card.snapshot?.currency} />
        )}
      </div>

      <ChevronRight className="mt-0.5 h-5 w-5 shrink-0 text-gray-300" />
    </Link>
  );
}

function GridCard({ card }: { card: AnalysisCardData }) {
  return (
    <Link
      href={`/history/${card.id}`}
      className="flex flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all duration-150 hover:border-indigo-200 hover:shadow-md"
    >
      {/* Header row */}
      <div className="flex items-start gap-3">
        <ScoreBadge score={card.overallScore} compact />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-900">{card.storeDomain}</p>
          <time className="text-xs text-gray-400">{formatDateShort(card.createdAt)}</time>
        </div>
      </div>

      {/* Summary */}
      <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-gray-600">{card.summary}</p>

      {/* Highlights — max 3 to keep cards compact in grid */}
      <HighlightChips highlights={card.highlights} max={3} />

      {/* Delta */}
      {card.delta && (
        <DeltaRow delta={card.delta} currency={card.snapshot?.currency} compact />
      )}

      {/* Footer CTA */}
      <div className="mt-auto flex items-center pt-3 text-xs font-medium text-indigo-600">
        View Full Analysis
        <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
      </div>
    </Link>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white py-20 text-center">
      <Clock className="mb-4 h-12 w-12 text-gray-300" />
      <p className="text-sm font-semibold text-gray-700">No analyses saved yet</p>
      <p className="mt-1 text-xs text-gray-400">
        Run an analysis from the Overview page to see it here.
      </p>
      <Link
        href="/"
        className="mt-5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
      >
        Go to Overview
      </Link>
    </div>
  );
}

// ── Main client component ─────────────────────────────────────────────────

interface HistoryClientProps {
  stats: StatsData;
  cards: AnalysisCardData[];
}

export default function HistoryClient({ stats, cards }: HistoryClientProps) {
  const [isGrid, setIsGrid] = useState(false);

  const latestFormatted = stats.latestDate ? formatDateShort(stats.latestDate) : '—';

  return (
    <div className="flex-1 p-4 sm:p-6">
      {/* Stats row */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={<BarChart3 className="h-4 w-4" />}
          label="Total Analyses"
          value={stats.total > 0 ? stats.total.toString() : '—'}
          sub={stats.total > 0 ? `Up to 20 shown` : 'None saved yet'}
        />
        <StatCard
          icon={<Star className="h-4 w-4" />}
          label="Avg Score"
          value={stats.total > 0 ? `${stats.avgScore}/10` : '—'}
          sub={stats.total > 0 ? 'across all runs' : undefined}
          accent="bg-amber-50 text-amber-500"
        />
        <StatCard
          icon={<Trophy className="h-4 w-4" />}
          label="Highest Score"
          value={stats.total > 0 ? `${stats.highestScore}/10` : '—'}
          sub={stats.total > 0 ? 'best run recorded' : undefined}
          accent="bg-emerald-50 text-emerald-500"
        />
        <StatCard
          icon={<Clock className="h-4 w-4" />}
          label="Latest Analysis"
          value={latestFormatted}
          accent="bg-violet-50 text-violet-500"
        />
      </div>

      {cards.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Controls row */}
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing{' '}
              <span className="font-semibold text-gray-700">{cards.length}</span>{' '}
              {cards.length === 1 ? 'analysis' : 'analyses'}
            </p>

            <div
              className="flex items-center gap-0.5 rounded-lg border border-gray-200 bg-white p-0.5"
              role="group"
              aria-label="View mode"
            >
              <button
                onClick={() => setIsGrid(false)}
                title="List view"
                aria-pressed={!isGrid}
                className={`rounded-md p-1.5 transition-colors ${
                  !isGrid ? 'bg-gray-100 text-gray-700' : 'text-gray-400 hover:bg-gray-50'
                }`}
              >
                <LayoutList className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIsGrid(true)}
                title="Grid view"
                aria-pressed={isGrid}
                className={`rounded-md p-1.5 transition-colors ${
                  isGrid ? 'bg-gray-100 text-gray-700' : 'text-gray-400 hover:bg-gray-50'
                }`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Cards */}
          {isGrid ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {cards.map((card) => (
                <GridCard key={card.id} card={card} />
              ))}
            </div>
          ) : (
            <ul className="space-y-3">
              {cards.map((card) => (
                <li key={card.id}>
                  <ListCard card={card} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
