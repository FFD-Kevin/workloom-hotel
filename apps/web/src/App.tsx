import { Route, Routes } from "react-router";
import P1 from "./pages/p1/P1";
import DevMatrix from "./pages/dev/DevMatrix";
import { Bridge } from "./shell/Bridge";

/** 阶段三路由：页面自包 Bridge（P1 起注入真实左右栏）；/dev 矩阵保持壳内平铺 */
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<P1 />} />
      <Route path="/dev" element={<Bridge><DevMatrix /></Bridge>} />
      <Route path="*" element={<P1 />} />
    </Routes>
  );
}
