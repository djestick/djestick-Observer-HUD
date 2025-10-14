import { Team } from "csgogsi-socket";
import React from "react";

const WinAnnouncement = ({
  team,
  show,
}: {
  team: Team | null;
  show: boolean;
}) => {
  if (!team) return null;
  return (
    <div className={`win_text ${show ? "show" : "hide"} ${team.side}`}>
      <span
        className="win_team_name"
        style={{
          fontWeight: 900,
          fontSize: "40px",
          letterSpacing: "2px",
          marginRight: "16px",
          color: "inherit",
          lineHeight: "1",
        }}
      >
        {team.name.toUpperCase()}
      </span>
      <span
        className="win_text_secondary"
        style={{
          fontWeight: 600,
          fontSize: "40px",
          letterSpacing: "1px",
          lineHeight: "1",
        }}
      >
        ПЕРЕМАГАЄ В РАУНДІ
      </span>
    </div>
  );
};

export default WinAnnouncement;
