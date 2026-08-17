import React from 'react';

export default function AdminAvatar({ user, size = 40 }) {
  const name = user?.isVisitor ? 'V' : (user?.name?.charAt(0)?.toUpperCase() || '?');
  if (!user?.isVisitor && user?.profilePic) {
    return <img className="admin-avatar" src={user.profilePic} alt="" style={{ width: size, height: size }} />;
  }
  return (
    <div
      className={`admin-avatar admin-avatar-fallback${user?.isVisitor ? ' is-visitor' : ''}`}
      style={{ width: size, height: size, fontSize: size < 36 ? 12 : 14 }}
    >
      {name}
    </div>
  );
}
