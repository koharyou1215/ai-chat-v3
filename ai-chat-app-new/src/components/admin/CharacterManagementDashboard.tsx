'use client';

/**
 * Character Management Dashboard
 *
 * Provides a comprehensive interface for managing character files:
 * - Duplicate detection and resolution
 * - Integrity checking and auto-fixing
 * - Manifest regeneration
 * - Statistics and reporting
 */

import { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface DiagnosticsSummary {
  totalFiles: number;
  duplicatesFound: number;
  integrityIssues: number;
  criticalIssues: number;
  warningIssues: number;
  autoFixableCount: number;
}

interface DuplicateReport {
  type: 'id' | 'name' | 'content-hash';
  severity: 'error' | 'warning';
  value: string;
  files: Array<{
    filename: string;
    path: string;
    filesize: number;
    lastModified: number;
  }>;
  autoFixable: boolean;
  suggestedAction: string;
  details?: string;
}

interface IntegrityError {
  file: string;
  field: string;
  message: string;
  severity: 'error' | 'warning';
  autoFixable: boolean;
  suggestedFix?: string;
}

interface IntegrityReport {
  file: string;
  errors: IntegrityError[];
  hasBOM: boolean;
  isValidJSON: boolean;
  passesSchemaValidation: boolean;
  filesizeKB: number;
  lastModified: number;
}

interface DiagnosticsData {
  summary: DiagnosticsSummary;
  duplicates: {
    reports: DuplicateReport[];
  };
  integrity: {
    reports: IntegrityReport[];
  };
}

export function CharacterManagementDashboard() {
  const [loading, setLoading] = useState(false);
  const [diagnostics, setDiagnostics] = useState<DiagnosticsData | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'duplicates' | 'integrity'>('overview');

  useEffect(() => {
    // Auto-run diagnostics on mount
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/characters/diagnostics');
      const data = await response.json();

      if (data.success) {
        setDiagnostics(data);
        toast.success(
          `診断完了: ${data.summary.duplicatesFound}件の重複、${data.summary.integrityIssues}件の整合性問題を検出`
        );
      } else {
        toast.error(`診断失敗: ${data.error}`);
      }
    } catch (error) {
      toast.error(`診断エラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
    } finally {
      setLoading(false);
    }
  };

  const autoFixAll = async () => {
    if (!diagnostics) return;

    const confirmed = window.confirm(
      `${diagnostics.summary.autoFixableCount}件の問題を自動修正しますか？\n\n` +
        '修正内容:\n' +
        '- BOMの除去\n' +
        '- 欠落IDの追加\n' +
        '- トラッカー型の修正\n' +
        '- 重複ファイルの削除（コンテンツハッシュ重複のみ）'
    );

    if (!confirmed) return;

    setLoading(true);
    try {
      const response = await fetch('/api/admin/characters/diagnostics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fixDuplicates: true,
          fixIntegrity: true,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const totalFixed = data.duplicates.fixed + data.integrity.fixed;
        const totalFailed = data.duplicates.failed + data.integrity.failed;

        toast.success(`✅ ${totalFixed}件の問題を修正しました`);

        if (totalFailed > 0) {
          toast.warning(`⚠️ ${totalFailed}件の修正に失敗しました`);
        }

        // Refresh diagnostics
        await runDiagnostics();
      } else {
        toast.error(`自動修正失敗: ${data.error}`);
      }
    } catch (error) {
      toast.error(`修正エラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
    } finally {
      setLoading(false);
    }
  };

  const regenerateManifest = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/characters/manifest', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        toast.success('✅ Manifestファイルを再生成しました');
        await runDiagnostics(); // Refresh diagnostics
      } else {
        toast.error(`Manifest再生成失敗: ${data.error}`);
      }
    } catch (error) {
      toast.error(`エラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
    } finally {
      setLoading(false);
    }
  };

  if (!diagnostics) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">診断を実行中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="character-management-dashboard p-6 max-w-7xl mx-auto">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">キャラクター管理ダッシュボード</h1>
        <p className="text-muted-foreground">
          キャラクターファイルの重複検出、整合性チェック、自動修正を行います
        </p>

        <div className="flex gap-3 mt-6">
          <button
            onClick={runDiagnostics}
            disabled={loading}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '診断中...' : '🔍 診断実行'}
          </button>
          <button
            onClick={autoFixAll}
            disabled={loading || diagnostics.summary.autoFixableCount === 0}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🔧 自動修正 ({diagnostics.summary.autoFixableCount}件)
          </button>
          <button
            onClick={regenerateManifest}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            📝 Manifest再生成
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-border mb-6">
        <nav className="flex gap-8">
          {[
            { id: 'overview', label: '概要' },
            { id: 'duplicates', label: `重複 (${diagnostics.summary.duplicatesFound})` },
            { id: 'integrity', label: `整合性 (${diagnostics.summary.integrityIssues})` },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`pb-3 px-1 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary font-medium'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              title="総ファイル数"
              value={diagnostics.summary.totalFiles}
              icon="📂"
              variant="default"
            />
            <StatCard
              title="重複検出"
              value={diagnostics.summary.duplicatesFound}
              icon="🔴"
              variant={diagnostics.summary.duplicatesFound > 0 ? 'warning' : 'success'}
            />
            <StatCard
              title="整合性問題"
              value={diagnostics.summary.integrityIssues}
              icon="⚠️"
              variant={diagnostics.summary.integrityIssues > 0 ? 'warning' : 'success'}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StatCard
              title="重大な問題"
              value={diagnostics.summary.criticalIssues}
              icon="🚨"
              variant={diagnostics.summary.criticalIssues > 0 ? 'error' : 'success'}
            />
            <StatCard
              title="自動修正可能"
              value={diagnostics.summary.autoFixableCount}
              icon="🔧"
              variant="info"
            />
          </div>

          {diagnostics.summary.criticalIssues === 0 &&
            diagnostics.summary.duplicatesFound === 0 &&
            diagnostics.summary.integrityIssues === 0 && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 text-center">
                <div className="text-6xl mb-4">✅</div>
                <h3 className="text-xl font-semibold text-green-900 dark:text-green-100 mb-2">
                  すべてのチェックに合格しました！
                </h3>
                <p className="text-green-700 dark:text-green-300">
                  キャラクターファイルに問題は見つかりませんでした
                </p>
              </div>
            )}
        </div>
      )}

      {/* Duplicates Tab */}
      {activeTab === 'duplicates' && (
        <div className="space-y-4">
          {diagnostics.duplicates.reports.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="text-4xl mb-4">✅</div>
              <p>重複は検出されませんでした</p>
            </div>
          ) : (
            diagnostics.duplicates.reports.map((report, idx) => (
              <DuplicateCard key={idx} report={report} />
            ))
          )}
        </div>
      )}

      {/* Integrity Tab */}
      {activeTab === 'integrity' && (
        <div className="space-y-4">
          {diagnostics.integrity.reports.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="text-4xl mb-4">✅</div>
              <p>整合性の問題は検出されませんでした</p>
            </div>
          ) : (
            diagnostics.integrity.reports.map((report, idx) => (
              <IntegrityCard key={idx} report={report} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// Stat Card Component
function StatCard({
  title,
  value,
  icon,
  variant = 'default',
}: {
  title: string;
  value: number;
  icon: string;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
}) {
  const variantStyles = {
    default: 'bg-card border-border',
    success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
    error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
  };

  return (
    <div className={`p-6 rounded-lg border ${variantStyles[variant]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          <p className="text-3xl font-bold">{value}</p>
        </div>
        <div className="text-4xl">{icon}</div>
      </div>
    </div>
  );
}

// Duplicate Card Component
function DuplicateCard({ report }: { report: DuplicateReport }) {
  const severityColors = {
    error: 'border-red-500 bg-red-50 dark:bg-red-900/20',
    warning: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20',
  };

  const typeLabels = {
    id: 'ID重複',
    name: '名前重複',
    'content-hash': 'コンテンツ重複',
  };

  return (
    <div className={`border-l-4 rounded-lg p-4 ${severityColors[report.severity]}`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="font-semibold text-lg">
            {report.severity === 'error' ? '🔴' : '🟡'} {typeLabels[report.type]}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">値: {report.value}</p>
        </div>
        {report.autoFixable && (
          <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 text-xs rounded">
            自動修正可能
          </span>
        )}
      </div>

      {report.details && (
        <p className="text-sm mb-3 text-muted-foreground">{report.details}</p>
      )}

      <div className="space-y-2">
        <p className="text-sm font-medium">影響ファイル:</p>
        {report.files.map((file, idx) => (
          <div
            key={idx}
            className="text-sm bg-background/50 p-2 rounded border border-border"
          >
            <div className="flex justify-between items-center">
              <span className="font-mono">{file.filename}</span>
              <span className="text-xs text-muted-foreground">
                {(file.filesize / 1024).toFixed(1)}KB
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 text-sm">
        <span className="font-medium">推奨アクション:</span>{' '}
        <span className="text-muted-foreground">{report.suggestedAction}</span>
      </div>
    </div>
  );
}

// Integrity Card Component
function IntegrityCard({ report }: { report: IntegrityReport }) {
  return (
    <div className="border rounded-lg p-4 bg-card">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-lg">📄 {report.file}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {report.filesizeKB}KB • {report.errors.length}件のエラー
          </p>
        </div>
        <div className="flex gap-2">
          {report.hasBOM && (
            <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 text-xs rounded">
              BOM
            </span>
          )}
          {!report.isValidJSON && (
            <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 text-xs rounded">
              無効なJSON
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {report.errors.map((error, idx) => (
          <div
            key={idx}
            className={`p-3 rounded border ${
              error.severity === 'error'
                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {error.severity === 'error' ? '❌' : '⚠️'} {error.field}
                </p>
                <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
                {error.suggestedFix && (
                  <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                    💡 {error.suggestedFix}
                  </p>
                )}
              </div>
              {error.autoFixable && (
                <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 text-xs rounded whitespace-nowrap">
                  自動修正可能
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
