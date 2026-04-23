import { api } from './api';
import type { Project, ProjectDetail, CreateProjectRequest, PaginationParams, PaginationResponse } from '../types';

class ProjectsService {
  async getProjects(params?: PaginationParams & { search?: string }): Promise<PaginationResponse<Project>> {
    const response = await api.get<PaginationResponse<Project>>('/projects', { params });
    if (!response.data) {
      throw new Error('Failed to get projects');
    }
    return response.data;
  }

  async getProject(id: string): Promise<ProjectDetail> {
    const response = await api.get<{ project: ProjectDetail }>(`/projects/${id}`);
    if (!response.data?.project) {
      throw new Error('Failed to get project');
    }
    return response.data.project;
  }

  async createProject(data: CreateProjectRequest): Promise<Project> {
    const response = await api.post<{ project: Project }>('/projects', data);
    if (!response.data?.project) {
      throw new Error('Failed to create project');
    }
    return response.data.project;
  }

  async updateProject(id: string, data: Partial<CreateProjectRequest>): Promise<Project> {
    const response = await api.put<{ project: Project }>(`/projects/${id}`, data);
    if (!response.data?.project) {
      throw new Error('Failed to update project');
    }
    return response.data.project;
  }

  async deleteProject(id: string): Promise<{ message: string; deleted_tunnels: number }> {
    const response = await api.delete<{ message: string; deleted_tunnels: number }>(`/projects/${id}`);
    if (!response.data) {
      throw new Error('Failed to delete project');
    }
    return response.data;
  }
}

export const projectsService = new ProjectsService();
