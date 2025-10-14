import Peer, { Instance, SignalData } from "simple-peer";
import type { Socket } from "socket.io-client";
import api from "..";
import { socket as socketClient } from ".";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type OfferData = {
  offer: SignalData;
};

type PeerInstance = Instance & { _remoteStreams: MediaStream[] };

type MediaStreamPlayer = {
  peerConnection: PeerInstance | null;
  steamid: string;
};

type ListenerType =
  | {
      listener: (stream: MediaStream) => void;
      event: "create";
      steamid: string;
    }
  | { listener: () => void; event: "destroy"; steamid: string };

type MediaStreamManager = {
  blocked: string[];
  blockedListeners: ((blocked: string[]) => void)[];
  players: MediaStreamPlayer[];
  onStreamCreate: (
    listener: (stream: MediaStream) => void,
    steamid: string
  ) => void;
  onStreamDestroy: (listener: () => void, steamid: string) => void;
  onBlockedUpdate: (listener: (steamids: string[]) => void) => void;
  removeListener: (listener: unknown) => void;
  listeners: ListenerType[];
};

const mediaStreams: MediaStreamManager = {
  blocked: [],
  blockedListeners: [],
  players: [],
  listeners: [],
  onStreamCreate: (
    listener: (stream: MediaStream) => void,
    steamid: string
  ) => {
    mediaStreams.listeners.push({ listener, event: "create", steamid });
  },
  onBlockedUpdate: (listener: (blocked: string[]) => void) => {
    mediaStreams.blockedListeners.push(listener);
  },
  onStreamDestroy: (listener: () => void, steamid: string) => {
    mediaStreams.listeners.push({ listener, event: "destroy", steamid });
  },
  removeListener: (listenerToRemove: unknown) => {
    mediaStreams.listeners = mediaStreams.listeners.filter(
      (listener) => listener !== listenerToRemove
    );
    mediaStreams.blockedListeners = mediaStreams.blockedListeners.filter(
      (listener) => listener !== listenerToRemove
    );
  },
};

const getConnectionInfo = (steamid: string) =>
  mediaStreams.players.find((player) => player.steamid === steamid) || null;

const closeConnection = (steamid: string) => {
  const connectionInfo = getConnectionInfo(steamid);
  try {
    if (connectionInfo && connectionInfo.peerConnection) {
      connectionInfo.peerConnection.removeAllListeners();
      connectionInfo.peerConnection.destroy();
      connectionInfo.peerConnection = null;
    }
  } catch {
    // Ignore peer teardown errors, we just want to clean up state.
  }

  for (const listener of mediaStreams.listeners.filter(
    (listener) => listener.steamid === steamid
  )) {
    if (listener.event === "destroy") listener.listener();
  }
  mediaStreams.players = mediaStreams.players.filter(
    (player) => player.steamid !== steamid
  );
};

const initiateConnection = async () => {
  const socket = socketClient as Socket;
  const camera = await api.camera.get();
  await wait(1000);

  socket.emit("registerAsHUD", camera.uuid);

  socket.on(
    "playersCameraStatus",
    (
      players: {
        steamid: string;
        label: string;
        allow: boolean;
        active: boolean;
      }[]
    ) => {
      const blockedSteamids = players
        .filter((player) => !player.allow)
        .map((player) => player.steamid);
      mediaStreams.blocked = blockedSteamids;

      for (const listener of mediaStreams.blockedListeners) {
        listener(blockedSteamids);
      }
    }
  );

  socket.on(
    "offerFromPlayer",
    async (roomId: string, offerData: OfferData, steamid: string) => {
      const currentConnection = getConnectionInfo(steamid);

      if (currentConnection) {
        return;
      }

      if (camera.uuid !== roomId) return;

      const peerConnection = new Peer({
        initiator: false,
        trickle: false,
      }) as PeerInstance;

      const mediaStreamPlayer: MediaStreamPlayer = { peerConnection, steamid };

      mediaStreams.players.push(mediaStreamPlayer);

      peerConnection.on("signal", (answer) => {
        const offer = JSON.parse(
          JSON.stringify(answer)
        ) as RTCSessionDescriptionInit;
        socket.emit("offerFromHUD", roomId, { offer }, steamid);
      });

      peerConnection.on("error", () => {
        closeConnection(steamid);
      });

      peerConnection.on("stream", () => {
        const current = getConnectionInfo(steamid);
        if (!current) {
          closeConnection(steamid);
          return;
        }
        if (peerConnection._remoteStreams.length === 0) {
          return;
        }
        for (const listener of mediaStreams.listeners.filter(
          (listener) => listener.steamid === steamid
        )) {
          if (listener.event === "create") {
            listener.listener(peerConnection._remoteStreams[0]);
          }
        }
      });

      peerConnection.on("close", () => {
        closeConnection(steamid);
      });

      peerConnection.signal(offerData.offer);
    }
  );
};

export { mediaStreams, initiateConnection };
