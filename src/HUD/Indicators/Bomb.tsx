import { Player } from "csgogsi-socket";
import { Bomb as BombIcon } from "../../assets/Icons";
const Bomb = ({ player }: { player: Player }) => {
  if (Object.values(player.weapons).every((weapon) => weapon.type !== "C4")) {
    return null;
  }
  return (
    <div className={`bomb_indicator`}>
      <BombIcon />
    </div>
  );
};
export default Bomb;
