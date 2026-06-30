import Logo from "./Logo";

const navItems = [
  { label: "NEW", href: "#new" },
  { label: "BEST", href: "#best" },
  { label: "OUTER", href: "#cat" },
  { label: "TOP", href: "#cat" },
  { label: "BOTTOM", href: "#cat" },
  { label: "SET", href: "#cat" },
  { label: "LOOKBOOK", href: "#lookbook" },
];

export default function Header() {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "rgba(11,11,11,0.86)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        borderBottom: "1px solid rgba(255,255,255,0.12)",
      }}
    >
      <div
        style={{
          maxWidth: 1360,
          margin: "0 auto",
          padding: "0 32px",
          height: 68,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 24,
        }}
      >
        <a href="#top" style={{ display: "flex", alignItems: "center" }}>
          <Logo color="#fff" height={24} />
        </a>
        <nav
          className="kuk-nav-main"
          style={{ display: "flex", gap: 30, alignItems: "center" }}
        >
          {navItems.map((item, i) => (
            <a
              key={`${item.label}-${i}`}
              href={item.href}
              style={{
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
                letterSpacing: "0.02em",
              }}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div
          style={{
            display: "flex",
            gap: 20,
            alignItems: "center",
            color: "#fff",
          }}
        >
          <span
            style={{ fontSize: 13, fontWeight: 500, opacity: 0.85, cursor: "pointer" }}
          >
            검색
          </span>
          <span
            style={{ fontSize: 13, fontWeight: 500, opacity: 0.85, cursor: "pointer" }}
          >
            로그인
          </span>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              border: "1px solid rgba(255,255,255,0.4)",
              padding: "6px 12px",
              cursor: "pointer",
            }}
          >
            CART (0)
          </span>
        </div>
      </div>
    </header>
  );
}
