import * as I from "csgogsi-socket";
import TeamLogo from "../MatchBar/TeamLogo";
import "./mapseries.scss";
import { Match, Veto } from "../../API/types";

interface IProps {
  match: Match | null;
  teams: I.Team[];
  isFreezetime: boolean;
  map: I.Map;
}

interface IVetoProps {
  veto: Veto;
  teams: I.Team[];
  active: boolean;
}

const VetoEntry = ({ veto, teams, active }: IVetoProps) => {
  return (
    <div className={`veto_container ${active ? "active" : ""}`}>
      <div className="veto_map_name">{veto.mapName}</div>
      <div className="veto_picker">
        <TeamLogo team={teams.filter((team) => team.id === veto.teamId)[0]} />
      </div>
      <div className="veto_winner">
        <TeamLogo team={teams.filter((team) => team.id === veto.winner)[0]} />
      </div>
      <div className="veto_score">
        {Object.values(veto.score || ["-", "-"])
          .sort()
          .join(":")}
      </div>
      <div className="active_container">
        <div className="active">ЗАРАЗ</div>
      </div>
    </div>
  );
};

const MapSeries = ({ match, teams, isFreezetime, map }: IProps) => {
  if (!match || !match.vetos.length) return null;
  return (
    <div className={`map_series_container ${isFreezetime ? "show" : "hide"}`}>
      <div className="title_bar">
        <div className="picked">Обрано</div>
        <div className="winner">Перемога</div>
        <div className="score">Рахунок</div>
      </div>
      {match.vetos
        .filter((veto) => veto.type !== "ban")
        .map((veto) => {
          if (!veto.mapName) return null;
          return (
            <VetoEntry
              key={`${match.id}${veto.mapName}${veto.teamId}${veto.side}`}
              veto={veto}
              teams={teams}
              active={map.name.includes(veto.mapName)}
            />
          );
        })}
    </div>
  );
};
export default MapSeries;
