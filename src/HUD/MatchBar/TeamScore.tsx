import * as I from "csgogsi-socket";
import { Timer } from "./MatchBar";
import TeamLogo from "./TeamLogo";
import PlantDefuse from "../Timers/PlantDefuse";
import { ONGSI } from "../../API/contexts/actions";
import WinAnnouncement from "./WinIndicator";
import { useState } from "react";

interface IProps {
  orientation: "left" | "right";
  timer: Timer | null;
  team: I.Team;
}

const TeamScore = ({ orientation, timer, team }: IProps) => {
  const [show, setShow] = useState(false);

  ONGSI(
    "roundEnd",
    (result: I.Score) => {
      if (result.winner.orientation !== orientation) return;
      setShow(true);

      setTimeout(() => {
        setShow(false);
      }, 7000); // 10 секунд
    },
    [orientation]
  );

  return (
    <>
      <div className={`team ${orientation}`}>
        <div className="team-name">{team?.name || null}</div>
        <TeamLogo team={team} />
      </div>
      <PlantDefuse timer={timer} side={orientation} />
      <WinAnnouncement team={team} show={show} />
    </>
  );
};

export default TeamScore;
