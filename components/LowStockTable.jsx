export default function LowStockTable({ items }) {
  if (!items || items.length === 0) {
    return <p className="empty">Every product is above its minimum alert threshold. 🎉</p>;
  }

  return (
    <div className="table-wrap">
      <table className="data rtable">
        <thead>
          <tr>
            <th>Product</th>
            <th>SKU</th>
            <th>Category</th>
            <th className="num">On hand</th>
            <th className="num">Min alert</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td data-label="Product">{item.name}</td>
              <td data-label="SKU"><code>{item.sku}</code></td>
              <td data-label="Category">{item.category}</td>
              <td className="num" data-label="On hand">
                {item.onHand} {item.uom}
              </td>
              <td className="num" data-label="Min alert">
                {item.min_stock_alert}
              </td>
              <td data-label="Status">
                {item.isOutOfStock ? (
                  <span className="badge badge-out">Out of stock</span>
                ) : (
                  <span className="badge badge-low">Low stock</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
