import MawbForm from "../../MawbForm";

export default async function NuevoMawbPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MawbForm operacionId={id} mawbId={null} />;
}
