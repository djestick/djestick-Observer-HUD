import { useState } from "react";
import { Player } from "csgogsi-socket";
import Weapon from "./../Weapon/Weapon";
import Avatar from "./Avatar";
import "./Observed.scss";
import {
  ArmorHelmet,
  ArmorFull,
  HealthFull,
  Bullets,
  Kills,
  Skull,
  Bomb as BombIcon,
} from "../../assets/Icons";
import { useAction } from "../../API/contexts/actions";
import Defuse from "../Indicators/Defuse";

const Observed = ({ player }: { player: Player | null }) => {
  const [showCam, setShowCam] = useState(true);
  useAction("toggleCams", () => setShowCam((p) => !p));
  if (!player) return null;

  const playerWeapons = Array.isArray(player.weapons)
    ? player.weapons
    : Object.values(player.weapons || {});
  const currentWeapon = playerWeapons.find((w) => w.state === "active");
  const healthbarWidth = { width: `${player.state.health}%` };

  // Get weapon type via any cast to avoid missing TS definitions
  const weaponType = (currentWeapon as any)?.type;
  const isAmmoWeapon = weaponType
    ? !["Knife", "Grenade"].includes(weaponType) && weaponType !== "C4"
    : false;

  return (
    <div className={`observed_container ${player.team.side}`}>
      <div className="observed_main">
        <div className="avatar_holder">
          <Avatar
            teamId={player.team.id}
            steamid={player.steamid}
            height={140}
            width={140}
            showCam={showCam}
            slot={player.observer_slot}
            teamSide={player.team.side}
          />
        </div>

        <div className="center_info">
          <div className="name_money_inline">
            <span className="name">{player.name}</span>
            <span className="money">${player.state.money}</span>
          </div>

          <div className="stats_row">
            <Kills />
            <span>{player.stats.kills}</span>
            <Skull />
            <span>{player.stats.deaths}</span>
          </div>
        </div>

        <div className="grenades">
          {playerWeapons
            .filter((w) => w.type === "Grenade")
            .map((g, i) => (
              <div className="grenade_icon" key={i}>
                <Weapon weapon={g.name} active={false} isGrenade />
              </div>
            ))}
        </div>

        <div className="hp_overlay">
          <div className="hp_back" />
          <div className="hp_fill" style={healthbarWidth} />
          <div className="hp_content">
            <div className="icons">
              <div className="icon_with_value">
                <HealthFull />
                <span>{player.state.health}</span>
              </div>
              <div className="icon_with_value">
                {player.state.helmet ? <ArmorHelmet /> : <ArmorFull />}
                <span>{player.state.armor}</span>
              </div>

              {player.state.defusekit && player.team.side === "CT" && (
                <div className="icon">
                  <Defuse player={player} />
                </div>
              )}
              {playerWeapons.find((w) => w.name === "weapon_c4") &&
                player.team.side === "T" && (
                  <div className="icon">
                    <BombIcon />
                  </div>
                )}
            </div>

            <div className="ammo">
              {currentWeapon &&
                (isAmmoWeapon ? (
                  <>
                    <span>{currentWeapon.ammo_clip}</span>
                    <span className="divider">/</span>
                    <span>{currentWeapon.ammo_reserve}</span>
                    <div className="ammo_icon">
                      <Bullets />
                    </div>
                  </>
                ) : (
                  <div
                    className={`weapon_icon ${
                      weaponType === "Grenade" ? "grenade_ammo" : ""
                    }`}
                  >
                    <Weapon
                      weapon={currentWeapon.name}
                      active={currentWeapon.state === "active"}
                      isGrenade={weaponType === "Grenade"}
                    />
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Observed;
