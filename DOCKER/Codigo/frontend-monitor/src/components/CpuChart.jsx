import { useEffect, useRef, useState } from "react";
import Chart from "chart.js/auto";

export default function CpuPolarChart() {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const [ultimaMetrica, setUltimaMetrica] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("http://localhost:4000/api/metricas/cpu");
        const data = await res.json();
        setUltimaMetrica(data[data.length - 1]);
      } catch (err) {
        console.error("Error obteniendo CPU:", err);
      }
    };

    fetchData();
    const intervalo = setInterval(fetchData, 5000);
    return () => clearInterval(intervalo);
  }, []);

  useEffect(() => {
    if (!chartRef.current || !ultimaMetrica) return;

    const porcentajeUso = ultimaMetrica.datos.porcentajeUso || 0;

    const porcentajeLibre = 100 - porcentajeUso;

    if (!chartInstance.current) {
      // Crear gráfica solo una vez
      const ctx = chartRef.current.getContext("2d");
      chartInstance.current = new Chart(ctx, {
        type: "doughnut",
        data: {
          labels: ["Usado (%)", "Libre (%)"],
          datasets: [
            {
              label: "Uso de CPU",
              data: [porcentajeUso, porcentajeLibre],
              backgroundColor: ["#ff6384", "#36a2eb"],
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "top",
            },
            tooltip: {
              callbacks: {
                label: (context) =>
                  `${context.label}: ${context.raw}%`,
              },
            },
          },
        },
      });
    } else {
      // Solo actualiza datos sin destruir
      chartInstance.current.data.datasets[0].data = [
        porcentajeUso,
        porcentajeLibre,
      ];
      chartInstance.current.update();
    }
  }, [ultimaMetrica]);

  return (
    <div style={{ width: "400px", height: "400px", margin: "0 auto" }}>
      <h2 style={{ textAlign: "center" }}>Uso actual de CPU</h2>
      <canvas ref={chartRef}></canvas>
      {ultimaMetrica && (
        <div style={{ marginTop: "10px", textAlign: "center" }}>
          <strong>Porcentaje:</strong> {ultimaMetrica.datos.porcentajeUso }%
        </div>
      )}
    </div>
  );
}
