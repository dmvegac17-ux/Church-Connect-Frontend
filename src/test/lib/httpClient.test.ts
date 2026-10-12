import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  CACHE_TTL_MS,
  clearHttpCache,
  httpClient,
  setTokenProvider,
} from "../../lib/httpClient";
import { ApiError } from "../../types/api";

/* Respuestas ficticias, solo para pruebas. */

function envelope(data: unknown, status = 200): Response {
  return new Response(
    JSON.stringify({
      statusCode: status,
      status: "OK",
      data,
      success: status < 400,
      message: status < 400 ? null : "Falló",
      errors: status < 400 ? null : ["Falló"],
      timestamp: "",
      meta: null,
    }),
    { status },
  );
}

const fetchMock = vi.fn<typeof fetch>();
let token = "token-ana";

beforeEach(() => {
  vi.useFakeTimers();
  token = "token-ana";
  setTokenProvider(() => token);
  clearHttpCache();
  fetchMock.mockReset();
  // Cada llamada real al «backend» devuelve un valor distinto.
  let n = 0;
  fetchMock.mockImplementation(async () => envelope({ n: ++n }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("httpClient: caché de lecturas", () => {
  it("dos lecturas idénticas a la vez comparten una sola petición", async () => {
    const [a, b] = await Promise.all([
      httpClient.get("/events", { query: { limit: 100, offset: 0 } }),
      httpClient.get("/events", { query: { limit: 100, offset: 0 } }),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(a.data).toEqual({ n: 1 });
    expect(b.data).toEqual({ n: 1 });
  });

  it("reutiliza la respuesta mientras está vigente y vuelve al servidor al vencer", async () => {
    await httpClient.get("/events");
    vi.advanceTimersByTime(CACHE_TTL_MS - 1);
    expect((await httpClient.get("/events")).data).toEqual({ n: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(2);
    expect((await httpClient.get("/events")).data).toEqual({ n: 2 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("distingue la ruta y los parámetros", async () => {
    await httpClient.get("/events", { query: { limit: 100, offset: 0 } });
    await httpClient.get("/events", { query: { limit: 100, offset: 100 } });
    await httpClient.get("/schedules", { query: { limit: 100, offset: 0 } });

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it.each(["post", "put", "patch", "delete"] as const)(
    "una escritura (%s) invalida lo guardado",
    async (method) => {
      await httpClient.get("/events");

      await httpClient[method]("/registrations");

      expect((await httpClient.get("/events")).data).toEqual({ n: 3 });
      expect(fetchMock).toHaveBeenCalledTimes(3);
    },
  );

  it("una escritura que falla también invalida: el estado pudo cambiar", async () => {
    await httpClient.get("/events");
    fetchMock.mockImplementationOnce(async () => envelope(null, 409));

    await expect(httpClient.post("/registrations")).rejects.toBeInstanceOf(ApiError);
    await httpClient.get("/events");

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("una lectura hecha durante una escritura no sobrevive a esa escritura", async () => {
    let finishWrite!: () => void;
    fetchMock.mockImplementation(async (_url, init) => {
      if (init?.method === "POST") {
        await new Promise<void>((resolve) => (finishWrite = resolve));
        return envelope({ saved: true });
      }
      return envelope({ read: fetchMock.mock.calls.length });
    });

    const write = httpClient.post("/registrations");
    // Se lee antes de que el servidor termine de guardar: puede venir sin el cambio.
    await httpClient.get("/events");
    await vi.waitFor(() => expect(finishWrite).toBeDefined());
    finishWrite();
    await write;

    await httpClient.get("/events");
    const reads = fetchMock.mock.calls.filter(([, init]) => init?.method === "GET");
    expect(reads).toHaveLength(2);
  });

  it("no guarda los errores: el siguiente intento va al servidor", async () => {
    fetchMock.mockImplementationOnce(async () => envelope(null, 500));

    await expect(httpClient.get("/events")).rejects.toBeInstanceOf(ApiError);
    expect((await httpClient.get("/events")).data).toEqual({ n: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("lo que leyó un usuario no se le sirve a otro", async () => {
    await httpClient.get("/events");

    token = "token-beto";
    await httpClient.get("/events");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const sent = fetchMock.mock.calls.map(
      ([, init]) => (init?.headers as Record<string, string>).Authorization,
    );
    expect(sent).toEqual(["Bearer token-ana", "Bearer token-beto"]);
  });

  it("cancelar deja de esperar sin cortar la petición que otros aprovechan", async () => {
    let respond!: (response: Response) => void;
    fetchMock.mockImplementation(
      () => new Promise<Response>((resolve) => (respond = resolve)),
    );

    // Como en StrictMode: el primer montaje se cancela y el segundo repite.
    const first = new AbortController();
    const cancelled = httpClient.get("/events", { signal: first.signal });
    first.abort();
    await expect(cancelled).rejects.toMatchObject({ name: "AbortError" });

    const second = httpClient.get("/events", { signal: new AbortController().signal });
    respond(envelope({ ok: true }));

    expect((await second).data).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    // La petición compartida no recibió la señal de nadie.
    expect(fetchMock.mock.calls[0][1]?.signal).toBeUndefined();
  });

  it("una señal ya cancelada no espera nada", async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      httpClient.get("/events", { signal: controller.signal }),
    ).rejects.toMatchObject({ name: "AbortError" });
  });
});
