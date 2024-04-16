'use client'
import React, { useState, useEffect } from 'react';

function ResponsiveComponent() {
  // 初始化为 null 或提供一个合理的服务器端默认值
  const [isMobile, setIsMobile] = useState(null);

  useEffect(() => {
    // 初始设置，因为 useEffect 只在客户端执行
    setIsMobile(window.innerWidth < 768);

    function handleResize() {
      setIsMobile(window.innerWidth < 768);
    }

    window.addEventListener('resize', handleResize);

    // 清理函数
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []); // 空依赖数组确保只执行一次

  // 当 isMobile 为 null 时（如服务器端渲染），你可以选择不显示组件或显示一个加载状态
  if (isMobile === null) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {isMobile ? (
        <p>The window is less than 768 pixels wide. This is likely a mobile device.</p>
      ) : (
        <p>The window is 768 pixels wide or wider. This is likely a desktop or large tablet.</p>
      )}
    </div>
  );
}

export default ResponsiveComponent;
