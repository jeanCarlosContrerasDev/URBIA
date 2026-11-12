import Card from "../../components/Card.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import VehicleList from "./components/VehicleList.jsx";

export default function CentinelaPage() {
  return (
    <>
      <PageHeader title="Vehículos Centinela" subtitle="Flota de vehículos con cámaras e IA embarcada" />
      <Card>
        <VehicleList />
      </Card>
    </>
  );
}