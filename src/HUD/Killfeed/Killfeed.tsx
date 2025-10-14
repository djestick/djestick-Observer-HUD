import React, { useState } from "react";

import { KillEvent, Player, CSGO } from "csgogsi-socket";
import Kill from "./Kill";
import "./killfeed.scss";
import { ONGSI } from "../../API/contexts/actions";

export interface ExtendedKillEvent extends KillEvent {
  type: "kill";
}

export interface BombEvent {
  player: Player;
  type: "plant" | "defuse";
}

const Killfeed = () => {
  const [events, setEvents] = useState<(BombEvent | ExtendedKillEvent)[]>([]);
  ONGSI(
    "kill",
    (kill: KillEvent) => {
      setEvents((ev) => [...ev, { ...kill, type: "kill" as const }]);
    },
    []
  );
  ONGSI(
    "data",
    (data: CSGO) => {
      if (data.round && data.round.phase === "freezetime") {
        const phaseEndsIn = Number(data.phase_countdowns.phase_ends_in);
        if (phaseEndsIn < 10) {
          setEvents((prev) => (prev.length ? [] : prev));
        }
      }
    },
    []
  );
  return (
    <div className="killfeed">
      {events.map((event) => (
        <Kill event={event} />
      ))}
    </div>
  );
};

export default React.memo(Killfeed);
