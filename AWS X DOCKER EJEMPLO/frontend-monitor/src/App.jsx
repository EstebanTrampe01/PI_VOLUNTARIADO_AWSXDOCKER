import './App.css';
import RamChart from './components/RamChart';
import CpuChart from './components/CpuChart';

function App() {
  return (
    <div className="app">
      <h1>Monitor de Recursos</h1>
      <div className="charts-container">
        <RamChart />
        <CpuChart />
        
        {/* cpu kalsdd  /> */}
      </div>
    </div>
  );
}

export default App;
