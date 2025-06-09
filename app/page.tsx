"use client"; // 声明这是一个 Client Side Render 的 Component. Next.js 默认使用 Server Side Render
import IndexPage from "@/app/index";
import React from "react";

const Page: React.FC = () => {


  return (

      <div>
     <IndexPage />
      </div>
  );
};

export default Page;

