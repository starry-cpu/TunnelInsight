import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import TunnelSelector from './TunnelSelector'
import type { Tunnel } from '../../types'

const mockTunnels: Tunnel[] = [
  {
    id: 'tunnel-1',
    user_id: 'user-1',
    project_id: 'project-1',
    name: '测试隧道A',
    location: '北京市朝阳区',
    total_defects: 5,
    unique_location_count: 3,
    health_index: 75,
    created_at: '2026-03-01T08:00:00Z',
    updated_at: '2026-03-01T08:00:00Z',
  },
  {
    id: 'tunnel-2',
    user_id: 'user-1',
    project_id: 'project-1',
    name: '测试隧道B',
    location: '上海市浦东新区',
    total_defects: 0,
    unique_location_count: 0,
    health_index: 100,
    created_at: '2026-03-01T09:00:00Z',
    updated_at: '2026-03-01T09:00:00Z',
  },
]

// Wrapper 组件，提供 Router 上下文
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
)

describe('TunnelSelector', () => {
  it('应渲染加载状态', () => {
    const { container } = render(
      <TestWrapper>
        <TunnelSelector
          tunnels={[]}
          selected={null}
          loading={true}
          onSelect={() => {}}
        />
      </TestWrapper>
    )

    expect(container.querySelector('.ant-spin')).toBeInTheDocument()
    expect(screen.getByText('加载隧道列表中...')).toBeInTheDocument()
  })

  it('应渲染隧道列表', () => {
    render(
      <TestWrapper>
        <TunnelSelector
          tunnels={mockTunnels}
          selected={null}
          loading={false}
          onSelect={() => {}}
        />
      </TestWrapper>
    )

    expect(screen.getByText('测试隧道A')).toBeInTheDocument()
    expect(screen.getByText('测试隧道B')).toBeInTheDocument()
    expect(screen.getByText('北京市朝阳区')).toBeInTheDocument()
    expect(screen.getByText('上海市浦东新区')).toBeInTheDocument()
  })

  it('点击隧道时应调用 onSelect', async () => {
    const user = userEvent.setup()
    const handleSelect = vi.fn()

    render(
      <TestWrapper>
        <TunnelSelector
          tunnels={mockTunnels}
          selected={null}
          loading={false}
          onSelect={handleSelect}
        />
      </TestWrapper>
    )

    const tunnelButton = screen.getByRole('radio', { name: /测试隧道A/ })
    await user.click(tunnelButton)

    expect(handleSelect).toHaveBeenCalledWith(mockTunnels[0])
    expect(handleSelect).toHaveBeenCalledTimes(1)
  })

  it('应高亮选中的隧道', () => {
    render(
      <TestWrapper>
        <TunnelSelector
          tunnels={mockTunnels}
          selected={mockTunnels[0]}
          loading={false}
          onSelect={() => {}}
        />
      </TestWrapper>
    )

    const selectedRadio = screen.getByRole('radio', { name: /测试隧道A/ })
    expect(selectedRadio).toBeChecked()
  })

  it('无隧道时应显示空状态', () => {
    const { container } = render(
      <TestWrapper>
        <TunnelSelector
          tunnels={[]}
          selected={null}
          loading={false}
          onSelect={() => {}}
        />
      </TestWrapper>
    )

    expect(container.querySelector('.ant-empty')).toBeInTheDocument()
    expect(screen.getByText('暂无隧道')).toBeInTheDocument()
    expect(screen.getByText('请先创建隧道后再进行分析')).toBeInTheDocument()
  })

  it('无隧道时点击按钮应跳转到 Dashboard', async () => {
    const user = userEvent.setup()

    render(
      <BrowserRouter>
        <TunnelSelector
          tunnels={[]}
          selected={null}
          loading={false}
          onSelect={() => {}}
        />
      </BrowserRouter>
    )

    const createButton = screen.getByRole('button', { name: /前往创建隧道/ })
    await user.click(createButton)

    // 验证 URL 已改变
    expect(window.location.pathname).toBe('/dashboard')
  })
})
