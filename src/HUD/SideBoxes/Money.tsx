import React from "react";

const LossBox = React.memo(
  ({ active, side }: { active: boolean; side: "CT" | "T" }) => {
    return <div className={`loss-box ${side} ${active ? "active" : ""}`}></div>;
  }
);

interface Props {
  side: "left" | "right";
  team: "CT" | "T";
  loss: number;
  equipment: number;
  money: number;
  show: boolean;
}

const Money = ({ side, team, loss, equipment, money, show }: Props) => {
  return (
    <div className={`moneybox ${side} ${team} ${show ? "show" : "hide"}`}>
      <div className="money_container">
        <div className="title">На команду</div>
        <div className="value">${money}</div>
      </div>
      <div className="money_container">
        <div className="title">Бонус поразки</div>
        <div className="value">${loss}</div>
      </div>
      <div className="loss_container">
        <LossBox side={team} active={(loss - 1400) / 500 >= 1} />
        <LossBox side={team} active={(loss - 1400) / 500 >= 2} />
        <LossBox side={team} active={(loss - 1400) / 500 >= 3} />
        <LossBox side={team} active={(loss - 1400) / 500 >= 4} />
      </div>
      {/* <div className="money_container">
        <div className="title">Equip.</div>
        <div className="value">${equipment}</div>
      </div> */}
    </div>
  );
};
export default Money;
