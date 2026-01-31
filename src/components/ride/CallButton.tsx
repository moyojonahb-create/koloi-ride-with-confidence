type CallButtonProps = {
  phone: string;
  label?: string;
  className?: string;
};

export function CallButton({ phone, label = "📞 Call", className }: CallButtonProps) {
  if (!phone) return null;

  // Normalize phone number
  const normalizedPhone = phone.replace(/[^\d+]/g, "");

  return (
    <a
      href={`tel:${normalizedPhone}`}
      className={className}
      style={{
        padding: "12px 16px",
        borderRadius: 12,
        background: "hsl(var(--primary))",
        color: "hsl(var(--primary-foreground))",
        fontWeight: 700,
        textAlign: "center",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        textDecoration: "none",
      }}
    >
      {label}
    </a>
  );
}
