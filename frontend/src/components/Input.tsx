import { InputHTMLAttributes } from "react";

function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 8,
        padding: "8px 12px",
        fontSize: 13,
        fontFamily: "'Nunito', sans-serif",
        ...props.style,
      }}
    />
  );
}

export default Input;
