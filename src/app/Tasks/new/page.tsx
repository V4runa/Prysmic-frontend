import Link from "next/link";
import GlassPanel from "../../components/GlassPanel";
import MotionDiv from "../../components/MotionDiv";
import TaskForm from "../../components/TaskForm";
import { useRouter } from "next/navigation";

export default function NewTaskPage() {
  const router = useRouter();

  const handleSuccess = () => {
    router.push("/tasks");
  };

  return (
    <MotionDiv>
      <GlassPanel className="p-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-4">New Task</h1>

        <TaskForm onSuccess={handleSuccess} />

        <Link
          href="/tasks"
          className="inline-block text-cyan-400 hover:underline text-sm mt-6"
        >
          ← Back to Tasks
        </Link>
      </GlassPanel>
    </MotionDiv>
  );
}
