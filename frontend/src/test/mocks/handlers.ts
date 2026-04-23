import { http, HttpResponse, delay } from 'msw'
import type { Tunnel, DefectRecord, PaginationResponse } from '../../types'

// Mock 数据
const mockTunnels: Tunnel[] = [
  {
    id: 'tunnel-1',
    user_id: 'user-1',
    project_id: 'project-1',
    name: '测试隧道A',
    location: '北京市朝阳区',
    description: '城市主干道隧道',
    length_km: 2.5,
    total_defects: 5,
    unique_location_count: 3,
    health_index: 75,
    last_analysis_at: '2026-03-02T10:30:00Z',
    created_at: '2026-03-01T08:00:00Z',
    updated_at: '2026-03-02T10:30:00Z',
  },
  {
    id: 'tunnel-2',
    user_id: 'user-1',
    project_id: 'project-1',
    name: '测试隧道B',
    location: '上海市浦东新区',
    description: '跨江隧道',
    length_km: 3.8,
    total_defects: 0,
    unique_location_count: 0,
    health_index: 100,
    created_at: '2026-03-01T09:00:00Z',
    updated_at: '2026-03-01T09:00:00Z',
  },
  {
    id: 'tunnel-3',
    user_id: 'user-1',
    project_id: 'project-2',
    name: '测试隧道C',
    location: '广州市天河区',
    description: '地铁隧道',
    length_km: 1.2,
    total_defects: 12,
    unique_location_count: 8,
    health_index: 45,
    last_analysis_at: '2026-03-01T15:20:00Z',
    created_at: '2026-02-28T14:00:00Z',
    updated_at: '2026-03-01T15:20:00Z',
  },
]

const mockDefectRecord: DefectRecord = {
  id: 'defect-1',
  user_id: 'user-1',
  tunnel_id: 'tunnel-1',
  image_path: '/uploads/test-image.jpg',
  final_result: `## 隧道缺陷分析报告

### 缺陷类型
**裂缝缺陷**

### 严重程度
**中等（Medium）**

### 缺陷描述
检测到隧道拱顶存在一条纵向裂缝，长度约 1.5 米，宽度约 2-3 毫米。

### 建议处理方案
1. **短期措施**：安装裂缝监测设备，定期观察裂缝发展趋势
2. **中期措施**：采用环氧树脂注浆封闭裂缝
3. **长期措施**：评估隧道结构安全性，必要时进行加固处理

### 风险等级
中等风险，建议在 3 个月内完成修复工作。`,
  model_used: 'qwen2.5-vl-7b-instruct',
  inference_time_ms: 2500,
  settings: {
    temperature: 1.0,
    top_k: 10,
    max_tokens: 1024,
    top_p: 0.95,
    instruction: '你是一位土木工程领域的专家，请详细分析这张隧道缺陷图片',
  },
  defect_type: '裂缝',
  severity: 'medium',
  created_at: '2026-03-03T10:00:00Z',
  updated_at: '2026-03-03T10:00:00Z',
}

export const handlers = [
  // 获取隧道列表
  http.get('*/api/v1/tunnels', async ({ request }) => {
    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '10')
    const skip = parseInt(url.searchParams.get('skip') || '0')

    await delay(100) // 模拟网络延迟

    const paginatedData: PaginationResponse<Tunnel> = {
      items: mockTunnels.slice(skip, skip + limit),
      pagination: {
        total: mockTunnels.length,
        skip,
        limit,
        has_next: skip + limit < mockTunnels.length,
        has_prev: skip > 0,
      },
    }

    return HttpResponse.json({
      success: true,
      data: paginatedData,
    })
  }),

  // 获取单个隧道
  http.get('*/api/v1/tunnels/:id', async ({ params }) => {
    const { id } = params
    const tunnel = mockTunnels.find(t => t.id === id)

    await delay(50)

    if (!tunnel) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Tunnel not found',
          },
        },
        { status: 404 }
      )
    }

    return HttpResponse.json({
      success: true,
      data: { tunnel },
    })
  }),

  // 缺陷分析
  http.post('*/api/v1/defects/analyze', async ({ request }) => {
    await delay(1000) // 模拟分析耗时

    // 验证请求包含 tunnel_id
    const formData = await request.formData()
    const tunnelId = formData.get('tunnel_id')
    const file = formData.get('file')

    if (!file) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: '未上传图片文件',
          },
        },
        { status: 400 }
      )
    }

    if (!tunnelId) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: '未选择隧道',
          },
        },
        { status: 400 }
      )
    }

    // 返回模拟分析结果
    return HttpResponse.json({
      success: true,
      data: {
        ...mockDefectRecord,
        tunnel_id: tunnelId,
      },
    })
  }),
]
