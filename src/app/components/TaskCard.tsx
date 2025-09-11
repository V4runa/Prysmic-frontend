import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Task, TaskPriority } from "../tasks/types/task";

export default function TaskCard({ task }: { task: Task }) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/tasks/${task.id}`);
  };

  const priorityMap = {
    [TaskPriority.LOW]: { label: "Low", color: "border-green-400 text-green-300" },
    [TaskPriority.MEDIUM]: { label: "Medium", color: "border-yellow-400 text-yellow-300" },
    [TaskPriority.HIGH]: { label: "High", color: "border-red-400 text-red-300" },
  };

  const priority = priorityMap[task.priority];

  return (
    <div
      onClick={handleClick}
      className="cursor-pointer bg-white/5 border border-white/10 backdrop-blur-lg p-4 rounded-xl shadow-md hover:shadow-lg transition duration-200 hover:border-cyan-500"
    >
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-white text-lg font-semibold truncate">
          {task.title}
        </h2>
        {task.isComplete && <span className="text-green-400 text-sm">✓</span>}
      </div>

      {task.dueDate && (
        <p className="text-white/50 text-sm mb-2">
          Due: {format(new Date(task.dueDate), "PPP")}
        </p>
      )}

      <div
        className={`inline-block border px-2 py-0.5 rounded-full text-xs font-medium ${priority.color}`}
      >
        {priority.label} Priority
      </div>
    </div>
  );
}