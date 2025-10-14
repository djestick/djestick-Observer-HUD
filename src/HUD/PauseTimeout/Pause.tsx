import { CSGO } from "csgogsi-socket";

interface IProps {
  phase: CSGO["phase_countdowns"] | null;
}

const Pause = ({ phase }: IProps) => {
  return (
    <div
      id={`pause`}
      className={phase && phase.phase === "paused" ? "show" : ""}
    >
      ТЕХНІЧНА ПЕРЕРВА
    </div>
  );
};
export default Pause;
