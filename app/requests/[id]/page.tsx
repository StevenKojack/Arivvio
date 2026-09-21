import { Navigation } from "../../components/Navigation";
import { RequestWorkspace } from "../RequestWorkspace";
export default async function RequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <main className="min-h-screen ui-soft ui-text"><Navigation /><RequestWorkspace requestId={id} /></main>;
}
