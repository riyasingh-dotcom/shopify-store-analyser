import type { StoreAnalysis } from '@/types/analysis';

interface StoreScoreCardProps {
  analysis: StoreAnalysis;
}

function scoreLabel(score: number): string {
  if (score <= 3) return 'Critical';
  if (score <= 5) return 'Needs Work';
  if (score <= 7) return 'Adequate';
  if (score <= 9) return 'Strong';
  return 'Exceptional';
}

function scoreColors(score: number): {
  ring: string;
  text: string;
  badge: string;
  bar: string;
} {
  if (score <= 3)
    return {
      ring: 'stroke-red-500',
      text: 'text-red-600',
      badge: 'bg-red-50 text-red-700 ring-red-200',
      bar: 'bg-red-500',
    };
  if (score <= 5)
    return {
      ring: 'stroke-amber-500',
      text: 'text-amber-600',
      badge: 'bg-amber-50 text-amber-700 ring-amber-200',
      bar: 'bg-amber-500',
    };
  if (score <= 7)
    return {
      ring: 'stroke-blue-500',
      text: 'text-blue-600',
      badge: 'bg-blue-50 text-blue-700 ring-blue-200',
      bar: 'bg-blue-500',
    };
  return {
    ring: 'stroke-emerald-500',
    text: 'text-emerald-600',
    badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    bar: 'bg-emerald-500',
  };
}

export default function StoreScoreCard({ analysis }: StoreScoreCardProps) {
  const { overallScore, summary } = analysis;
  const colors = scoreColors(overallScore);
  const label = scoreLabel(overallScore);

  // SVG ring: r=36, circumference ≈ 226.2
  const circumference = 2 * Math.PI * 36;
  const filled = (overallScore / 10) * circumference;
  const gap = circumference - filled;

  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      {/* Accent bar */}
      <div className={`absolute inset-x-0 top-0 h-0.5 ${colors.bar}`} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
        {/* Circular score dial */}
        <div className="relative shrink-0">
          <svg width="96" height="96" viewBox="0 0 96 96" className="-rotate-90">
            {/* Track */}
            <circle
              cx="48"
              cy="48"
              r="36"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-gray-100"
            />
            {/* Progress */}
            <circle
              cx="48"
              cy="48"
              r="36"
              fill="none"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${filled} ${gap}`}
              className={colors.ring}
            />
          </svg>
          {/* Score number in the middle */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-2xl font-bold leading-none ${colors.text}`}>
              {overallScore}
            </span>
            <span className="text-[10px] font-medium text-gray-400">/ 10</span>
          </div>
        </div>

        {/* Text content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-gray-900">Store Health Score</h2>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${colors.badge}`}
            >
              {label}
            </span>
          </div>

          {/* Score bar */}
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-1.5 rounded-full transition-all duration-700 ${colors.bar}`}
              style={{ width: `${overallScore * 10}%` }}
            />
          </div>

          <p className="mt-3 text-sm leading-relaxed text-gray-600">{summary}</p>
        </div>
      </div>

      {/* Scale legend */}
      <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-gray-100 pt-4 sm:justify-between sm:gap-0">
        {[
          { range: '1–3', label: 'Critical', color: 'bg-red-400' },
          { range: '4–5', label: 'Needs Work', color: 'bg-amber-400' },
          { range: '6–7', label: 'Adequate', color: 'bg-blue-400' },
          { range: '8–10', label: 'Strong', color: 'bg-emerald-400' },
        ].map((tier) => (
          <div key={tier.range} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${tier.color}`} />
            <span className="text-xs text-gray-500">
              <span className="font-medium">{tier.range}</span> {tier.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
