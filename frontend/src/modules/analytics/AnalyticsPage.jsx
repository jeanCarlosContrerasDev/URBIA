import Card from "../../components/Card.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import KpiGrid from "./components/KpiGrid.jsx";

export default function AnalyticsPage() {
  return (
    <>
      <PageHeader title="Tableros e Indicadores" subtitle="KPIs y métricas de gestión territorial" />
      <Card>
        <KpiGrid />
      </Card>
    </>
  );
}