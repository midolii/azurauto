export function StatusItem({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-xl bg-slate-950/70 p-3">
			<dt className="text-slate-500">{label}</dt>
			<dd className="mt-1 break-all text-slate-200">{value}</dd>
		</div>
	);
}
