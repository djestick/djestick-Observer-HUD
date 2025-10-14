import { useEffect, useRef, useState } from "react";
import { MAX_TIMER, useBombTimer } from "./Countdown";
import { C4 } from "../../assets/Icons";

const Bomb = () => {
  const bombData = useBombTimer();
  const show = bombData.state === "planted" || bombData.state === "defusing";
  const timerRef = useRef<HTMLDivElement>(null);
  const [activated, setActivated] = useState(false);

  useEffect(() => {
    if (show && !activated) {
      setActivated(true);
      const el = timerRef.current;
      if (!el) return;

      el.classList.add("preflash");

      setTimeout(() => {
        el.classList.remove("preflash");
        el.classList.add("fillRed");
      }, 100);
    }

    if (!show) {
      // сбрасываем всё если бомба исчезает
      setActivated(false);
      const el = timerRef.current;
      if (!el) return;
      el.classList.remove("preflash", "fillRed");
    }
  }, [show]);

  return (
    <div id={`bomb_container`}>
      <div
        ref={timerRef}
        className={`bomb_timer ${show ? "show" : "hide"}`}
        style={{
          height: `${(bombData.bombTime * 100) / MAX_TIMER.bomb}%`,
        }}
      ></div>
      <div className={`bomb_icon ${show ? "show" : "hide"}`}>
        <C4 fill="white" />
      </div>
    </div>
  );
};

export default Bomb;
