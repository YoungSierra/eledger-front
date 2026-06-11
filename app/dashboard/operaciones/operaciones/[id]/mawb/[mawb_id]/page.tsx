import MawbForm from "../../MawbForm";

export default async function EditarMawbPage({ params }: { params: Promise<{ id: string; mawb_id: string }> }) {
  const { id, mawb_id } = await params;
  return <MawbForm operacionId={id} mawbId={mawb_id} />;
}
