import { useEffect, useState } from "react";
import { Timer } from "../MatchBar/MatchBar";
import { Player } from "csgogsi-socket";
import * as I from "../../assets/Icons";
import { MAX_TIMER } from "./Countdown";

interface IProps {
  timer: Timer | null;
  side: "right" | "left";
}

const getCaption = (type: "defusing" | "planting", player: Player | null) => {
  if (!player) return null;
  if (type === "defusing") {
    return (
      <>
        <I.Defuse height={22} width={22} fill="var(--color-new-ct)" />
        <div>{player.name}&nbsp;</div>
        <div className={"CT"}>is defusing</div>
      </>
    );
  }
  return (
    <>
      <I.SmallBomb height={22} fill="var(--color-new-t)" />
      <div>{player.name}&nbsp;</div>
      <div className={"T"}> is planting</div>
    </>
  );
};

const Bomb = ({ timer, side }: IProps) => {
  const [stage, setStage] = useState<
    "hidden" | "background" | "progress" | "exit"
  >("hidden");
  const [progressDuration, setProgressDuration] = useState(0); // в секундах
  const [visibleTimer, setVisibleTimer] = useState<Timer | null>(null);

  useEffect(() => {
    if (timer?.active) {
      const duration =
        timer.type === "planting"
          ? MAX_TIMER.planting
          : timer.player?.state.defusekit
          ? MAX_TIMER.defuse_kit
          : MAX_TIMER.defuse_nokit;

      const actualTime = timer.time;
      const remaining = Math.max(actualTime, 0);

      setProgressDuration(remaining);
      setVisibleTimer(timer);
      setStage("background");

      const progressTimeout = setTimeout(() => setStage("progress"), 50);
      const exitTimeout = setTimeout(() => setStage("exit"), remaining * 1000);
      const hideTimeout = setTimeout(
        () => setStage("hidden"),
        remaining * 1000 + 500
      );

      return () => {
        clearTimeout(progressTimeout);
        clearTimeout(exitTimeout);
        clearTimeout(hideTimeout);
      };
    } else {
      if (stage === "exit") {
        const delayedHide = setTimeout(() => {
          setStage("hidden");
          setVisibleTimer(null);
        }, 500);
        return () => clearTimeout(delayedHide);
      } else {
        setStage("hidden");
        setVisibleTimer(null);
      }
    }
  }, [timer?.active]);

  if (!visibleTimer) return null;

  return (
    <div className={`defuse_plant_container ${side} stage-${stage}`}>
      <div className="container-background" />

      {/* Прогресс-бары */}
      <div
        className="defuse_plant_bar bar-left"
        style={
          {
            "--progress-duration": `${progressDuration}s`,
          } as React.CSSProperties
        }
      />
      <div
        className="defuse_plant_bar bar-right"
        style={
          {
            "--progress-duration": `${progressDuration}s`,
          } as React.CSSProperties
        }
      />

      {visibleTimer.type === "planting" ? (
        <video
          className="defuse_plant_video"
          src="/bomb_anim.webm"
          autoPlay
          muted
          loop
          playsInline
        />
      ) : (
        <video
          className="defuse_plant_video"
          src="/defuse_anim.webm"
          autoPlay
          muted
          loop
          playsInline
        />
      )}

      {/* Текст поверх */}
      <div className="defuse_plant_caption">
        <div>{visibleTimer.player?.name}&nbsp;</div>
        <div className={visibleTimer.type === "defusing" ? "CT" : "T"}>
          {visibleTimer.type === "defusing" ? "is defusing" : "is planting"}
        </div>
      </div>
    </div>
  );
};

export default Bomb;
