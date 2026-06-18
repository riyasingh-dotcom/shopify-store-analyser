import type { AuditGrade } from '@/lib/analysis/products/productAudit';

type Size = 'sm' | 'md' | 'lg';

const SIZE_CONFIG: Record<Size, { container: string; score: string; grade: string }> = {
  sm: { container: 'h-8 w-8',  score: 'text-[10px]', grade: 'text-[7px]'  },
  md: { container: 'h-12 w-12', score: 'text-sm',     grade: 'text-[10px]' },
  lg: { container: 'h-16 w-16', score: 'text-xl',     grade: 'text-xs'     },
};

const GRADE_COLOR: Record<AuditGrade, string> = {
  A: 'bg-emerald-50 text-emerald-700 ring-emerald-300',
  B: 'bg-blue-50   text-blue-700   ring-blue-300',
  C: 'bg-yellow-50 text-yellow-700 ring-yellow-300',
  D: 'bg-orange-50 text-orange-700 ring-orange-300',
  F: 'bg-red-50    text-red-700    ring-red-300',
};

interface ScoreBadgeProps {
  score: number;
  grade: AuditGrade;
  size?: Size;
}

export default function ScoreBadge({ score, grade, size = 'md' }: ScoreBadgeProps) {
  const { container, score: scoreSize, grade: gradeSize } = SIZE_CONFIG[size];

  return (
    <div
      className={`${container} flex shrink-0 flex-col items-center justify-center rounded-full ring-2 ${GRADE_COLOR[grade]}`}
      title={`Audit score: ${score}/100 (Grade ${grade})`}
    >
      <span className={`${scoreSize} font-bold leading-none tabular-nums`}>{score}</span>
      <span className={`${gradeSize} font-semibold leading-none opacity-60`}>{grade}</span>
    </div>
  );
}
