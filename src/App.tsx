import React from "react";
import Layout from "./HUD/Layout/Layout";
import "./App.css";
import api from "./API";
import { Match } from "./API/types";
import { loadAvatarURL } from "./API/avatars";
import { actions, configs } from "./API/contexts/actions";
import { GSI, hudIdentity, socket, initiateConnection } from "./API/HUD";
import { CSGO, PlayerExtension, CSGORaw } from "csgogsi-socket";

type ParentWindow = Window & {
  ipcApi?: {
    receive: (channel: string, handler: (...args: any[]) => void) => void;
  };
};

let isInWindow = false;
let parentWindow: ParentWindow | null = null;

if (typeof window !== "undefined" && window.parent && window.parent !== window) {
  parentWindow = window.parent as ParentWindow;
  isInWindow = !!parentWindow.ipcApi;
}

type RoundPlayerDamage = {
  steamid: string;
  damage: number;
};
type RoundDamage = {
  round: number;
  players: RoundPlayerDamage[];
};

if (parentWindow?.ipcApi) {
  parentWindow.ipcApi.receive(
    "raw",
    (data: CSGORaw, damage?: RoundDamage[]) => {
      if (damage) {
        (GSI as any).damage = damage;
      }
      (GSI as any).digest(data);
    }
  );
}

socket.on("update", (_csgo: unknown, damage?: RoundDamage[]) => {
  if (damage) {
    (GSI as any).damage = damage;
  }
});

interface DataLoader {
  match: Promise<void> | null;
}

const dataLoader: DataLoader = {
  match: null,
};

type AppState = {
  match: Match | null;
  game: CSGO | null;
  steamids: string[];
  checked: boolean;
};

class App extends React.Component<Record<string, never>, AppState> {
  private boundHandlers: { [key: string]: (...args: any[]) => void } = {};

  constructor(props: Record<string, never>) {
    super(props);
    this.state = {
      game: null,
      steamids: [],
      match: null,
      checked: false,
    };
  }

  componentDidMount() {
    this.loadMatch();

    const href = window.location.href;
    socket.emit("started");
    let devMode = false;
    let name = "";

    if (href.indexOf("/huds/") === -1) {
      devMode = true;
      name = (Math.random() * 1000 + 1)
        .toString(36)
        .replace(/[^a-z]+/g, "")
        .substr(0, 15);
      hudIdentity.isDev = true;
    } else {
      const segment = href.substr(href.indexOf("/huds/") + 6);
      name = segment.substr(0, segment.lastIndexOf("/"));
      hudIdentity.name = name;
    }

    const onReadyToRegister = () => {
      socket.emit(
        "register",
        name,
        devMode,
        "cs2",
        isInWindow ? "IPC" : "DEFAULT"
      );
      initiateConnection();
    };
    socket.on("readyToRegister", onReadyToRegister);
    this.boundHandlers["readyToRegister"] = onReadyToRegister;

    const onConfig = (data: any) => {
      configs.save(data);
    };
    socket.on("hud_config", onConfig);
    this.boundHandlers["hud_config"] = onConfig;

    const onAction = (data: any) => {
      actions.execute(data.action, data.data);
    };
    socket.on("hud_action", onAction);
    this.boundHandlers["hud_action"] = onAction;

    const onKeybind = (action: string) => {
      actions.execute(action);
    };
    socket.on("keybindAction", onKeybind);
    this.boundHandlers["keybindAction"] = onKeybind;

    const onRefresh = () => {
      window.top?.location.reload();
    };
    socket.on("refreshHUD", onRefresh);
    this.boundHandlers["refreshHUD"] = onRefresh;

    const onMIRV = (data: any) => {
      (GSI as any).digestMIRV?.(data);
    };
    socket.on("update_mirv", onMIRV);
    this.boundHandlers["update_mirv"] = onMIRV;

    const onMatch = () => this.loadMatch(true);
    socket.on("match", onMatch);
    this.boundHandlers["match"] = onMatch;

    const onData = (game: CSGO) => {
      if (!this.state.game || this.state.steamids.length) {
        this.verifyPlayers(game);
      }

      const wasLoaded = !!this.state.game;

      this.setState({ game }, () => {
        if (!wasLoaded) {
          this.loadMatch(true);
        }
      });
    };
    GSI.on("data", onData);
    this.boundHandlers["gsi_data"] = onData;
  }

