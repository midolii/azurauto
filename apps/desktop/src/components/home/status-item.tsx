export function StatusItem({ label, value }: { label: string; value: string }) {
	return (
		<div className="border-slate-300 border-l-2 bg-white/72 px-3 py-2">
			<dt className="font-mono text-[0.68rem] text-slate-500 uppercase tracking-[0.12em]">
				{label}
			</dt>
			<dd className="mt-1 break-all font-medium text-slate-900 text-sm">
				{value}
			</dd>
		</div>
	);
}
