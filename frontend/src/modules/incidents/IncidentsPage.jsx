import Card from "../../components/Card.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import IncidentTable from "./components/IncidentTable.jsx";

export default function IncidentsPage() {
  return (
    <>
      <PageHeader title="Gestión de Incidencias y Casos" subtitle="Registro, seguimiento y cierre de casos" />
      <Card>
        <IncidentTable />
      </Card>
    </>
  );
}