  componentWillUnmount() {
    Object.entries(this.boundHandlers).forEach(([event, handler]) => {
      if (event.startsWith("gsi_")) {
        const [, actualEvent] = event.split("_");
        GSI.off(actualEvent, handler);
        return;
      }
      socket.off(event, handler);
    });
  }

  verifyPlayers = async (game: CSGO) => {
    const steamids = game.players.map((player) => player.steamid);

    steamids.forEach((steamid) => loadAvatarURL(steamid));

    if (steamids.every((steamid) => this.state.steamids.includes(steamid))) {
      return;
    }

    const loaded = GSI.players.map((player: PlayerExtension) => player.steamid);

    const notCheckedPlayers = steamids.filter(
      (steamid) => !loaded.includes(steamid)
    );

    if (notCheckedPlayers.length) {
      const extensioned = await api.players.getAll(notCheckedPlayers);

      const players: PlayerExtension[] = extensioned.map((player) => ({
        id: player._id,
        name: player.username,
        realName: `${player.firstName} ${player.lastName}`,
        steamid: player.steamid,
        country: player.country,
        avatar: player.avatar,
        extra: player.extra,
      }));

      const gsiLoaded = GSI.players as PlayerExtension[];
      gsiLoaded.push(...players);
      (GSI as any).players = gsiLoaded;
    }

    this.setState({ steamids });
  };

  loadMatch = async (force = false) => {
    if (!dataLoader.match || force) {
      dataLoader.match = new Promise((resolve) => {
        api.matches
          .getCurrent()
          .then((match) => {
            if (!match) {
              (GSI as any).teams.left = null;
              (GSI as any).teams.right = null;
              this.setState({ match: null });
              resolve();
              return;
            }

            this.setState({ match });

            let isReversed = false;
            if ((GSI as any).last) {
              const mapName = (GSI as any).last.map.name.substring(
                (GSI as any).last.map.name.lastIndexOf("/") + 1
              );
              const current = match.vetos.filter(
                (veto) => veto.mapName === mapName
              )[0];
              if (current && current.reverseSide) {
                isReversed = true;
              }
              this.setState({ checked: true });
            }
            if (match.left.id) {
              api.teams.getTeam(match.left.id).then((left) => {
                const gsiTeamData = {
                  id: left._id,
                  name: left.name,
                  country: left.country,
                  logo: left.logo,
                  map_score: match.left.wins,
                  extra: left.extra,
                };

                if (!isReversed) {
                  (GSI as any).teams.left = gsiTeamData;
                } else {
                  (GSI as any).teams.right = gsiTeamData;
                }
              });
            }
            if (match.right.id) {
              api.teams.getTeam(match.right.id).then((right) => {
                const gsiTeamData = {
                  id: right._id,
                  name: right.name,
                  country: right.country,
                  logo: right.logo,
                  map_score: match.right.wins,
                  extra: right.extra,
                };
                if (!isReversed) {
                  (GSI as any).teams.right = gsiTeamData;
                } else {
                  (GSI as any).teams.left = gsiTeamData;
                }
              });
            }
            resolve();
          })
          .catch(() => {
            (GSI as any).teams.left = null;
            (GSI as any).teams.right = null;
            this.setState({ match: null });
            resolve();
          });
      });
    }
  };

  render() {
    if (!this.state.game) return null;

    return <Layout game={this.state.game} match={this.state.match} />;
  }
}

export default App;
