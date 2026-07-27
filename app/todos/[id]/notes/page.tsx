import { NotePage } from "@/components/knowledge/note-page";

export default async function TodoNotesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <NotePage todoId={id} />;
}
