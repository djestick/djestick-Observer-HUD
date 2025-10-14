import React from "react";
import { Player } from "csgogsi-socket";
import { Kills } from "../../assets/Icons";

interface RoundKillsProps {
  player: Player;
}

export const RoundKills = ({ player }: RoundKillsProps) => {
  if (player.state.round_kills === 0) return null;

  if (player.state.health > 0) {
    return (
      <div className="roundkills-container">
        <div className="player_skull">
          <Kills />
        </div>
        <div className="player_round_kills_text">
          {player.state.round_kills}
        </div>
      </div>
    );
  } else {
    return (
      <div className="roundkills-container-dead">
        <div className="dead_player_skull">
          <Kills />
        </div>
        <div className="dead_player_round_kills_text">
          {player.state.round_kills}
        </div>
      </div>
    );
  }
};
