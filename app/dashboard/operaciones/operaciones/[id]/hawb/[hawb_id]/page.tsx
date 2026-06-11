import HawbForm from "../../HawbForm";

export default async function EditarHawbPage({ params }: { params: Promise<{ id: string; hawb_id: string }> }) {
  const { id, hawb_id } = await params;
  return <HawbForm operacionId={id} hawbId={hawb_id} />;
}
