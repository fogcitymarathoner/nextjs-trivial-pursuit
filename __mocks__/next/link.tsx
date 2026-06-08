import React from 'react';

const MockNextLink = ({ children, href }: { children: React.ReactNode; href: string }) => {
  return <a href={href}>{children}</a>;
};

export default MockNextLink;