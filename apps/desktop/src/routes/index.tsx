import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
	return (
		<div className="p-6 space-y-4">
			<h1 className="text-xl font-bold">Game Bot Control Panel</h1>

			<button
				type="button"
				className="px-4 py-2 bg-blue-500 text-white rounded"
				onClick={() => window.bot.tap(500, 800)}
			>
				Tap Test
			</button>

			<button
				type="button"
				className="px-4 py-2 bg-green-500 text-white rounded"
				onClick={async () => {
					const img = await window.bot.screenshot();
					console.log(img.slice(0, 100));
				}}
			>
				Screenshot
			</button>
		</div>
	);
}
