import {
  Player,
  Bomb,
  Grenade,
  FragOrFireBombOrFlashbandGrenade,
} from "csgogsi-socket";
import maps from './maps';
import LexoRadar from './LexoRadar';
import { RadarPlayerObject, RadarGrenadeObject } from './interface';
import { EXPLODE_TIME_FRAG, explosionPlaces, extendGrenade, extendPlayer, grenadesStates, playersStates } from './utils';
import { GSI } from '../../../API/HUD';

const DESCALE_ON_ZOOM = true;
const toGrenadeArray = (
  value: Grenade[] | Record<string, Grenade> | undefined
): Grenade[] => (Array.isArray(value) ? value : Object.values(value || {}));
interface IProps {
  players: Player[];
  bomb?: Bomb | null;
  player: Player | null;
  grenades?: Grenade[];
  size?: number;
  mapName: string;
}

GSI.prependListener("data", () => {
  const currentGrenades = toGrenadeArray(GSI.current?.grenades);
  grenadesStates.unshift(currentGrenades);
  grenadesStates.splice(5);

  playersStates.unshift(GSI.current?.players ?? []);
  playersStates.splice(5);
});

GSI.prependListener("data", (data) => {
  const { last } = GSI;
  const currentGrenades = toGrenadeArray(data.grenades);
  const lastGrenades = toGrenadeArray(last?.grenades);
  if (!last || !lastGrenades.length) {
    return;
  }

  for (const grenade of currentGrenades.filter(
    (grenade): grenade is FragOrFireBombOrFlashbandGrenade =>
      grenade.type === "frag"
  )) {
    const previous = lastGrenades.find(
      (oldGrenade): oldGrenade is FragOrFireBombOrFlashbandGrenade =>
        oldGrenade.id === grenade.id
    );
    if (!previous) continue;

    if (
      grenade.lifetime >= EXPLODE_TIME_FRAG &&
      previous.lifetime < EXPLODE_TIME_FRAG
    ) {
      explosionPlaces[grenade.id] = grenade.position;
    }
  }
  for (const grenadeId of Object.keys(explosionPlaces)) {
    const exists = currentGrenades.some(
      (grenade) => grenade.id === grenadeId
    );
    if (!exists) {
      delete explosionPlaces[grenadeId];
    }
  }
});

const LexoRadarContainer = ({
  size = 300,
  mapName,
  bomb,
  player,
  players,
  grenades = [],
}: IProps) => {
    const offset = (size - (size * size / 1024)) / 2;

    if (!(mapName in maps)) {
        return <div className="map-container" style={{ width: size, height: size, transform: `scale(${size / 1024})`, top: -offset, left: -offset }}>
            Unsupported map
        </div>;
    }
    const playersExtended: RadarPlayerObject[] = players.map(pl => extendPlayer({ player: pl, steamId: player?.steamid || null, mapName })).filter((player): player is RadarPlayerObject => player !== null).flat();
    const grenadesExtended =  grenades.map(grenade => extendGrenade({ grenade, side: playersExtended.find(player => player.steamid === grenade.owner)?.side || 'CT', mapName })).filter(entry => entry !== null).flat() as RadarGrenadeObject[];
    const config = maps[mapName];

    const zooms = config && config.zooms || [];

    const activeZoom = zooms.find(zoom => zoom.threshold(playersExtended.map(pl => pl.player)));

    const reverseZoom = 1/(activeZoom && activeZoom.zoom || 1);
    // s*(1024-s)/2048
    return <div className="map-container" style={{ width: size, height: size, transform: `scale(${size / 1024})`, top: -offset, left: -offset }}>
        <LexoRadar
            players={playersExtended}
            grenades={grenadesExtended}
            bomb={bomb}
            mapName={mapName}
            mapConfig={config}
            zoom={activeZoom}
            reverseZoom={DESCALE_ON_ZOOM ? reverseZoom.toFixed(2) : '1'}
        />
    </div>;
}

export default LexoRadarContainer;
