import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useBackgroundRefresh } from "../../hooks/useBackgroundRefresh";
import { useFullList } from "../../hooks/useFullList";
import { requestRefresh } from "../../lib/refresh";

afterEach(() => {
  vi.useRealTimers();
});

describe("useBackgroundRefresh", () => {
  it("vuelve a consultar cada 26 s mientras la pantalla está abierta", () => {
    vi.useFakeTimers();
    const refresh = vi.fn();
    renderHook(() => useBackgroundRefresh(refresh, { whenHidden: true }));

    vi.advanceTimersByTime(25_000);
    expect(refresh).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1_000);
    expect(refresh).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(52_000);
    expect(refresh).toHaveBeenCalledTimes(3);
  });

  it("al desmontar deja de consultar", () => {
    vi.useFakeTimers();
    const refresh = vi.fn();
    const { unmount } = renderHook(() => useBackgroundRefresh(refresh));

    unmount();
    vi.advanceTimersByTime(60_000);

    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("«Actualizar»", () => {
  it("vuelve a pedir los listados cargados, conservando lo que se ve", async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ items: ["a"], total: 1 })
      .mockResolvedValueOnce({ items: ["a", "b"], total: 2 });
    const { result } = renderHook(() => useFullList<string>(fetchPage));
    await waitFor(() => expect(result.current.items).toEqual(["a"]));

    act(() => requestRefresh());

    // Mientras llega lo nuevo no hay «Cargando…» ni se vacía la lista.
    expect(result.current.isLoading).toBe(false);
    expect(result.current.items).toEqual(["a"]);
    await waitFor(() => expect(result.current.items).toEqual(["a", "b"]));
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });
});
