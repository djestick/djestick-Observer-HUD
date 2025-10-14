import React, { useEffect, useMemo, useState } from "react";
import PlayerCamera from "./../Camera/Camera";
import { Skull, playerCT, playerT } from "../../assets/Icons";
import { avatars, loadAvatarURL } from "../../API/avatars";
import { configs } from "../../API/contexts/actions";
import { apiUrl } from "../../API";

interface AvatarProps {
  steamid: string;
  teamId?: string | null;
  slot?: number;
  height?: number;
  width?: number;
  showSkull?: boolean;
  showCam?: boolean;
  sidePlayer?: boolean;
  teamSide?: string;
  flashed?: number;
}

type ReplaceMode = "never" | "if_missing" | "always";

const Avatar = ({
  steamid,
  teamId,
  height,
  width,
  showSkull,
  showCam,
  sidePlayer,
  teamSide,
  flashed,
}: AvatarProps) => {
  const [replaceMode, setReplaceMode] = useState<ReplaceMode>("never");
  const [refreshTick, setRefreshTick] = useState(0);

  const flashValue = flashed ? (flashed < 100 ? 100 : flashed * 2) : 100;
  const defaultPic = teamSide === "CT" ? playerCT : playerT;

  useEffect(() => {
    const handleConfig = (data: any) => {
      const display = data?.display_settings;
      if (!display) return;
      setReplaceMode(display.replace_avatars || "never");
    };

    configs.onChange(handleConfig);
    handleConfig(configs.data);

    return () => {
      configs.off(handleConfig);
    };
  }, []);

  useEffect(() => {
    if (!steamid) return;
    loadAvatarURL(steamid);
    const current = avatars[steamid];
    if (current) {
      current.loader.finally(() => {
        setRefreshTick((prev) => prev + 1);
      });
    }
  }, [steamid]);

  const avatarSrc = useMemo(() => {
    const entry = avatars[steamid];
    const avatarUrl = entry && entry.url ? entry.url : null;

    if (
      replaceMode === "always" ||
      (replaceMode === "if_missing" && !avatarUrl)
    ) {
      if (teamId) {
        return `${apiUrl}api/teams/logo/${teamId}`;
      }
    }

    return avatarUrl;
  }, [steamid, teamId, replaceMode, refreshTick]);

  const imageContent = showSkull ? (
    <Skull height={height} width={width} />
  ) : (
    <img
      src={avatarSrc || defaultPic}
      height={height}
      width={width}
      alt="Avatar"
      style={{ filter: `brightness(${flashValue}%)` }}
    />
  );

  return (
    <div className="avatar" style={{ position: "relative" }}>
      {imageContent}
      {showCam ? (
        <div
          className={sidePlayer ? "videofeed" : "avatar_feed"}
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <PlayerCamera steamid={steamid} visible />
        </div>
      ) : null}
    </div>
  );
};

export default Avatar;
