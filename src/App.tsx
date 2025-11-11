import { APITester } from "./APITester";
import "./index.css";

export function App() {
  return (
    <div className="app">
      <h1>Bun + React</h1>
      <p>
        Edit <code>src/App.tsx</code> and save to test HMR
      </p>
      <APITester />
    </div>
  );
}

export default App;
