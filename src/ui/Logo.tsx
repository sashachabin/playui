export function Logo({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M4.8 8.6V6.9c0-1.05.85-1.9 1.9-1.9h2.1M4.8 15.4v1.7c0 1.05.85 1.9 1.9 1.9h2.1"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M10.6 7.1c0-.95 1.05-1.55 1.85-1.05l7.6 4.9c.8.5.8 1.6 0 2.1l-7.6 4.9c-.8.5-1.85-.1-1.85-1.05V7.1Z"
        fill="currentColor"
      />
    </svg>
  );
}
