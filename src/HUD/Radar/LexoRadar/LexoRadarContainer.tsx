import {
  Player,
  Bomb,
  Grenade,
  FragOrFireBombOrFlashbandGrenade,
  Side,
} from "csgogsi-socket";
import maps from './maps';
import LexoRadar from './LexoRadar';
import { RadarPlayerObject, RadarGrenadeObject } from './interface';
import { EXPLODE_TIME_FRAG, explosionPlaces, extendGrenade, extendPlayer, grenadesStates, normalizePosition, playersStates } from './utils';
import { GSI } from '../../../API/HUD';

const DESCALE_ON_ZOOM = true;
type GrenadeWithId = Grenade & { id: string; side: Side | null };

const ensureGrenadeId = (grenade: Grenade, fallback: string): GrenadeWithId => {
  const candidate = (grenade as Grenade & { id?: string }).id;
  if (candidate && candidate.length) {
    const withId = grenade as GrenadeWithId;
    return {
      ...withId,
      side: (withId.side ?? null) as Side | null,
    };
  }
  return {
    ...grenade,
    id: fallback,
    side: (grenade as { side?: Side | null }).side ?? null,
  };
};

const toGrenadeArray = (
  value: Grenade[] | Record<string, Grenade> | undefined
): GrenadeWithId[] => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((grenade, index) =>
      ensureGrenadeId(
        grenade,
        `${grenade.owner || "unknown"}_${grenade.type}_${index}`
      )
    );
  }
  return Object.entries(value).map(([id, grenade]) =>
    ensureGrenadeId(grenade, id)
  );
};

const getSideOfGrenade = (grenade: Grenade, players: Player[]): Side | null => {
  const owner = players.find(player => player.steamid === grenade.owner);
  if (owner) return owner.team.side;
  return (grenade as Partial<Grenade> & { side?: Side }).side ?? null;
};
interface IProps {
  players: Player[];
  bomb?: Bomb | null;
  player: Player | null;
  grenades?: Grenade[] | Record<string, Grenade>;
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
      const normalized = normalizePosition(grenade.position);
      if (normalized) {
        explosionPlaces[grenade.id] = normalized;
      }
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
  grenades,
}: IProps) => {
    const offset = (size - (size * size / 1024)) / 2;
    const grenadeEntries = toGrenadeArray(grenades);

    if (!(mapName in maps)) {
        return <div className="map-container" style={{ width: size, height: size, transform: `scale(${size / 1024})`, top: -offset, left: -offset }}>
            Unsupported map
        </div>;
    }
    const playersExtended: RadarPlayerObject[] = players.map(pl => extendPlayer({ player: pl, steamId: player?.steamid || null, mapName })).filter((player): player is RadarPlayerObject => player !== null).flat();
    const grenadesExtended =  grenadeEntries.map(grenade => extendGrenade({ grenade, side: getSideOfGrenade(grenade, players), mapName })).filter(entry => entry !== null).flat() as RadarGrenadeObject[];
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
