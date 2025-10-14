import { GSISocket, Player, PlayerExtension } from "csgogsi-socket";
import api, { isDev, port } from "..";

export const hudIdentity = {
  name: "",
  isDev,
};

export const { GSI, socket } = GSISocket(
  isDev ? `localhost:${port}` : "/",
  "update"
);

GSI.regulationMR = 12;

const requestedSteamIDs: string[] = [];

const loadPlayers = async (players: Player[]) => {
  const leftOvers = players.filter(
    (player) => !requestedSteamIDs.includes(player.steamid)
  );
  const leftOverSteamids = leftOvers.map((player) => player.steamid);
  if (!leftOvers.length) return;

  requestedSteamIDs.push(...leftOverSteamids);

  const extensions = await api.players.getAll(leftOverSteamids);

  const playersExtensions: PlayerExtension[] = extensions.map((player) => ({
    id: player._id,
    name: player.username,
    realName: `${player.firstName} ${player.lastName}`,
    steamid: player.steamid,
    country: player.country,
    avatar: player.avatar,
    extra: player.extra,
  }));

  const gsiPlayers = GSI.players;
  gsiPlayers.push(...playersExtensions);
  GSI.players = gsiPlayers;
};

GSI.on("data", (data) => {
  loadPlayers(data.players);
});

export { mediaStreams, initiateConnection } from "./camera";
