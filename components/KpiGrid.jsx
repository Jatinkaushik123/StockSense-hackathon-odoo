function KpiCard({ label, value, sub, tone = '' }) {
  return (
    <div className={`kpi-card ${tone}`.trim()}>
      <p className="kpi-label">{label}</p>
      <p className="kpi-value">{value}</p>
      {sub ? <p className="kpi-sub">{sub}</p> : null}
    </div>
  );
}

export default function KpiGrid({ kpis }) {
  return (
    <section className="kpi-grid" aria-label="Key performance indicators">
      <KpiCard
        label="Products in stock"
        value={kpis.productsInStock}
        sub={`of ${kpis.totalSkus} catalog items`}
      />
      <KpiCard label="Units on hand" value={Number(kpis.totalUnits).toLocaleString()} sub="internal zones only" />
      <KpiCard
        label="Low stock"
        value={kpis.lowStock.filter((item) => !item.isOutOfStock).length}
        sub="at or below min alert"
        tone="warn"
      />
      <KpiCard
        label="Out of stock"
        value={kpis.lowStock.filter((item) => item.isOutOfStock).length}
        sub="needs replenishment"
        tone="danger"
      />
      <KpiCard label="Pending receipts" value={kpis.pendingReceipts} sub="Draft or Waiting" tone="info" />
      <KpiCard label="Pending deliveries" value={kpis.pendingDeliveries} sub="Draft or Waiting" tone="info" />
      <KpiCard label="Scheduled transfers" value={kpis.scheduledTransfers} sub="Draft → Ready" tone="info" />
      <KpiCard label="Moves today" value={kpis.movesToday} sub={`${kpis.movesTotal} lifetime ledger rows`} />
    </section>
  );
}
