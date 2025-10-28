import dayjs from "dayjs";

export function getPinColor(last?: string): string {
  if (!last) return "black";
  const diffDays = dayjs().diff(dayjs(last), "day");

  if (diffDays >= 28) return '#000000'; // black
  if (diffDays > 21) return "#DC2626";
  if (diffDays > 14) return "#EA580C";  
  if (diffDays > 7) return "#FACC15";
  if (diffDays >= 0)  return "#16A34A";
  return "black"; // 미래 날짜 예외
}