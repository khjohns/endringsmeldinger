import type { Project } from '$lib/types/project';

let project = $state<Project | null>(null);

export const projectStore = {
  get current() {
    return project;
  },
  set(p: Project | null) {
    project = p;
  },
};
