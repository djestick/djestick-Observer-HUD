import * as I from "csgogsi-socket";
import { Match } from "../../API/types";

interface Props {
  map: I.Map;
  match: Match | null;
}

const SeriesBox = ({ map, match }: Props) => {
  return <div id="encapsulator" />;
};

export default SeriesBox;
