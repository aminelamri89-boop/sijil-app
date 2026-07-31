import React, { useState, useEffect, useMemo } from "react";
import { Smartphone, Laptop, Tablet, Plus, X, TrendingUp, Package, CheckCircle2, Trash2, Search } from "lucide-react";

const CATS = {
  phone: { label: "هاتف", icon: Smartphone },
  laptop: { label: "حاسوب", icon: Laptop },
  tablet: { label: "لوحي", icon: Tablet },
};

function fmt(n) {
  return new Intl.NumberFormat("ar-DZ").format(Math.round(n || 0)) + " دج";
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export default function App() {
  const [devices, setDevices] = useState([]);
  const [sales, setSales] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("inventory");
  const [showAdd, setShowAdd] = useState(false);
  const [soldFor, setSoldFor] = useState(null);
  const [query, setQuery] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const d = await window.storage.get("devices");
        if (d) setDevices(JSON.parse(d.value));
      } catch (e) {}
      try {
        const s = await window.storage.get("sales");
        if (s) setSales(JSON.parse(s.value));
      } catch (e) {}
      setLoaded(true);
    })();
  }, []);

  async function persistDevices(next) {
    setDevices(next);
    try {
      await window.storage.set("devices", JSON.stringify(next));
    } catch (e) {
      setErr("تعذر حفظ البيانات");
    }
  }

  async function persistSales(next) {
    setSales(next);
    try {
      await window.storage.set("sales", JSON.stringify(next));
    } catch (e) {
      setErr("تعذر حفظ البيانات");
    }
  }

  function addDevice(dev) {
    const next = [{ ...dev, id: uid(), status: "available", dateAdded: Date.now() }, ...devices];
    persistDevices(next);
    setShowAdd(false);
  }

  function markSold(id, price, buyer) {
    const dev = devices.find((d) => d.id === id);
    if (!dev) return;
    const nextDevices = devices.map((d) => (d.id === id ? { ...d, status: "sold" } : d));
    const sale = {
      id: uid(),
      deviceId: id,
      name: dev.name,
      category: dev.category,
      buyPrice: dev.buyPrice,
      sellPrice: price,
      buyer: buyer || "",
      date: Date.now(),
    };
    persistDevices(nextDevices);
    persistSales([sale, ...sales]);
    setSoldFor(null);
  }

  function removeDevice(id) {
    persistDevices(devices.filter((d) => d.id !== id));
  }

  const available = useMemo(() => devices.filter((d) => d.status === "available"), [devices]);
  const stats = useMemo(() => {
    const invValue = available.reduce((s, d) => s + Number(d.buyPrice || 0), 0);
    const invSellValue = available.reduce((s, d) => s + Number(d.sellPrice || 0), 0);
    const profit = sales.reduce((s, x) => s + (Number(x.sellPrice || 0) - Number(x.buyPrice || 0)), 0);
    const thisMonth = new Date();
    const monthSales = sales.filter((s) => {
      const d = new Date(s.date);
      return d.getMonth() === thisMonth.getMonth() && d.getFullYear() === thisMonth.getFullYear();
    });
    return {
      count: available.length,
      invValue,
      invSellValue,
      profit,
      soldCount: sales.length,
      monthCount: monthSales.length,
      monthProfit: monthSales.reduce((s, x) => s + (Number(x.sellPrice || 0) - Number(x.buyPrice || 0)), 0),
    };
  }, [available, sales]);

  const filtered = useMemo(() => {
    return available.filter((d) => {
      if (filterCat !== "all" && d.category !== filterCat) return false;
      if (query && !d.name.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [available, filterCat, query]);

  return (
    <div dir="rtl" style={styles.app}>
      <style>{css}</style>

      <div style={styles.ticker}>
        <div style={styles.tickerInner}>
          <span style={styles.tickerItem}>
            <Package size={13} /> {stats.count} قطعة متوفرة
          </span>
          <span style={styles.tickerDot}>•</span>
          <span style={styles.tickerItem}>قيمة المخزون {fmt(stats.invValue)}</span>
          <span style={styles.tickerDot}>•</span>
          <span style={{ ...styles.tickerItem, color: "var(--signal)" }}>
            <TrendingUp size={13} /> ربح الشهر {fmt(stats.monthProfit)}
          </span>
        </div>
      </div>

      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>سِجِل</h1>
          <p style={styles.subtitle}>إدارة مخزون الهواتف والحواسيب</p>
        </div>
        <button style={styles.addBtn} onClick={() => setShowAdd(true)}>
          <Plus size={18} /> إضافة قطعة
        </button>
      </header>

      <nav style={styles.tabs}>
        {[
          ["inventory", "المخزون"],
          ["sales", "المبيعات"],
        ].map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            style={{ ...styles.tabBtn, ...(tab === k ? styles.tabBtnActive : {}) }}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === "inventory" && (
        <div style={styles.section}>
          <div style={styles.toolbar}>
            <div style={styles.searchWrap}>
              <Search size={16} color="var(--muted)" />
              <input
                style={styles.searchInput}
                placeholder="بحث عن قطعة..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div style={styles.chips}>
              {[["all", "الكل"], ...Object.entries(CATS).map(([k, v]) => [k, v.label])].map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setFilterCat(k)}
                  style={{ ...styles.chip, ...(filterCat === k ? styles.chipActive : {}) }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {loaded && filtered.length === 0 && (
            <div style={styles.empty}>
              <Package size={32} color="var(--muted)" />
              <p style={{ margin: "8px 0 4px", color: "var(--muted)" }}>لا توجد قطع مطابقة</p>
              <button style={styles.emptyBtn} onClick={() => setShowAdd(true)}>
                أضف أول قطعة
              </button>
            </div>
          )}

          <div style={styles.grid}>
            {filtered.map((d) => {
              const Icon = CATS[d.category]?.icon || Package;
              const margin = Number(d.sellPrice || 0) - Number(d.buyPrice || 0);
              return (
                <div key={d.id} style={styles.card}>
                  <div style={styles.cardTop}>
                    <div style={styles.cardIcon}>
                      <Icon size={20} color="var(--signal)" />
                    </div>
                    <button style={styles.iconBtn} onClick={() => removeDevice(d.id)} title="حذف">
                      <Trash2 size={15} color="var(--muted)" />
                    </button>
                  </div>
                  <div style={styles.cardName}>{d.name}</div>
                  <div style={styles.cardCat}>{CATS[d.category]?.label}</div>
                  <div style={styles.priceRow}>
                    <span style={styles.priceLabel}>الشراء</span>
                    <span style={styles.priceVal}>{fmt(d.buyPrice)}</span>
                  </div>
                  <div style={styles.priceRow}>
                    <span style={styles.priceLabel}>البيع المقترح</span>
                    <span style={styles.priceVal}>{fmt(d.sellPrice)}</span>
                  </div>
                  <div style={styles.marginRow}>
                    <span>هامش الربح المتوقع</span>
                    <b style={{ color: margin >= 0 ? "var(--signal)" : "var(--danger)" }}>{fmt(margin)}</b>
                  </div>
                  <button style={styles.soldBtn} onClick={() => setSoldFor(d)}>
                    <CheckCircle2 size={16} /> تم البيع
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "sales" && (
        <div style={styles.section}>
          <div style={styles.statsRow}>
            <div style={styles.statCard}>
              <span style={styles.statLabel}>عدد المبيعات</span>
              <span style={styles.statVal}>{stats.soldCount}</span>
            </div>
            <div style={styles.statCard}>
              <span style={styles.statLabel}>إجمالي الربح</span>
              <span style={{ ...styles.statVal, color: "var(--signal)" }}>{fmt(stats.profit)}</span>
            </div>
            <div style={styles.statCard}>
              <span style={styles.statLabel}>مبيعات هذا الشهر</span>
              <span style={styles.statVal}>{stats.monthCount}</span>
            </div>
          </div>

          {sales.length === 0 ? (
            <div style={styles.empty}>
              <TrendingUp size={32} color="var(--muted)" />
              <p style={{ margin: "8px 0 4px", color: "var(--muted)" }}>لا توجد مبيعات بعد</p>
            </div>
          ) : (
            <div style={styles.salesList}>
              {sales.map((s) => {
                const margin = Number(s.sellPrice) - Number(s.buyPrice);
                return (
                  <div key={s.id} style={styles.saleRow}>
                    <div>
                      <div style={styles.cardName}>{s.name}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>
                        {new Date(s.date).toLocaleDateString("ar-DZ")}
                        {s.buyer ? ` — ${s.buyer}` : ""}
                      </div>
                    </div>
                    <div style={{ textAlign: "left" }}>
                      <div style={styles.priceVal}>{fmt(s.sellPrice)}</div>
                      <div style={{ fontSize: 12, color: margin >= 0 ? "var(--signal)" : "var(--danger)" }}>
                        {margin >= 0 ? "+" : ""}
                        {fmt(margin)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {showAdd && <AddModal onClose={() => setShowAdd(false)} onSave={addDevice} />}
      {soldFor && <SoldModal device={soldFor} onClose={() => setSoldFor(null)} onConfirm={markSold} />}
      {err && <div style={styles.errToast}>{err}</div>}
    </div>
  );
}

function AddModal({ onClose, onSave }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("phone");
  const [buyPrice, setBuyPrice] = useState("");
  const [sellPrice, setSellPrice] = useState("");

  function submit() {
    if (!name.trim() || !buyPrice) return;
    onSave({ name: name.trim(), category, buyPrice: Number(buyPrice), sellPrice: Number(sellPrice || buyPrice) });
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHead}>
          <h3 style={{ margin: 0 }}>إضافة قطعة جديدة</h3>
          <button style={styles.iconBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <label style={styles.label}>نوع القطعة</label>
        <div style={styles.chips}>
          {Object.entries(CATS).map(([k, v]) => (
            <button
              key={k}
              onClick={() => setCategory(k)}
              style={{ ...styles.chip, ...(category === k ? styles.chipActive : {}) }}
            >
              {v.label}
            </button>
          ))}
        </div>

        <label style={styles.label}>اسم القطعة (مثال: Samsung Galaxy S21 Plus)</label>
        <input style={styles.input} value={name} onChange={(e) => setName(e.target.value)} autoFocus />

        <label style={styles.label}>سعر الشراء (دج)</label>
        <input style={styles.input} type="number" value={buyPrice} onChange={(e) => setBuyPrice(e.target.value)} />

        <label style={styles.label}>سعر البيع المقترح (دج)</label>
        <input style={styles.input} type="number" value={sellPrice} onChange={(e) => setSellPrice(e.target.value)} />

        <button style={styles.primaryBtn} onClick={submit} disabled={!name.trim() || !buyPrice}>
          حفظ القطعة
        </button>
      </div>
    </div>
  );
}

function SoldModal({ device, onClose, onConfirm }) {
  const [price, setPrice] = useState(device.sellPrice || device.buyPrice);
  const [buyer, setBuyer] = useState("");

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHead}>
          <h3 style={{ margin: 0 }}>تأكيد البيع — {device.name}</h3>
          <button style={styles.iconBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <label style={styles.label}>سعر البيع الفعلي (دج)</label>
        <input style={styles.input} type="number" value={price} onChange={(e) => setPrice(e.target.value)} autoFocus />

        <label style={styles.label}>اسم الزبون (اختياري)</label>
        <input style={styles.input} value={buyer} onChange={(e) => setBuyer(e.target.value)} />

        <div style={styles.marginPreview}>
          هامش الربح: <b style={{ color: "var(--signal)" }}>{fmt(Number(price) - Number(device.buyPrice))}</b>
        </div>

        <button style={styles.primaryBtn} onClick={() => onConfirm(device.id, Number(price), buyer)}>
          تأكيد البيع
        </button>
      </div>
    </div>
  );
}

const styles = {
  app: {
    minHeight: "100%",
    background: "var(--bg)",
    color: "var(--text)",
    fontFamily: "'Cairo', 'Tajawal', system-ui, sans-serif",
    paddingBottom: 40,
  },
  ticker: {
    background: "var(--surface2)",
    borderBottom: "1px solid var(--line)",
    overflow: "hidden",
    whiteSpace: "nowrap",
    padding: "6px 0",
  },
  tickerInner: { display: "flex", gap: 14, padding: "0 16px", fontSize: 12, color: "var(--muted)", alignItems: "center" },
  tickerItem: { display: "flex", alignItems: "center", gap: 5 },
  tickerDot: { opacity: 0.4 },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 16px 10px",
  },
  title: { margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: 0.5, color: "var(--text)" },
  subtitle: { margin: "2px 0 0", fontSize: 13, color: "var(--muted)" },
  addBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "var(--signal)",
    color: "#08211c",
    border: "none",
    borderRadius: 10,
    padding: "10px 14px",
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
  },
  tabs: { display: "flex", gap: 6, padding: "0 16px", marginTop: 8 },
  tabBtn: {
    flex: 1,
    padding: "10px 0",
    background: "transparent",
    border: "none",
    borderBottom: "2px solid transparent",
    color: "var(--muted)",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
  },
  tabBtnActive: { color: "var(--text)", borderBottom: "2px solid var(--signal)" },
  section: { padding: "16px" },
  toolbar: { display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 },
  searchWrap: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "var(--surface)",
    border: "1px solid var(--line)",
    borderRadius: 10,
    padding: "9px 12px",
  },
  searchInput: { background: "transparent", border: "none", outline: "none", color: "var(--text)", fontSize: 14, width: "100%" },
  chips: { display: "flex", gap: 6, flexWrap: "wrap" },
  chip: {
    padding: "6px 12px",
    borderRadius: 999,
    border: "1px solid var(--line)",
    background: "var(--surface)",
    color: "var(--muted)",
    fontSize: 12.5,
    cursor: "pointer",
    fontWeight: 600,
  },
  chipActive: { background: "var(--signal)", color: "#08211c", borderColor: "var(--signal)" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 },
  card: {
    background: "var(--surface)",
    border: "1px solid var(--line)",
    borderRadius: 14,
    padding: 14,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 9,
    background: "var(--surface2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtn: { background: "transparent", border: "none", cursor: "pointer", padding: 4 },
  cardName: { fontWeight: 700, fontSize: 14.5, marginTop: 2 },
  cardCat: { fontSize: 12, color: "var(--muted)", marginBottom: 4 },
  priceRow: { display: "flex", justifyContent: "space-between", fontSize: 12.5 },
  priceLabel: { color: "var(--muted)" },
  priceVal: { fontWeight: 700 },
  marginRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 12,
    color: "var(--muted)",
    borderTop: "1px dashed var(--line)",
    paddingTop: 6,
    marginTop: 2,
  },
  soldBtn: {
    marginTop: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    background: "var(--surface2)",
    border: "1px solid var(--line)",
    color: "var(--signal)",
    borderRadius: 9,
    padding: "8px 0",
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
  },
  empty: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "48px 0",
    textAlign: "center",
  },
  emptyBtn: {
    marginTop: 10,
    background: "var(--signal)",
    color: "#08211c",
    border: "none",
    borderRadius: 9,
    padding: "8px 16px",
    fontWeight: 700,
    cursor: "pointer",
  },
  statsRow: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 16 },
  statCard: {
    background: "var(--surface)",
    border: "1px solid var(--line)",
    borderRadius: 12,
    padding: "12px 10px",
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  statLabel: { fontSize: 11, color: "var(--muted)" },
  statVal: { fontSize: 18, fontWeight: 800 },
  salesList: { display: "flex", flexDirection: "column", gap: 8 },
  saleRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "var(--surface)",
    border: "1px solid var(--line)",
    borderRadius: 12,
    padding: "12px 14px",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.55)",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    zIndex: 50,
  },
  modal: {
    background: "var(--surface)",
    borderRadius: "16px 16px 0 0",
    padding: 20,
    width: "100%",
    maxWidth: 440,
    maxHeight: "85vh",
    overflowY: "auto",
    border: "1px solid var(--line)",
    borderBottom: "none",
  },
  modalHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  label: { display: "block", fontSize: 12.5, color: "var(--muted)", margin: "12px 0 6px" },
  input: {
    width: "100%",
    background: "var(--surface2)",
    border: "1px solid var(--line)",
    borderRadius: 9,
    padding: "10px 12px",
    color: "var(--text)",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
  },
  primaryBtn: {
    width: "100%",
    marginTop: 18,
    background: "var(--signal)",
    color: "#08211c",
    border: "none",
    borderRadius: 10,
    padding: "12px 0",
    fontWeight: 800,
    fontSize: 14.5,
    cursor: "pointer",
  },
  marginPreview: { marginTop: 14, fontSize: 13.5, color: "var(--muted)" },
  errToast: {
    position: "fixed",
    bottom: 16,
    left: "50%",
    transform: "translateX(-50%)",
    background: "var(--danger)",
    color: "#fff",
    padding: "8px 16px",
    borderRadius: 8,
    fontSize: 13,
  },
};

const css = `
  :root {
    --bg: #12151A;
    --surface: #191D24;
    --surface2: #20252D;
    --line: #2A303A;
    --text: #ECEEF1;
    --muted: #8B93A0;
    --signal: #4FD1C5;
    --danger: #E8615A;
  }
  * { box-sizing: border-box; }
  input:focus { border-color: var(--signal) !important; }
  button:disabled { opacity: 0.5; cursor: not-allowed; }
`;
