import { api } from './api';
import type { Tunnel, CreateTunnelRequest, TunnelGroup, PaginationParams, PaginationResponse } from '../types';

class TunnelsService {
  async getTunnels(params?: PaginationParams & { search?: string; project_id?: string }): Promise<PaginationResponse<Tunnel>> {
    const response = await api.get<PaginationResponse<Tunnel>>('/tunnels', { params });
    if (!response.data) {
      throw new Error('Failed to get tunnels');
    }
    return response.data;
  }

  async getTunnel(id: string): Promise<Tunnel> {
    const response = await api.get<{ tunnel: Tunnel }>(`/tunnels/${id}`);
    if (!response.data?.tunnel) {
      throw new Error('Failed to get tunnel');
    }
    return response.data.tunnel;
  }

  async createTunnel(data: CreateTunnelRequest): Promise<Tunnel> {
    const response = await api.post<{ tunnel: Tunnel }>('/tunnels', data);
    if (!response.data?.tunnel) {
      throw new Error('Failed to create tunnel');
    }
    return response.data.tunnel;
  }

  async updateTunnel(id: string, data: Partial<CreateTunnelRequest>): Promise<Tunnel> {
    const response = await api.put<{ tunnel: Tunnel }>(`/tunnels/${id}`, data);
    if (!response.data?.tunnel) {
      throw new Error('Failed to update tunnel');
    }
    return response.data.tunnel;
  }

  async deleteTunnel(id: string): Promise<void> {
    await api.delete(`/tunnels/${id}`);
  }

  async getTunnelGroups(): Promise<TunnelGroup[]> {
    const response = await api.get<{ items: TunnelGroup[] }>('/tunnels/groups');
    if (!response.data?.items) {
      throw new Error('Failed to get tunnel groups');
    }
    return response.data.items;
  }
}

export const tunnelsService = new TunnelsService();
