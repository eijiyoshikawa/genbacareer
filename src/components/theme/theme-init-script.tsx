/**
 * SSR 段階で <html> に .dark クラスを当てるための flicker 防止スクリプト。
 * layout の <head> 内で dangerouslySetInnerHTML として inline する。
 * React のハイドレーション前に同期実行されることが重要。
 */
export function ThemeInitScript() {
  const code = `(function(){try{var s=localStorage.getItem('theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;var r=(s==='dark')||((s==='system'||!s)&&d);if(r)document.documentElement.classList.add('dark');}catch(e){}})();`
  return <script dangerouslySetInnerHTML={{ __html: code }} />
}
