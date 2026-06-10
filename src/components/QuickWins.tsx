interface QuickWinsProps {
  items: string[];
}

export default function QuickWins({ items }: QuickWinsProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className="border-b border-gray-100 px-5 py-4">
        <div className="flex items-center gap-2">
          {/* Lightning bolt */}
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100">
            <svg
              className="h-4 w-4 text-amber-600"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M14.615 1.595a.75.75 0 01.359.852L12.982 9.75h7.268a.75.75 0 01.548 1.262l-10.5 11.25a.75.75 0 01-1.272-.71l1.992-7.302H3.768a.75.75 0 01-.548-1.262l10.5-11.25a.75.75 0 01.895-.143z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Quick Wins</h2>
            <p className="text-xs text-gray-500">Actions you can complete this week</p>
          </div>
        </div>
      </div>

      {/* List */}
      <ol className="flex flex-col divide-y divide-gray-50 px-5 py-3">
        {items.map((win, index) => (
          <li key={index} className="flex items-start gap-3 py-3">
            {/* Number bubble */}
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-700">
              {index + 1}
            </span>
            <p className="text-sm leading-relaxed text-gray-700">{win}</p>
          </li>
        ))}
      </ol>

      {/* Footer hint */}
      <div className="border-t border-gray-100 px-5 py-3">
        <p className="text-xs text-gray-400">
          {items.length} action{items.length !== 1 ? 's' : ''} identified by AI analysis
        </p>
      </div>
    </div>
  );
}
