interface AvatarProps {
  name: string;
  size?: number;
  className?: string;
  title?: string;
  /** When set, draws a 2px ring of this color around the avatar. */
  ringColor?: string;
}

export function Avatar({
  name,
  size = 40,
  className = "",
  title,
  ringColor,
}: AvatarProps) {
  const seed = encodeURIComponent(name.toLowerCase());
  // Deterministic pastel background per seed — DiceBear picks one from the list.
  const url = `https://api.dicebear.com/9.x/lorelei/svg?seed=${seed}&backgroundColor=ffe8c2,c0aede,b6e3f4,d1d4f9,ffd5dc,a6dadc&backgroundType=solid`;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={name}
      title={title ?? name}
      width={size}
      height={size}
      className={`rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        ...(ringColor
          ? { boxShadow: `0 0 0 2px ${ringColor}` }
          : {}),
      }}
    />
  );
}
