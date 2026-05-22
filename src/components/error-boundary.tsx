"use client"

/**
 * セクション単位の React Error Boundary。
 *
 * Next.js App Router の error.tsx は「ルートセグメント単位」のフォールバックなので、
 * 1 ページ内の複数の独立した非クリティカルなセクション（チャート / 動画 / 外部 API 連動 UI）を
 * 個別に守りたいときはこのコンポーネントで包む。
 *
 * 例: <ClientErrorBoundary name="funnel-chart"><FunnelChart .../></ClientErrorBoundary>
 *
 * エラーが起きると Sentry に送信し、コンパクトな代替 UI を表示する。
 */

import { Component, type ReactNode, type ErrorInfo } from "react"
import * as Sentry from "@sentry/nextjs"
import { AlertTriangle } from "lucide-react"

interface Props {
  /** Sentry にタグとして送るセクション名 */
  name?: string
  fallback?: ReactNode
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ClientErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    Sentry.captureException(error, {
      tags: {
        boundary: "section",
        section: this.props.name ?? "unknown",
      },
      extra: { componentStack: info.componentStack },
    })
  }

  reset = (): void => {
    this.setState({ hasError: false, error: null })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback !== undefined) return this.props.fallback
      return (
        <div
          role="alert"
          className="flex items-start gap-3 border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
        >
          <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-bold">
              このセクションを表示できませんでした。
            </p>
            <p className="mt-1 text-xs leading-relaxed">
              他の機能は通常通りお使いいただけます。問題が続く場合は時間をおいて再度お試しください。
            </p>
            <button
              type="button"
              onClick={this.reset}
              className="mt-3 inline-flex items-center gap-1 border border-amber-300 bg-white hover:bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800"
            >
              再表示する
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
