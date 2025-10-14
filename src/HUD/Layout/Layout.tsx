import { useState, useEffect } from "react";
import TeamBox from "./../Players/TeamBox";
import MatchBar from "../MatchBar/MatchBar";
import SeriesBox from "../MatchBar/SeriesBox";
import Observed from "./../Players/Observed";
import RadarMaps from "../Radar/RadarMaps";
import Trivia from "../Trivia/Trivia";
import SideBox from "../SideBoxes/SideBox";
import MoneyBox from "../SideBoxes/Money";
import UtilityLevel from "../SideBoxes/UtilityLevel";
import Killfeed from "../Killfeed/Killfeed";
import MapSeries from "../MapSeries/MapSeries";
// import Overview from "../Overview/Overview";
// import Tournament from "../Tournament/Tournament";
import Pause from "../PauseTimeout/Pause";
import Timeout from "../PauseTimeout/Timeout";
import { CSGO } from "csgogsi-socket";
import { Match } from "../../API/types";
import { useAction } from "../../API/contexts/actions";
import { useBombTimer } from "./../Timers/Countdown";

interface Props {
  game: CSGO;
  match: Match | null;
}

const Layout = ({ game, match }: Props) => {
  const bombData = useBombTimer();
  const isBombAction =
    bombData.state === "planting" || bombData.state === "defusing";

  const [forceHide, setForceHide] = useState(false);
  const [showClutch, setShowClutch] = useState(false);
  const [isOneVsOne, setIsOneVsOne] = useState(false);

  useAction("boxesState", (state) => {
    if (state === "show") {
      setForceHide(false);
    } else if (state === "hide") {
      setForceHide(true);
    }
  });

  const left =
    game.map.team_ct.orientation === "left"
      ? game.map.team_ct
      : game.map.team_t;
  const right =
    game.map.team_ct.orientation === "left"
      ? game.map.team_t
      : game.map.team_ct;

  const leftPlayers = game.players.filter(
    (player) => player.team.side === left.side
  );
  const rightPlayers = game.players.filter(
    (player) => player.team.side === right.side
  );

  const isFreezetime =
    (game.round && game.round.phase === "freezetime") ||
    game.phase_countdowns.phase === "freezetime";

  // 🔽 [LOGIC] Клатч, 1в1, музыка clutch.ogg
  useEffect(() => {
    const leftAlive = leftPlayers.filter((p) => p.state.health > 0).length;
    const rightAlive = rightPlayers.filter((p) => p.state.health > 0).length;

    const isClutch =
      (leftAlive === 1 && rightAlive > 1) ||
      (rightAlive === 1 && leftAlive > 1);

    const isVsOne = leftAlive === 1 && rightAlive === 1;

    setShowClutch(isClutch || isVsOne);
    setIsOneVsOne(isVsOne);

    const audio = document.getElementById("clutch-audio") as HTMLAudioElement;
    const roundEnded = game.round?.phase === "over";

    if ((isClutch || isVsOne) && !roundEnded) {
      if (audio && audio.paused) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      }
    } else {
      if (audio && !audio.paused) {
        audio.pause();
        audio.currentTime = 0;
      }
    }
  }, [leftPlayers, rightPlayers, game.round?.phase]);
  // 🔼 [LOGIC] Клатч, 1в1, музыка clutch.ogg

  return (
    <div className="layout">
      <Killfeed />
      <RadarMaps match={match} map={game.map} game={game} />
      <MatchBar
        map={game.map}
        phase={game.phase_countdowns}
        bomb={game.bomb}
        match={match}
      />
      <Pause phase={game.phase_countdowns} />
      <Timeout map={game.map} phase={game.phase_countdowns} />

      {/* 🔽 [UI] БЛОК КЛАТЧА/1v1 */}
      <div
        className={`players_alive ${
          showClutch && !isBombAction && game.round?.phase !== "over"
            ? ""
            : "hide"
        }`}
      >
        <div className="title_container">
          {isOneVsOne ? "Поєдинок" : "Клатч ситуація"}
        </div>
        <div className="counter_container">
          <div className={`team_counter ${left.side}`}>
            {leftPlayers.filter((player) => player.state.health > 0).length}
          </div>
          <div className="vs_counter">VS</div>
          <div className={`team_counter ${right.side}`}>
            {rightPlayers.filter((player) => player.state.health > 0).length}
          </div>
        </div>
      </div>
      {/* 🔼 [UI] БЛОК КЛАТЧА/1v1 */}

      {/* 🔊 МУЗЫКА */}
      <audio id="clutch-audio" src="/clutch.ogg" preload="auto" />

      <SeriesBox map={game.map} match={match} />
      {/* <Tournament /> */}
      <Observed player={game.player} />

      <TeamBox
        team={left}
        players={leftPlayers}
        side="left"
        current={game.player}
      />
      <TeamBox
        team={right}
        players={rightPlayers}
        side="right"
        current={game.player}
      />

      <Trivia />

      <MapSeries
        teams={[left, right]}
        match={match}
        isFreezetime={isFreezetime}
        map={game.map}
      />

      <div className={"boxes left"}>
        <MoneyBox
          team={left.side}
          side="left"
          loss={Math.min(left.consecutive_round_losses * 500 + 1400, 3400)}
          equipment={leftPlayers
            .map((player) => player.state.equip_value)
            .reduce((pre, now) => pre + now, 0)}
          money={leftPlayers
            .map((player) => player.state.money)
            .reduce((pre, now) => pre + now, 0)}
          show={isFreezetime && !forceHide}
        />
        <UtilityLevel
          side={left.side}
          players={game.players}
          show={isFreezetime && !forceHide}
        />
        <SideBox side="left" hide={forceHide} />
      </div>

      <div className={"boxes right"}>
        <MoneyBox
          team={right.side}
          side="right"
          loss={Math.min(right.consecutive_round_losses * 500 + 1400, 3400)}
          equipment={rightPlayers
            .map((player) => player.state.equip_value)
            .reduce((pre, now) => pre + now, 0)}
          money={rightPlayers
            .map((player) => player.state.money)
            .reduce((pre, now) => pre + now, 0)}
          show={isFreezetime && !forceHide}
        />
        <UtilityLevel
          side={right.side}
          players={game.players}
          show={isFreezetime && !forceHide}
        />
        <SideBox side="right" hide={forceHide} />
      </div>
    </div>
  );
};

export default Layout;
