// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useEnvironmentBootstrap } from "./use-environment-bootstrap.ts";

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("useEnvironmentBootstrap", () => {
	it("does not throw in web-only/native-missing environments", async () => {
		const { result, unmount } = renderHook(() => useEnvironmentBootstrap());

		await waitFor(() => {
			expect(result.current.resourceStatus?.phase).toBe("failed");
			expect(result.current.status?.phase).toBe("failed");
		});

		unmount();
	});
});
