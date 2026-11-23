"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

type PasswordInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  /** 入力欄のクラス。未指定時はログインフォーム標準のスタイルを適用 */
  className?: string;
};

/**
 * パスワード入力欄 + 表示/非表示トグル（目アイコン）。
 *
 * 入力中の値が正しいか確認できるよう、右端のボタンで平文表示を切り替える。
 * `type` 以外の input 属性（value/onChange/required/placeholder 等）はそのまま渡せる。
 */
export function PasswordInput({ className, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  const baseClass =
    "mt-1 block w-full border border-gray-300 px-3 py-2 pr-10 text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500";

  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={className ?? baseClass}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "パスワードを隠す" : "パスワードを表示"}
        aria-pressed={visible}
        tabIndex={-1}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600 focus:outline-none focus:text-primary-600"
      >
        {visible ? (
          <EyeOff className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Eye className="h-4 w-4" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
