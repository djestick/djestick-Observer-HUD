import queryString from "query-string";
import { MapConfig } from "../HUD/Radar/LexoRadar/maps";
import * as Types from "./types";

const query = queryString.parseUrl(window.location.href).query;

const pickFirst = (value: string | string[] | null | undefined) =>
  Array.isArray(value) ? value[0] : value || undefined;

const rawPort = pickFirst(query.port);
const rawVariant = pickFirst(query.variant);

export const port = rawPort ? Number(rawPort) : 1349;
export const isDev = !pickFirst(query.isProd);
export const variant = rawVariant || "default";
export const HOST = "http://localhost";

export const config = { apiAddress: isDev ? `${HOST}:${port}/` : "/" };
export const apiUrl = config.apiAddress;

const buildUrl = (url: string) => `${apiUrl}api/${url}`;

export const apiRequest = async <T>(
  url: string,
  method = "GET",
  body?: unknown
): Promise<T> => {
  const options: RequestInit = {
    method,
    headers: { Accept: "application/json", "Content-Type": "application/json" },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(buildUrl(url), options);

  try {
    const parsed = (await response.json()) as T;
    return parsed;
  } catch (_error) {
    const fallback =
      response.status < 300 ? (true as unknown as T) : (null as unknown as T);
    return fallback;
  }
};

const api = {
  matches: {
    getAll: async (): Promise<Types.Match[]> => apiRequest<Types.Match[]>("match"),
    getCurrent: async (): Promise<Types.Match> =>
      apiRequest<Types.Match>("match/current"),
  },
  teams: {
    getAll: async (): Promise<Types.Team[]> =>
      apiRequest<Types.Team[]>("teams"),
    getTeam: async (id: string): Promise<Types.Team> =>
      apiRequest<Types.Team>(`teams/${id}`),
  },
  players: {
    getAll: async (steamids?: string[]): Promise<Types.Player[]> =>
      apiRequest<Types.Player[]>(
        steamids && steamids.length
          ? `players?steamids=${steamids.join(";")}`
          : "players"
      ),
    getAvatarURLs: async (
      steamid: string
    ): Promise<{ custom: string; steam: string }> =>
      apiRequest<{ custom: string; steam: string }>(
        `players/avatar/steamid/${steamid}`
      ),
  },
  camera: {
    get: (): Promise<{
      availablePlayers: { steamid: string; label: string }[];
      uuid: string;
    }> =>
      apiRequest<{
        availablePlayers: { steamid: string; label: string }[];
        uuid: string;
      }>("camera"),
  },
  maps: {
    get: (): Promise<{ [key: string]: MapConfig }> =>
      apiRequest<{ [key: string]: MapConfig }>("radar/maps"),
  },
};

export default api;
