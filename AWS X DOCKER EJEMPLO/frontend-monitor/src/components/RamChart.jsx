import { useEffect, useRef, useState } from "react";
import Chart from "chart.js/auto";

export default function RamPolarChart() {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const [ultimaMetrica, setUltimaMetrica] = useState(null);

  // Fetch data cada 5 segundos
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("http://3.18.49.216:8080/api/metricas/ram");
        const data = await res.json();
        setUltimaMetrica(data[data.length - 1]); // última métrica
      } catch (err) {
        console.error("Error obteniendo RAM:", err);
      }
    };

    fetchData();
    const intervalo = setInterval(fetchData, 5000);

    return () => clearInterval(intervalo);
  }, []);

  // Crear o actualizar grafica
  useEffect(() => {
    if (!chartRef.current || !ultimaMetrica) return;

    const ctx = chartRef.current.getContext("2d");

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const porcentajeUso = ultimaMetrica.datos.porcentaje;
    const porcentajeLibre = 100 - porcentajeUso;

    chartInstance.current = new Chart(ctx, {
  type: "doughnut",
  data: {
    labels: ["Usado (%)", "Libre (%)"],
    datasets: [
      {
        label: "Uso de RAM",
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
            `${context.label}: ${context.formattedValue}%`,
        },
      },
    },
  },
});

  }, [ultimaMetrica]);

  return (
    <div>
      <h2>Uso actual de RAM</h2>

      {/* Contenedor con altura fija para que no se corte */}
      <div style={{ width: "400px", height: "400px", margin: "0 auto" }}>
        <canvas ref={chartRef}></canvas>
      </div>

      {/* Datos actualizados en tiempo real */}
      {ultimaMetrica && (
        <div style={{ marginTop: "10px", textAlign: "center" }}>
          <strong>Total:</strong> {(ultimaMetrica.datos.total / 1024).toFixed(0)} MB<br />
          <strong>Usado:</strong> {(ultimaMetrica.datos.uso / 1024).toFixed(0)} MB<br />
          <strong>Libre:</strong> {(ultimaMetrica.datos.libre / 1024).toFixed(0)} MB<br />
          <strong>Porcentaje:</strong> {ultimaMetrica.datos.porcentaje}%
        </div>
      )}
    </div>
  );
}

