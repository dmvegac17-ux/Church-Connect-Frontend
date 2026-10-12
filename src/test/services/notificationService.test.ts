import { beforeEach, describe, expect, it, vi } from "vitest";

import { httpClient } from "../../lib/httpClient";
import { MARK_BATCH_MAX, notificationService } from "../../services/notificationService";

vi.mock("../../lib/httpClient", () => ({
  httpClient: { put: vi.fn() },
  readMetaTotal: vi.fn(),
}));

const put = vi.mocked(httpClient.put);

beforeEach(() => {
  vi.clearAllMocks();
  put.mockImplementation(async (_path, body) => ({
    data: { actualizadas: (body as { ids: string[] }).ids.length },
    meta: null,
  }));
});

describe("notificationService.markRead", () => {
  it("hasta el máximo va en una sola petición", async () => {
    const ids = Array.from({ length: MARK_BATCH_MAX }, (_, i) => `n-${i}`);

    expect(await notificationService.markRead(ids, true)).toBe(MARK_BATCH_MAX);
    expect(put).toHaveBeenCalledTimes(1);
    expect(put).toHaveBeenCalledWith("/notificaciones/leidas", { ids, leida: true });
  });

  it("por encima del máximo se reparte en tandas, sin que el servidor lo rechace", async () => {
    const ids = Array.from({ length: MARK_BATCH_MAX * 2 + 7 }, (_, i) => `n-${i}`);

    expect(await notificationService.markRead(ids, false)).toBe(ids.length);

    expect(put).toHaveBeenCalledTimes(3);
    const sizes = put.mock.calls.map(([, body]) => (body as { ids: string[] }).ids.length);
    expect(sizes).toEqual([MARK_BATCH_MAX, MARK_BATCH_MAX, 7]);
    expect(Math.max(...sizes)).toBeLessThanOrEqual(MARK_BATCH_MAX);
  });
});
