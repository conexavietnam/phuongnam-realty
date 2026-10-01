
import { MobileLayout } from '@/layouts/MobileLayout';
import { MobileProjectCard } from '@/components/mobile/MobileProjectCard';
import { projectService } from '@/services/projectService';

export function MobileProjectsPage() {
  const projects = projectService.getAll();

  return (
    <MobileLayout>
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-xl font-bold text-navy-900 border-l-4 border-gold-500 pl-2">Dự án phân phối</h1>
      </div>
      <div className="flex flex-col gap-3 px-4 py-4">
        {projects.map(project => (
          <MobileProjectCard key={project.id} project={project} />
        ))}
      </div>
    </MobileLayout>
  );
}
