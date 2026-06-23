import { Suspense } from "react";
import { AdminLoginForm } from "@/components/admin-login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <section className="w-full max-w-md rounded border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-cyan-700">后台访问保护</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-950">GEO AI 搜索可见度监测平台</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          请输入本地 `.env` 中配置的 `ADMIN_PASSWORD`。客户分享链接不受此后台密码影响。
        </p>
        <Suspense fallback={<p className="mt-6 text-sm text-slate-500">正在加载登录表单...</p>}>
          <AdminLoginForm />
        </Suspense>
      </section>
    </main>
  );
}
