export function Header() {
  return (
    <header>
      <div className="wrap bar">
        <a href="#inicio" className="logo">
          <span aria-hidden="true"></span>Buen Día
        </a>
        <nav aria-label="Secciones">
          <ul>
            <li><a href="#desayunos">Desayunos</a></li>
            <li><a href="#tortas">Tortas</a></li>
            <li><a href="#dulces">Dulces</a></li>
          </ul>
        </nav>
        <button className="cart-btn" aria-haspopup="dialog">
          Carrito <span className="count" aria-live="polite">0</span>
          <span className="sr-only">productos</span>
        </button>
      </div>
    </header>
  );
}
