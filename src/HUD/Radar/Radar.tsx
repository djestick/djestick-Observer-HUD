import { CSGO, Grenade } from "csgogsi-socket";
import LexoRadarContainer from './LexoRadar/LexoRadarContainer';



interface Props { radarSize: number, game: CSGO }

const Radar = ({ radarSize, game }: Props) => {
    const { players, player, bomb, grenades, map } = game;
    const grenadesList: Grenade[] = Array.isArray(grenades)
        ? grenades
        : Object.values((grenades as unknown as Record<string, Grenade>) || {});
    return <LexoRadarContainer
        players={players}
        player={player}
        bomb={bomb}
        grenades={grenadesList}
        size={radarSize}
        mapName={map.name.substring(map.name.lastIndexOf('/')+1)}
    />
}

export default Radar;
