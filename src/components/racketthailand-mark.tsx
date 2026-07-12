type RacketThailandMarkProps = {
  className: string;
};

export function RacketThailandMark({
  className,
}: RacketThailandMarkProps) {
  return (
    <span
      aria-hidden
      className={className}
      style={{
        backgroundImage: "url('/brand/racketthailand-rally-gap-mark.svg')",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
      }}
    />
  );
}
