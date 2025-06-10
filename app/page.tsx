"use client"; // 声明这是一个 Client Side Render 的 Component. Next.js 默认使用 Server Side Render
import IndexPage from "@/app/index";
import React, { Suspense } from "react";

// 添加一个 loading 组件当 Suspense 触发时显示
const Loading = () => (
  <div className="w-full h-screen flex justify-center items-center bg-slate-900">
    <svg className="animate-spin text-sky-400 h-12 w-12" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  </div>
);

const Page: React.FC = () => {
  return (
    <Suspense fallback={<Loading />}>
      <IndexPage />
    </Suspense>
  );
};

export default Page;

