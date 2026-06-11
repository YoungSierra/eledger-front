import HawbForm from "../../HawbForm";

export default async function NuevoHawbPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <HawbForm operacionId={id} hawbId={null} />;
}
