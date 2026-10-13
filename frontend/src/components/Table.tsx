import type { ReactNode } from "react";

interface Column<T> {
  header: string;
  render: (row: T) => ReactNode;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  emptyMessage?: string;
}

function Table<T>({
  columns,
  data,
  emptyMessage = "Nenhum registro encontrado",
}: TableProps<T>) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ color: "#999", fontSize: 12, textAlign: "left" }}>
          {columns.map((col, i) => (
            <th key={i} style={{ fontWeight: 400, paddingBottom: 10 }}>
              {col.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => (
          <tr
            key={i}
            style={{
              fontSize: 13,
              color: "#999",
              borderTop: "1px solid #f0f0f5",
            }}
          >
            {columns.map((col, j) => (
              <td key={j} style={{ padding: "10px 0" }}>
                {col.render(row)}
              </td>
            ))}
          </tr>
        ))}
        {data.length === 0 && (
          <tr>
            <td
              colSpan={columns.length}
              style={{
                padding: "20px 0",
                textAlign: "center",
                color: "#bbb",
                fontSize: 13,
              }}
            >
              {emptyMessage}
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

export default Table;
