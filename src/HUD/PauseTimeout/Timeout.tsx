import { Map, CSGO } from "csgogsi-socket";

interface IProps {
  phase: CSGO["phase_countdowns"] | null;
  map: Map;
}

const Timeout = ({ phase, map }: IProps) => {
  const rawEndsIn =
    phase && phase.phase_ends_in !== undefined
      ? Number(phase.phase_ends_in)
      : null;
  const time =
    rawEndsIn !== null && !Number.isNaN(rawEndsIn)
      ? Math.abs(Math.ceil(rawEndsIn))
      : null;
  const team = phase && phase.phase === "timeout_t" ? map.team_t : map.team_ct;

  return (
    <div
      id={`timeout`}
      className={`${
        time &&
        time > 2 &&
        phase &&
        (phase.phase === "timeout_t" || phase.phase === "timeout_ct")
          ? "show"
          : ""
      } ${
        phase && (phase.phase === "timeout_t" || phase.phase === "timeout_ct")
          ? phase.phase.substring(8)
          : ""
      }`}
    >
      <div className={team.side}>{team.name}&nbsp;</div>
      <div>ПЕРЕРВА</div>
    </div>
  );
};
export default Timeout;
