import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
}

function Button({
  variant = "primary",
  style,
  children,
  ...props
}: ButtonProps) {
  const base = {
    border: "none",
    borderRadius: 8,
    padding: "10px 18px",
    fontSize: 13,
    fontWeight: 600,
    fontFamily: "'Nunito', sans-serif",
    cursor: "pointer",
  };

  const variants = {
    primary: { background: "#6c5ce7", color: "#fff" },
    secondary: {
      background: "#fff",
      color: "#999",
      border: "1px solid #e5e5ef",
      fontWeight: 400,
      padding: "4px 10px",
      fontSize: 11,
      borderRadius: 6,
    },
  };

  return (
    <button style={{ ...base, ...variants[variant], ...style }} {...props}>
      {children}
    </button>
  );
}

export default Button;
