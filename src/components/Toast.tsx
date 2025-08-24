import React, { useEffect } from "react";
import { createPortal } from "react-dom";

export type ToastProps = {
  type: "success" | "error";
  message: string;
  duration?: number; // ms
  onClose?: () => void;
};

const Toast: React.FC<ToastProps> = ({ type, message, duration = 3000, onClose }) => {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      onClose?.();
    }, duration);
    return () => window.clearTimeout(timer);
  }, [duration, onClose]);

  const baseClasses =
    "fixed right-4 bottom-4 z-50 max-w-sm rounded-md px-4 py-3 shadow-lg border";
  const colorClasses =
    type === "success"
      ? "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/30 dark:text-green-200 dark:border-green-700"
      : "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/30 dark:text-red-200 dark:border-red-700";

  const node = (
    <div className={`${baseClasses} ${colorClasses}`}>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{message}</span>
      </div>
    </div>
  );

  return createPortal(node, document.body);
};

export default Toast;
