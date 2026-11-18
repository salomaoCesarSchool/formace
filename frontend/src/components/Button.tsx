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
    // Azul primario do Figma (botao preenchido).
    primary: { background: "#1a5fa8", color: "#fff" },
    // Contorno do Figma: fundo branco, borda cinza e texto azul.
    secondary: {
      background: "#fff",
      color: "#1a5fa8",
      border: "1px solid #cbd5e1",
      fontWeight: 600,
      padding: "7px 14px",
      fontSize: 12,
      borderRadius: 8,
    },
  };

  return (
    <button style={{ ...base, ...variants[variant], ...style }} {...props}>
      {children}
    </button>
  );
}

export default Button;
