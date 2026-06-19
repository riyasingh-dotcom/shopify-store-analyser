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
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const PAGE_SIZE = 9;

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
      <div className={`flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-lg ${bg}`}>
        <span className={`text-sm font-bold leading-none ${fg}`}>{score}</span>
      </div>
    );
  }
  return (
    <div className={`flex shrink-0 flex-col items-center justify-center rounded-lg px-3 py-2 min-w-13 ${bg}`}>
      <span className={`text-lg font-bold leading-none ${fg}`}>{score}</span>
      <span className={`mt-0.5 text-[9px] font-semibold uppercase tracking-wide ${fg}`}>{label}</span>
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
    <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-gray-500">{label}</p>
          <p className="mt-0.5 truncate text-lg font-bold text-gray-900 sm:text-xl">{value}</p>
          {sub && <p className="mt-0.5 truncate text-[11px] text-gray-400">{sub}</p>}
        </div>
        <div className={`shrink-0 rounded-md p-1.5 ${accent}`}>{icon}</div>
      </div>
    </div>
  );
}

interface DeltaRowProps {
  delta: DeltaData;
  currency?: string;
}
function DeltaRow({ delta, currency = 'USD' }: DeltaRowProps) {
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
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-300">vs prev</span>
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
  );
}

function HighlightChips({ highlights, max }: { highlights: Highlight[]; max: number }) {
  if (highlights.length === 0) return null;
  const visible = highlights.slice(0, max);
  const overflow = highlights.length - max;
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {visible.map((h, i) => (
        <span
          key={i}
          className={`max-w-40 truncate rounded-full px-2 py-1.5 text-xs font-medium ${categoryColor(
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
      className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-5 shadow-sm transition-all duration-150 hover:border-indigo-200 hover:bg-indigo-50/30 hover:shadow-md"
    >
      <ScoreBadge score={card.overallScore} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-base font-semibold text-gray-900">{card.storeDomain}</span>
          <time className="ml-auto hidden shrink-0 text-xs text-gray-400 sm:block" suppressHydrationWarning>
            {formatDateTime(card.createdAt)}
          </time>
        </div>
        <time className="text-xs text-gray-400 sm:hidden" suppressHydrationWarning>
          {formatDateTime(card.createdAt)}
        </time>

        <p className="mt-2 line-clamp-1 text-sm text-gray-500">{card.summary}</p>

        <HighlightChips highlights={card.highlights} max={3} />
        {card.delta && (
          <DeltaRow delta={card.delta} currency={card.snapshot?.currency} />
        )}
      </div>

      <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 transition-colors group-hover:text-indigo-400" />
    </Link>
  );
}

function GridCard({ card }: { card: AnalysisCardData }) {
  return (
    <Link
      href={`/history/${card.id}`}
      className="group flex flex-col rounded-xl border border-gray-200 bg-white p-4 py-6 shadow-sm transition-all duration-150 hover:border-indigo-200 hover:bg-indigo-50/30 hover:shadow-md"
    >
      {/* Header row */}
      <div className="flex items-center gap-5">
        <ScoreBadge score={card.overallScore}  />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-gray-900">{card.storeDomain}</p>
          <time className="text-xs text-gray-400" suppressHydrationWarning>{formatDateShort(card.createdAt)}</time>
        </div>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-300 transition-colors group-hover:text-indigo-400" />
      </div>

      {/* Summary */}
      <p className="mt-2 line-clamp-1 text-sm text-gray-500">{card.summary}</p>

      {/* Highlights */}
      <HighlightChips highlights={card.highlights} max={3} />

      {/* Delta */}
      {card.delta && (
        <DeltaRow delta={card.delta} currency={card.snapshot?.currency} />
      )}
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

// ── Pagination ────────────────────────────────────────────────────────────

function Pagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const from = page * pageSize + 1;
  const to = Math.min((page + 1) * pageSize, totalItems);
  return (
    <div className="mt-4 flex items-center justify-between">
      <p className="text-xs text-gray-500">
        <span className="font-semibold text-gray-700">{from}–{to}</span> of{' '}
        <span className="font-semibold text-gray-700">{totalItems}</span>
      </p>
      <div className="flex items-center gap-2">
        <div className="hidden items-center gap-1 sm:flex">
          {Array.from({ length: totalPages }).map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                i === page ? 'bg-indigo-600' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
        <span className="mx-2 text-xs text-gray-400">{page + 1} / {totalPages}</span>
        <button
          onClick={onPrev}
          disabled={page === 0}
          aria-label="Previous page"
          className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Prev
        </button>
        <button
          onClick={onNext}
          disabled={page >= totalPages - 1}
          aria-label="Next page"
          className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
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
  const [page, setPage] = useState(0);

  const totalPages = Math.max(1, Math.ceil(cards.length / PAGE_SIZE));
  const visibleCards = cards.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const latestFormatted = stats.latestDate ? formatDateShort(stats.latestDate) : '—';

  return (
    <div className="flex-1 p-6 lg:px-8 lg:pb-8">
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
              <span className="font-semibold text-gray-700">
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, cards.length)}
              </span>{' '}
              of{' '}
              <span className="font-semibold text-gray-700">{cards.length}</span>{' '}
              {cards.length === 1 ? 'analysis' : 'analyses'}
            </p>

            <div
              className="flex items-center gap-0.5 rounded-lg border border-gray-200 bg-white p-0.5"
              role="group"
              aria-label="View mode"
            >
              <button
                onClick={() => { setIsGrid(false); setPage(0); }}
                title="List view"
                aria-pressed={!isGrid}
                className={`rounded-md p-1.5 transition-colors ${
                  !isGrid ? 'bg-gray-100 text-gray-700' : 'text-gray-400 hover:bg-gray-50'
                }`}
              >
                <LayoutList className="h-4 w-4" />
              </button>
              <button
                onClick={() => { setIsGrid(true); setPage(0); }}
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
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {visibleCards.map((card) => (
                <GridCard key={card.id} card={card} />
              ))}
            </div>
          ) : (
            <ul className="space-y-5">
              {visibleCards.map((card) => (
                <li key={card.id}>
                  <ListCard card={card} />
                </li>
              ))}
            </ul>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              totalItems={cards.length}
              pageSize={PAGE_SIZE}
              onPrev={() => setPage((p) => Math.max(0, p - 1))}
              onNext={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            />
          )}
        </>
      )}
    </div>
  );
}
