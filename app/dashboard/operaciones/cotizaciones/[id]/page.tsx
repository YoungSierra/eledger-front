import CotizacionForm from "../CotizacionForm";

export default async function CotizacionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CotizacionForm id={id} />;
}
