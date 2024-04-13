"use client"; // 声明这是一个 Client Side Render 的 Component. Next.js 默认使用 Server Side Render
import IndexPage from "@/app/index";

const page = () => {


  return (
      <div>
     <IndexPage />
      </div>
  );
};

export default page;

