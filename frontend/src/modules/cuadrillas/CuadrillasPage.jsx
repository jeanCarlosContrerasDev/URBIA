import Card from "../../components/Card.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import CrewList from "./components/CrewList.jsx";

export default function CuadrillasPage() {
  return (
    <>
      <PageHeader title="Cuadrillas y Proveedores" subtitle="Asignación de equipos de campo y contratistas" />
      <Card>
        <CrewList />
      </Card>
    </>
  );
}