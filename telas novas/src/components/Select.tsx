import { SelectHTMLAttributes } from "react";

function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      style={{
        border: "1px solid #e5e5ef",
        borderRadius: 8,
        padding: "8px 12px",
        fontSize: 13,
        color: "#888",
        fontFamily: "'Nunito', sans-serif",
        ...props.style,
      }}
    >
      {props.children}
    </select>
  );
}

export default Select;
